import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import WebSocket from 'ws';
import { createGameServer } from '../server/game-server';
import { defaultSettings, type ClientCommand, type DictionaryData, type RoomView, type ServerMessage, type Settings } from '../shared/types';

type Reply = Extract<ServerMessage, {type: 'reply'}>;

class Client {
  messages: ServerMessage[] = [];
  playerId = '';
  token = '';
  room: RoomView | null = null;
  private sequence = 0;

  constructor(readonly socket: WebSocket) {
    socket.on('message', data => {
      const message: ServerMessage = JSON.parse(data.toString());
      this.messages.push(message);
      if (message.type === 'session') {
        this.playerId = message.playerId;
        this.token = message.token;
      }
      if (message.type === 'state') this.room = message.room;
    });
  }

  static async connect(address: string, nickname: string, token?: string) {
    const client = new Client(new WebSocket(address));
    await once(client.socket, 'open');
    assert.equal((await client.request({type: 'hello', data: {nickname, token}})).ok, true);
    return client;
  }

  async wait(predicate: (message: ServerMessage) => boolean, from = 0, timeout = 5000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const message = this.messages.slice(from).find(predicate);
      if (message) return message;
      await delay(10);
    }
    assert.fail(`消息等待超时：${JSON.stringify(this.messages.slice(from))}`);
  }

  async request(command: ClientCommand): Promise<Reply> {
    const id = String(++this.sequence);
    const start = this.messages.length;
    this.socket.send(JSON.stringify({...command, id}));
    return await this.wait(message => message.type === 'reply' && message.id === id, start, 15000) as Reply;
  }

  async close() {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    const closed = once(this.socket, 'close');
    this.socket.close();
    await closed;
  }
}

test('易误写草稿同步正确词形，提交拒绝并减少一秒', async t => {
  const server = await createGameServer({port: 0, host: '127.0.0.1'});
  t.after(() => server.close());
  const host = await Client.connect(server.address, '词语提醒');
  const guest = await Client.connect(server.address, '同步提醒');
  t.after(() => host.close());
  t.after(() => guest.close());
  await host.request({type: 'create', data: {name: '词形核查', password: '', settings: defaultSettings}});
  await guest.request({type: 'join', data: {roomId: host.room!.id, password: ''}});
  await host.request({type: 'ready', data: {ready: true}});
  await guest.request({type: 'ready', data: {ready: true}});
  await host.request({type: 'start', data: {}});
  const question = host.room!.prompt!;
  const deadline = host.room!.deadline!;
  const player = host.room!.currentPlayerId === host.playerId ? host : guest;
  const observer = player === host ? guest : host;
  const start = observer.messages.length;
  const draft = await player.request({type: 'draft', data: {word: '不可置否', promptId: question.id}});
  assert.equal(draft.ok, true);
  await observer.wait(message => message.type === 'state' && message.room?.draftMatch?.reason === '这个词应写作「不置可否」', start);
  const result = await player.request({type: 'submit', data: {word: '不可置否', promptId: question.id}});
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, '这个词应写作「不置可否」');
  assert.equal(player.room!.deadline, deadline - 1000);
  assert.equal(player.room!.prompt!.id, question.id);
  assert.equal(player.room!.history.length, 0);
});

test('大厅提供创建顺序、密码、房主转移和空房删除', async t => {
  const server = await createGameServer({port: 0, host: '127.0.0.1'});
  t.after(() => server.close());
  const first = await Client.connect(server.address, '甲玩家');
  const second = await Client.connect(server.address, '乙玩家');
  t.after(() => first.close());
  t.after(() => second.close());
  assert.equal((await first.request({type: 'create', data: {name: '先创建', password: '1234', settings: defaultSettings}})).ok, true);
  const firstRoom = first.room!.id;
  await delay(2);
  assert.equal((await second.request({type: 'create', data: {name: '后创建', password: '', settings: defaultSettings}})).ok, true);
  const lobby = await first.wait(message => message.type === 'lobby' && message.rooms.length === 2);
  assert.equal(lobby.type, 'lobby');
  if (lobby.type !== 'lobby') return;
  assert.deepEqual(lobby.rooms.map(room => room.name), ['后创建', '先创建']);
  assert.notEqual(lobby.rooms[0].roomPinyin, lobby.rooms[1].roomPinyin);
  assert.equal(lobby.rooms[1].protected, true);
  await second.request({type: 'leave', data: {}});
  const rejected = await second.request({type: 'join', data: {roomId: firstRoom, password: 'wrong'}});
  assert.equal(rejected.ok, false);
  assert.equal((await second.request({type: 'join', data: {roomId: firstRoom, password: '1234'}})).ok, true);
  assert.equal((await first.request({type: 'transfer', data: {playerId: second.playerId}})).ok, true);
  await first.wait(message => message.type === 'state' && message.room?.hostId === second.playerId);
  assert.equal((await first.request({type: 'kick', data: {playerId: second.playerId}})).ok, false);
  assert.equal((await second.request({type: 'kick', data: {playerId: first.playerId}})).ok, true);
  await first.wait(message => message.type === 'state' && message.room === null);
  const start = second.messages.length;
  await second.request({type: 'leave', data: {}});
  await second.wait(message => message.type === 'lobby' && message.rooms.length === 0, start);
});

test('拼音分享链接加入隐藏房间并支持房主修改元数据', async t => {
  const server = await createGameServer({port: 0, host: '127.0.0.1'});
  t.after(() => server.close());
  const host = await Client.connect(server.address, '分享房主');
  const guest = await Client.connect(server.address, '分享玩家');
  t.after(() => host.close());
  t.after(() => guest.close());
  await host.request({type: 'create', data: {name: '', password: '', listed: true, settings: defaultSettings}});
  const pinyin = host.room!.roomPinyin;
  assert.equal((await host.request({type: 'metadata', data: {name: '隐藏房间', listed: false, password: '分享密码'}})).ok, true);
  assert.equal(host.room!.name, '隐藏房间');
  assert.equal(host.room!.listed, false);
  assert.equal((await guest.request({type: 'joinByCode', data: {code: pinyin, password: '错误密码'}})).ok, false);
  assert.equal((await guest.request({type: 'joinByCode', data: {code: pinyin.replaceAll('-', ''), password: '分享密码'}})).ok, true);
  assert.equal(guest.room!.id, host.room!.id);
  const lobby = guest.messages.filter(message => message.type === 'lobby').at(-1);
  if (lobby?.type === 'lobby') assert.equal(lobby.rooms.some(room => room.id === host.room!.id), false);
});

test('不活跃房间隐藏，聊天恢复展示，心跳保持隐藏', async t => {
  const server = await createGameServer({port: 0, host: '127.0.0.1', idleMs: 120});
  t.after(() => server.close());
  const player = await Client.connect(server.address, '房间玩家');
  t.after(() => player.close());
  await player.request({type: 'create', data: {name: '保留房间', password: '', settings: defaultSettings}});
  const start = player.messages.length;
  await player.wait(message => message.type === 'lobby' && message.rooms.length === 0, start);
  assert.equal(player.room?.name, '保留房间');
  await player.request({type: 'ping', data: {}});
  await delay(30);
  assert.equal(player.messages.filter(message => message.type === 'lobby').at(-1)?.type, 'lobby');
  const afterPing = player.messages.filter(message => message.type === 'lobby').at(-1);
  if (afterPing?.type === 'lobby') assert.equal(afterPing.rooms.length, 0);
  const chatStart = player.messages.length;
  await player.request({type: 'chat', data: {text: '开始聊天'}});
  await player.wait(message => message.type === 'lobby' && message.rooms.length === 1, chatStart);
  assert.equal(player.room!.chat[0].text, '开始聊天');
});

test('断线恢复相同身份与房间，保留期限结束自动离开', async t => {
  const server = await createGameServer({port: 0, host: '127.0.0.1', reconnectMs: 220});
  t.after(() => server.close());
  const host = await Client.connect(server.address, '房主玩家');
  const visitor = await Client.connect(server.address, '重连玩家');
  t.after(() => host.close());
  await host.request({type: 'create', data: {name: '重连测试', password: '', settings: defaultSettings}});
  await visitor.request({type: 'join', data: {roomId: host.room!.id, password: ''}});
  const playerId = visitor.playerId;
  const start = host.messages.length;
  await visitor.close();
  await host.wait(message => message.type === 'state' && message.room?.players.some(player => player.id === playerId && !player.online) === true, start);
  const restored = await Client.connect(server.address, '重连玩家', visitor.token);
  assert.equal(restored.playerId, playerId);
  assert.equal(restored.room!.id, host.room!.id);
  assert.equal(restored.room!.players.find(player => player.id === playerId)?.online, true);
  const expireStart = host.messages.length;
  await restored.close();
  await host.wait(message => message.type === 'state' && message.room?.players.length === 1, expireStart);
  assert.equal(host.room!.players[0].id, host.playerId);
});

test('错误 JSON 和无效输入通过协议返回明确结果', async t => {
  const server = await createGameServer({port: 0, host: '127.0.0.1'});
  t.after(() => server.close());
  const client = await Client.connect(server.address, '输入玩家');
  t.after(() => client.close());
  client.socket.send(JSON.stringify({id: 'invalid', type: 'create', data: {name: 'a'.repeat(41), password: '', settings: defaultSettings}}));
  const invalid = await client.wait(message => message.type === 'reply' && message.id === 'invalid');
  assert.equal(invalid.type, 'reply');
  if (invalid.type === 'reply') assert.equal(invalid.ok, false);
  const closed = once(client.socket, 'close');
  client.socket.send('{invalid json');
  const [code] = await closed;
  assert.equal(code, 1007);
  assert.equal((await fetch(server.address.replace('ws:', 'http:') + '/health')).status, 200);
});

test('Origin 允许列表允许 GitHub Pages 和 Tailscale 页面并拒绝其他网页', async t => {
  const server = await createGameServer({port: 0, host: '127.0.0.1', allowedOrigins: ['https://crisply2404.github.io', 'http://100.97.0.41:5173']});
  t.after(() => server.close());
  const allowed = new WebSocket(server.address, {origin: 'https://crisply2404.github.io'});
  await once(allowed, 'open');
  const closed = once(allowed, 'close');
  allowed.close();
  await closed;
  const tailscale = new WebSocket(server.address, {origin: 'http://100.97.0.41:5173'});
  await once(tailscale, 'open');
  const tailscaleClosed = once(tailscale, 'close');
  tailscale.close();
  await tailscaleClosed;
  const rejected = new WebSocket(server.address, {origin: 'https://unrelated.example'});
  const [error] = await once(rejected, 'error');
  assert.match(error.message, /403/);
});

test('身份在新的连接恢复后，旧连接不能继续操作房间', async t => {
  const server = await createGameServer({port: 0, host: '127.0.0.1'});
  t.after(() => server.close());
  const original = await Client.connect(server.address, '身份玩家');
  await original.request({type: 'create', data: {name: '身份测试', password: '', settings: defaultSettings}});
  const disconnected = once(original.socket, 'close');
  const restored = await Client.connect(server.address, '身份玩家', original.token);
  t.after(() => restored.close());
  await disconnected;
  assert.equal(restored.playerId, original.playerId);
  assert.equal(restored.room?.players.length, 1);
  assert.equal(restored.room?.players[0].online, true);
  assert.equal((await restored.request({type: 'chat', data: {text: '新的连接'}})).ok, true);
});

test('服务器验证真实词语、独立回合计时、规则锁定、声母奖励与观战状态', async t => {
  const {WordRules} = await import('../shared/rules');
  const dictionary: DictionaryData = JSON.parse(await readFile(new URL('../data/dictionary.json', import.meta.url), 'utf8'));
  const rules = new WordRules(dictionary);
  const settings: Settings = {
    ...structuredClone(defaultSettings), dictionary: 'all', minLength: 2, maxLength: 9,
    promptLength: 1, minAnswers: 1, initialSeconds: 15,
    appearance: {initial: 'off', final: 'off', tone: 'required', radical: 'off', component: 'off', contains: 'off'},
    bonusInitials: ['b'],
  };
  const server = await createGameServer({port: 0, host: '127.0.0.1'});
  t.after(() => server.close());
  const host = await Client.connect(server.address, '甲选手');
  const guest = await Client.connect(server.address, '乙选手');
  const spectator = await Client.connect(server.address, '观战玩家');
  t.after(() => host.close());
  t.after(() => guest.close());
  t.after(() => spectator.close());
  await host.request({type: 'create', data: {name: '真实比赛', password: '', settings}});
  await guest.request({type: 'join', data: {roomId: host.room!.id, password: ''}});
  assert.equal((await host.request({type: 'start', data: {}})).ok, false);
  await host.request({type: 'ready', data: {ready: true}});
  await guest.request({type: 'ready', data: {ready: true}});
  assert.equal((await host.request({type: 'start', data: {}})).ok, true);
  const prompt = host.room!.prompt!;
  const deadline = host.room!.deadline!;
  const lives = host.room!.players.find(player => player.id === host.playerId)!.lives;
  assert.equal((await host.request({type: 'settings', data: {settings}})).ok, false);
  assert.equal((await host.request({type: 'submit', data: {word: '生生不息', promptId: 'expired'}})).ok, false);
  const invalid = await host.request({type: 'submit', data: {word: '这段内容没有收录为有效词语', promptId: prompt.id}});
  assert.equal(invalid.ok, false);
  assert.equal(host.room!.currentPlayerId, host.playerId);
  assert.ok(host.room!.deadline! <= deadline - 1000);
  const answer = dictionary.words.find(entry => {
    const match = rules.match(entry.word, prompt, settings);
    return match.valid && match.reading?.initials.includes('b');
  });
  assert.ok(answer, '真实词库含有符合提示和奖励声母的答案');
  assert.equal((await host.request({type: 'submit', data: {word: answer.word, promptId: prompt.id}})).ok, true);
  assert.equal(host.room!.currentPlayerId, guest.playerId);
  assert.ok(host.room!.deadline! > deadline);
  assert.ok(host.room!.deadline! - host.room!.serverTime >= 14_900);
  assert.equal(host.room!.history[0].word, answer.word);
  assert.equal(host.room!.players.find(player => player.id === host.playerId)!.lives, lives + 1);
  assert.deepEqual(host.room!.players.find(player => player.id === host.playerId)!.collected, []);
  assert.equal((await host.request({type: 'submit', data: {word: answer.word, promptId: host.room!.prompt!.id}})).ok, false);
  assert.equal((await guest.request({type: 'submit', data: {word: answer.word, promptId: host.room!.prompt!.id}})).ok, false);
  await spectator.request({type: 'join', data: {roomId: host.room!.id, password: ''}});
  assert.equal(spectator.room!.players.find(player => player.id === spectator.playerId)!.role, 'spectator');
  assert.equal((await spectator.request({type: 'ready', data: {ready: true}})).ok, false);
  const spectatorStart = spectator.messages.length;
  await guest.request({type: 'leave', data: {}});
  await spectator.wait(message => message.type === 'state' && message.room?.phase === 'between', spectatorStart);
  assert.equal((await spectator.request({type: 'ready', data: {ready: true}})).ok, true);
  assert.equal(spectator.room!.players.find(player => player.id === spectator.playerId)!.role, 'player');
});

test('题目超时依次顺延，全部参赛玩家未答出后更换', async t => {
  const server = await createGameServer({ port: 0, host: '127.0.0.1' });
  t.after(() => server.close());
  const players = await Promise.all(['甲', '乙', '丙'].map(name => Client.connect(server.address, name)));
  for (const player of players) t.after(() => player.close());
  const host = players[0];
  const settings = { ...structuredClone(defaultSettings), initialSeconds: 1, startingLives: 4, maxLives: 4 };
  await host.request({ type: 'create', data: { name: '顺延题目', password: '', settings } });
  for (const player of players.slice(1)) await player.request({ type: 'join', data: { roomId: host.room!.id, password: '' } });
  for (const player of players) await player.request({ type: 'ready', data: { ready: true } });
  await host.request({ type: 'start', data: {} });
  const prompt = host.room!.prompt!;
  const start = host.messages.length;
  await host.wait(message => message.type === 'state' && message.room?.currentPlayerId === players[1].playerId, start);
  assert.deepEqual(host.room!.prompt, prompt);
  await host.wait(message => message.type === 'state' && message.room?.currentPlayerId === players[2].playerId, start);
  assert.deepEqual(host.room!.prompt, prompt);
  await host.wait(message => message.type === 'state' && message.room?.currentPlayerId === host.playerId, start);
  assert.notEqual(host.room!.prompt!.id, prompt.id);
});

test('倒计时结束时自动接受已经输入的合法答案并广播匹配', async t => {
  const { WordRules } = await import('../shared/rules');
  const dictionary: DictionaryData = JSON.parse(await readFile(new URL('../data/dictionary.json', import.meta.url), 'utf8'));
  const rules = new WordRules(dictionary);
  const server = await createGameServer({ port: 0, host: '127.0.0.1' });
  t.after(() => server.close());
  const host = await Client.connect(server.address, '甲');
  const guest = await Client.connect(server.address, '乙');
  t.after(() => host.close()); t.after(() => guest.close());
  await host.request({ type: 'create', data: { name: '自动作答', password: '', settings: { ...structuredClone(defaultSettings), initialSeconds: 2 } } });
  await guest.request({ type: 'join', data: { roomId: host.room!.id, password: '' } });
  await host.request({ type: 'ready', data: { ready: true } });
  await guest.request({ type: 'ready', data: { ready: true } });
  await host.request({ type: 'start', data: {} });
  const prompt = host.room!.prompt!;
  const answer = rules.cpuAnswer(prompt, host.room!.settings)!;
  const start = guest.messages.length;
  await host.request({ type: 'draft', data: { word: answer.word, promptId: prompt.id } });
  await guest.wait(message => message.type === 'state' && message.room?.draftMatch?.word === answer.word, start);
  assert.notEqual(guest.room!.draftMatch!.offset, null);
  assert.equal(guest.room!.players[0].color, host.room!.players[0].color);
  assert.notEqual(guest.room!.players[0].color, guest.room!.players[1].color);
  await guest.wait(message => message.type === 'state' && message.room?.history.length === 1, start);
  assert.equal(guest.room!.history[0].word, answer.word);
  assert.equal(guest.room!.players[0].lives, 3);
  assert.equal(guest.room!.acceptedAnswer!.match.word, answer.word);
  const confirmation = await host.request({ type: 'submit', data: { word: answer.word, promptId: prompt.id } });
  assert.equal(confirmation.ok, true);
  assert.equal(host.room!.history.length, 1);
  assert.equal(host.room!.players[0].lives, 3);
});

test('未作答玩家离开后按仍在场的玩家决定换题', async t => {
  const server = await createGameServer({ port: 0, host: '127.0.0.1' });
  t.after(() => server.close());
  const players = await Promise.all(['甲', '乙', '丙'].map(name => Client.connect(server.address, name)));
  for (const player of players) t.after(() => player.close());
  const host = players[0];
  await host.request({ type: 'create', data: { name: '离开题目', password: '', settings: { ...structuredClone(defaultSettings), initialSeconds: 1, startingLives: 4, maxLives: 4 } } });
  for (const player of players.slice(1)) await player.request({ type: 'join', data: { roomId: host.room!.id, password: '' } });
  for (const player of players) await player.request({ type: 'ready', data: { ready: true } });
  await host.request({ type: 'start', data: {} });
  const promptId = host.room!.prompt!.id;
  const start = host.messages.length;
  await host.wait(message => message.type === 'state' && message.room?.currentPlayerId === players[2].playerId, start);
  assert.equal(host.room!.prompt!.id, promptId);
  const change = host.messages.length;
  await players[2].request({ type: 'leave', data: {} });
  await host.wait(message => message.type === 'state' && message.room?.players.length === 2, change);
  assert.notEqual(host.room!.prompt!.id, promptId);
  assert.equal(host.room!.currentPlayerId, host.playerId);
});

test('断线期间回合计时继续，重连恢复扣除后的生命', async t => {
  const settings: Settings = {
    ...structuredClone(defaultSettings), promptLength: 1, minAnswers: 1, initialSeconds: 1,
    startingLives: 2,
    appearance: {initial: 'required', final: 'off', tone: 'off', radical: 'off', component: 'off', contains: 'off'},
  };
  const server = await createGameServer({port: 0, host: '127.0.0.1', reconnectMs: 4000});
  t.after(() => server.close());
  const host = await Client.connect(server.address, '断线选手');
  const guest = await Client.connect(server.address, '在线选手');
  t.after(() => guest.close());
  await host.request({type: 'create', data: {name: '断线计时', password: '', settings}});
  await guest.request({type: 'join', data: {roomId: host.room!.id, password: ''}});
  await host.request({type: 'ready', data: {ready: true}});
  await guest.request({type: 'ready', data: {ready: true}});
  await host.request({type: 'start', data: {}});
  const start = guest.messages.length;
  await host.close();
  await guest.wait(message => message.type === 'state' && message.room?.players.some(player => player.id === host.playerId && player.lives === 1) === true, start);
  const restored = await Client.connect(server.address, '断线选手', host.token);
  t.after(() => restored.close());
  assert.equal(restored.room!.players.find(player => player.id === host.playerId)!.lives, 1);
  assert.equal(restored.room!.currentPlayerId, guest.playerId);
});

test('不可能的提示设置返回业务信息并保留准备状态', async t => {
  const settings: Settings = {
    ...structuredClone(defaultSettings), promptLength: 1, minAnswers: 1,
    appearance: {initial: 'required', final: 'required', tone: 'off', radical: 'off', component: 'off', contains: 'off'},
    relations: [{first: 'initial', second: 'final', mode: 'different'}],
  };
  const server = await createGameServer({port: 0, host: '127.0.0.1'});
  t.after(() => server.close());
  const host = await Client.connect(server.address, '甲选手');
  const guest = await Client.connect(server.address, '乙选手');
  t.after(() => host.close());
  t.after(() => guest.close());
  await host.request({type: 'create', data: {name: '提示条件', password: '', settings}});
  await guest.request({type: 'join', data: {roomId: host.room!.id, password: ''}});
  const preview = await host.request({type: 'preview', data: {settings}});
  assert.equal(preview.ok, false);
  await host.request({type: 'ready', data: {ready: true}});
  await guest.request({type: 'ready', data: {ready: true}});
  const start = await host.request({type: 'start', data: {}});
  assert.equal(start.ok, false);
  assert.equal(host.room!.phase, 'waiting');
  assert.ok(host.room!.players.every(player => player.ready));
});

test('真实答案全部使用后中止本局，接受最终答案并允许修改规则继续游戏', async t => {
  const {WordRules} = await import('../shared/rules');
  const dictionary: DictionaryData = JSON.parse(await readFile(new URL('../data/dictionary.json', import.meta.url), 'utf8'));
  const rules = new WordRules(dictionary);
  const idioms = dictionary.words.filter(entry => entry.idiom && [...entry.word].length === 2);
  assert.equal(idioms.length, 5);
  const settings: Settings = {
    ...structuredClone(defaultSettings), dictionary: 'idioms', minLength: 2, maxLength: 2, promptLength: 2,
    minAnswers: 1, initialSeconds: 20, bonusInitials: ['b'],
    appearance: {initial: 'off', final: 'off', tone: 'off', radical: 'off', component: 'off', contains: 'required'},
  };
  const server = await createGameServer({port: 0, host: '127.0.0.1'});
  t.after(() => server.close());
  const host = await Client.connect(server.address, '甲选手');
  const guest = await Client.connect(server.address, '乙选手');
  t.after(() => host.close());
  t.after(() => guest.close());
  await host.request({type: 'create', data: {name: '词库耗尽', password: '', settings}});
  await guest.request({type: 'join', data: {roomId: host.room!.id, password: ''}});
  await host.request({type: 'ready', data: {ready: true}});
  await guest.request({type: 'ready', data: {ready: true}});
  await host.request({type: 'start', data: {}});
  const used = new Set<string>();
  const noticeStart = host.messages.length;
  for (let turn = 0; turn < idioms.length; turn++) {
    const room = host.room!;
    const player = room.currentPlayerId === host.playerId ? host : guest;
    const answer = idioms.find(entry => rules.match(entry.word, room.prompt!, settings, used).valid);
    assert.ok(answer, '真实词库提供尚未使用的有效答案');
    used.add(answer.word);
    assert.equal((await player.request({type: 'submit', data: {word: answer.word, promptId: room.prompt!.id}})).ok, true);
    await host.wait(message => message.type === 'state' && message.room?.history.length === turn + 1, noticeStart);
  }
  await host.wait(message => message.type === 'notice' && message.text.includes('重新准备'), noticeStart);
  assert.equal(host.room!.phase, 'between');
  assert.equal(host.room!.round, 0);
  assert.equal(host.room!.deadline, null);
  assert.equal(host.room!.prompt, null);
  assert.equal(host.room!.currentPlayerId, null);
  assert.equal(host.room!.lastWinnerId, null);
  assert.equal(host.room!.history.length, 5);
  assert.ok(host.room!.players.every(player => !player.ready && player.wins === 0 && player.collected.length === 0 && player.draft === ''));
  const revised = {...settings, minLength: 4, maxLength: 8};
  assert.equal((await host.request({type: 'settings', data: {settings: revised}})).ok, true);
  await host.request({type: 'ready', data: {ready: true}});
  await guest.request({type: 'ready', data: {ready: true}});
  assert.equal((await host.request({type: 'start', data: {}})).ok, true);
  assert.equal(host.room!.phase, 'playing');
  assert.equal(host.room!.round, 1);
  const answer = rules.examples(host.room!.prompt!, revised)[0];
  assert.ok(answer);
  assert.equal((await host.request({type: 'submit', data: {word: answer.word, promptId: host.room!.prompt!.id}})).ok, true);
});

test('真实计时扣除生命，双人多数局结算并允许下一场比赛', async t => {
  const {WordRules} = await import('../shared/rules');
  const rules = new WordRules(JSON.parse(await readFile('data/dictionary.json', 'utf8')) as DictionaryData);
  const settings: Settings = {
    ...structuredClone(defaultSettings), promptLength: 1, minAnswers: 1, initialSeconds: 1,
    startingLives: 1, bestOf: 3,
    appearance: {initial: 'required', final: 'off', tone: 'off', radical: 'off', component: 'off', contains: 'off'},
  };
  const server = await createGameServer({port: 0, host: '127.0.0.1'});
  t.after(() => server.close());
  const host = await Client.connect(server.address, '甲选手');
  const guest = await Client.connect(server.address, '乙选手');
  t.after(() => host.close());
  t.after(() => guest.close());
  await host.request({type: 'create', data: {name: '计时比赛', password: '', settings}});
  await guest.request({type: 'join', data: {roomId: host.room!.id, password: ''}});
  for (let round = 1; round <= 3; round++) {
    await host.request({type: 'ready', data: {ready: true}});
    await guest.request({type: 'ready', data: {ready: true}});
    const start = host.messages.length;
    assert.equal((await host.request({type: 'start', data: {}})).ok, true);
    const expectedWinner = round % 2 === 1 ? guest.playerId : host.playerId;
    await host.wait(message => message.type === 'state' && message.room?.currentPlayerId === expectedWinner, start);
    const winner = expectedWinner === host.playerId ? host : guest;
    const answer = rules.cpuAnswer(host.room!.prompt!, settings, new Set(host.room!.history.map(item => item.word)))!;
    await winner.request({type: 'submit', data: {word: answer.word, promptId: host.room!.prompt!.id}});
    await host.wait(message => message.type === 'state' && message.room?.round === round && message.room.phase !== 'playing', start);
    assert.equal(host.room!.lastWinnerId, expectedWinner);
    assert.equal(host.room!.players.find(player => player.id !== expectedWinner)!.lives, 0);
    assert.equal(host.room!.phase, round === 3 ? 'finished' : 'between');
  }
  assert.deepEqual(host.room!.winnerIds, [guest.playerId]);
  await host.request({type: 'ready', data: {ready: true}});
  await guest.request({type: 'ready', data: {ready: true}});
  assert.equal((await host.request({type: 'start', data: {}})).ok, true);
  assert.equal(host.room!.round, 1);
  assert.ok(host.room!.players.every(player => player.wins === 0));
});

test('最后一名玩家继续同题，双方耗尽生命判定平局', async t => {
  const settings = {...structuredClone(defaultSettings), initialSeconds: 1, startingLives: 1, maxLives: 1, bestOf: 3};
  const server = await createGameServer({port: 0, host: '127.0.0.1'});
  t.after(() => server.close());
  const host = await Client.connect(server.address, '甲'); const guest = await Client.connect(server.address, '乙');
  t.after(() => host.close()); t.after(() => guest.close());
  await host.request({type: 'create', data: {name: '最后同题', password: '', settings}});
  await guest.request({type: 'join', data: {roomId: host.room!.id, password: ''}});
  await host.request({type: 'ready', data: {ready: true}}); await guest.request({type: 'ready', data: {ready: true}});
  await host.request({type: 'start', data: {}});
  const prompt = host.room!.prompt!; const start = host.messages.length;
  await host.wait(message => message.type === 'state' && message.room?.players.find(player => player.id === host.playerId)?.lives === 0, start);
  assert.equal(host.room!.phase, 'playing');
  assert.deepEqual(host.room!.prompt, prompt);
  assert.equal(host.room!.currentPlayerId, guest.playerId);
  await host.wait(message => message.type === 'state' && message.room?.phase === 'between', start);
  assert.equal(host.room!.lastWinnerId, null);
  assert.ok(host.room!.players.every(player => player.lives === 0 && player.wins === 0));
  assert.equal(host.room!.round, 1);
});

test('多人比赛并列加赛限定领先者，并允许完成后重新比赛', async t => {
  const {WordRules} = await import('../shared/rules');
  const rules = new WordRules(JSON.parse(await readFile('data/dictionary.json', 'utf8')) as DictionaryData);
  const settings: Settings = {
    ...structuredClone(defaultSettings), promptLength: 1, minAnswers: 1, initialSeconds: 1,
    startingLives: 1, bestOf: 3,
    appearance: {initial: 'required', final: 'off', tone: 'off', radical: 'off', component: 'off', contains: 'off'},
  };
  const server = await createGameServer({port: 0, host: '127.0.0.1'});
  t.after(() => server.close());
  const players = await Promise.all(['甲选手', '乙选手', '丙选手'].map(name => Client.connect(server.address, name)));
  for (const player of players) t.after(() => player.close());
  await players[0].request({type: 'create', data: {name: '多人计时', password: '', settings}});
  const roomId = players[0].room!.id;
  for (const player of players.slice(1)) await player.request({type: 'join', data: {roomId, password: ''}});
  for (let round = 1; round <= 4; round++) {
    for (const player of players) assert.equal((await player.request({type: 'ready', data: {ready: true}})).ok, true);
    const start = players[0].messages.length;
    assert.equal((await players[0].request({type: 'start', data: {}})).ok, true);
    const winner = players[(round + 1) % players.length];
    await players[0].wait(message => message.type === 'state' && message.room?.currentPlayerId === winner.playerId && message.room.players.filter(player => player.lives > 0).length === 1, start, 5000);
    const answer = rules.cpuAnswer(players[0].room!.prompt!, settings, new Set(players[0].room!.history.map(item => item.word)))!;
    await winner.request({type: 'submit', data: {word: answer.word, promptId: players[0].room!.prompt!.id}});
    await players[0].wait(message => message.type === 'state' && message.room?.round === round && message.room.phase !== 'playing', start, 5000);
    if (round === 3) {
      assert.equal(players[0].room!.phase, 'between');
      assert.equal(players[0].room!.suddenDeath, true);
      assert.ok(players[0].room!.players.every(player => player.wins === 1));
      const visitor = await Client.connect(server.address, '加赛观战');
      t.after(() => visitor.close());
      await visitor.request({type: 'join', data: {roomId, password: ''}});
      assert.equal((await visitor.request({type: 'ready', data: {ready: true}})).ok, false);
    }
  }
  assert.equal(players[0].room!.phase, 'finished');
  assert.deepEqual(players[0].room!.winnerIds, [players[2].playerId]);
  for (const player of players) await player.request({type: 'ready', data: {ready: true}});
  assert.equal((await players[0].request({type: 'start', data: {}})).ok, true);
  assert.equal(players[0].room!.suddenDeath, false);
});

test('多人最后规定局平局后，累计胜局并列者继续加赛', async t => {
  const {WordRules} = await import('../shared/rules');
  const rules = new WordRules(JSON.parse(await readFile('data/dictionary.json', 'utf8')) as DictionaryData);
  const settings = {...structuredClone(defaultSettings), initialSeconds: 1, startingLives: 1, maxLives: 1, bestOf: 3};
  const server = await createGameServer({port: 0, host: '127.0.0.1'});
  t.after(() => server.close());
  const players = await Promise.all(['甲', '乙', '丙'].map(name => Client.connect(server.address, name)));
  for (const player of players) t.after(() => player.close());
  const host = players[0];
  await host.request({type: 'create', data: {name: '末局平局', password: '', settings}});
  for (const player of players.slice(1)) await player.request({type: 'join', data: {roomId: host.room!.id, password: ''}});
  for (let round = 1; round <= 3; round++) {
    for (const player of players) await player.request({type: 'ready', data: {ready: true}});
    const start = host.messages.length;
    await host.request({type: 'start', data: {}});
    if (round < 3) {
      const winner = players[round === 1 ? 2 : 0];
      await host.wait(message => message.type === 'state' && message.room?.currentPlayerId === winner.playerId && message.room.players.filter(player => player.lives > 0).length === 1, start);
      const answer = rules.examples(host.room!.prompt!, settings, new Set(), 1)[0];
      assert.ok(answer);
      const submitted = await winner.request({type: 'submit', data: {word: answer.word, promptId: host.room!.prompt!.id}});
      assert.equal(submitted.ok, true, JSON.stringify(submitted));
    }
    await host.wait(message => message.type === 'state' && message.room?.phase === 'between', start);
  }
  assert.equal(host.room!.lastWinnerId, null);
  assert.deepEqual(host.room!.players.map(player => player.wins), [1, 0, 1]);
  assert.equal(host.room!.suddenDeath, true);
  assert.equal((await players[1].request({type: 'ready', data: {ready: true}})).ok, false);
  for (const player of [players[0], players[2]]) assert.equal((await player.request({type: 'ready', data: {ready: true}})).ok, true);
  assert.equal((await host.request({type: 'start', data: {}})).ok, true);
  assert.equal(host.room!.players.find(player => player.id === players[1].playerId)!.role, 'spectator');
});

test('公开房间编号、隐藏房间加入和房间内电脑回合', async t => {
  const settings: Settings = {
    ...structuredClone(defaultSettings), dictionary: 'all', minLength: 2, maxLength: 9, promptLength: 1,
    minAnswers: 1, initialSeconds: 20, bestOf: 1,
    appearance: {initial: 'required', final: 'off', tone: 'off', radical: 'off', component: 'off', contains: 'off'},
  };
  const dictionary: DictionaryData = JSON.parse(await readFile(new URL('../data/dictionary.json', import.meta.url), 'utf8'));
  const rules = new (await import('../shared/rules')).WordRules(dictionary);
  const server = await createGameServer({port: 0, host: '127.0.0.1'});
  t.after(() => server.close());
  const first = await Client.connect(server.address, '房间编号玩家');
  const second = await Client.connect(server.address, '房间加入玩家');
  const third = await Client.connect(server.address, '拼音加入玩家');
  t.after(() => first.close());
  t.after(() => second.close());
  t.after(() => third.close());
  await first.request({type: 'create', data: {name: '', password: '编号密码', listed: false, settings}});
  assert.match(first.room!.roomKey, /^[\u3400-\u9fff]{4}$/u);
  assert.match(first.room!.roomPinyin, /^[a-zü]+(?:-[a-zü]+){3}$/u);
  assert.equal(first.room!.name, first.room!.roomKey);
  const hiddenLobby = first.messages.filter(message => message.type === 'lobby').at(-1);
  if (hiddenLobby?.type === 'lobby') assert.equal(hiddenLobby.rooms.some(room => room.id === first.room!.id), false);
  assert.equal((await second.request({type: 'joinByCode', data: {code: first.room!.roomKey, password: '编号密码'}})).ok, true);
  await second.request({type: 'leave', data: {}});
  assert.equal((await third.request({type: 'joinByCode', data: {code: first.room!.roomPinyin, password: '编号密码'}})).ok, true);
  assert.equal((await first.request({type: 'visibility', data: {listed: true}})).ok, true);
  assert.equal((await first.request({type: 'rename', data: {name: '改名房间'}})).ok, true);
  assert.equal(first.room!.name, '改名房间');
  assert.equal((await first.request({type: 'addCpu', data: {}})).ok, true);
  assert.equal(first.room!.players.some(player => player.cpu && player.nickname === '电脑'), true);
  await first.request({type: 'ready', data: {ready: true}});
  await third.request({type: 'ready', data: {ready: true}});
  assert.equal((await first.request({type: 'start', data: {}})).ok, true);
  const answer = rules.examples(first.room!.prompt!, settings, new Set(), 1)[0];
  assert.ok(answer);
  const player = first.room!.currentPlayerId === first.playerId ? first : third;
  assert.equal((await player.request({type: 'submit', data: {word: answer.word, promptId: first.room!.prompt!.id}})).ok, true);
  if (first.room!.currentPlayerId === third.playerId) {
    const secondAnswer = rules.examples(first.room!.prompt!, settings, new Set(first.room!.history.map(item => item.word)), 1)[0];
    assert.ok(secondAnswer);
    assert.equal((await third.request({type: 'submit', data: {word: secondAnswer.word, promptId: first.room!.prompt!.id}})).ok, true);
  }
  const cpu = first.room!.players.find(item => item.cpu)!;
  const cpuStart = first.messages.length;
  await first.wait(message => message.type === 'state' && Boolean(message.room?.players.find(item => item.id === cpu.id)?.draft), cpuStart);
  const partial = first.room!.players.find(item => item.id === cpu.id)!.draft;
  assert.equal([...partial].length, 1);
  await first.wait(message => message.type === 'state' && (message.room?.history.length ?? 0) >= 3, first.messages.length, 5000);
  const drafts = first.messages.slice(cpuStart).flatMap(message => message.type === 'state' ? [message.room?.players.find(item => item.id === cpu.id)?.draft ?? ''] : []).filter(Boolean);
  assert.ok(new Set(drafts).size >= 2);
  assert.equal(first.room!.history.some(item => item.nickname === '电脑'), true);
  await first.request({type: 'leave', data: {}});
  await third.request({type: 'leave', data: {}});
  assert.equal(second.room, null);
});
