import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { defaultSettings, type ClientCommand, type DictionaryData, type RoomView, type ServerMessage } from '../shared/types';
import { WordRules } from '../shared/rules';

function createWorker(bindings: Record<string, string> = {}, persistPath = `.scratch/cloudflare/test-storage-${randomUUID()}`) {
  return new Miniflare(convertV4MiniflareOptions({
    modules: [{type: 'ESModule', path: '.scratch/cloudflare/bundle/worker.js'}, {type: 'Data', path: '.scratch/cloudflare/bundle/dictionary.gz'}],
    name: 'chuan-zi-online', compatibilityDate: '2026-10-06', compatibilityFlags: ['nodejs_compat'],
    inspectorPort: 0,
    durableObjects: { GAME_HUB: { className: 'GameHub', useSQLite: true } },
    bindings: { ALLOWED_ORIGINS: 'https://crisply2404.github.io', ...bindings },
    resourcePersistencePath: persistPath,
    resourceTmpPath: '.scratch/cloudflare/test-runtime',
  }));
}

type Reply = Extract<ServerMessage, {type: 'reply'}>;
class Client {
  messages: ServerMessage[] = [];
  playerId = '';
  token = '';
  room: RoomView | null = null;
  constructor(readonly socket: NonNullable<Awaited<ReturnType<Miniflare['dispatchFetch']>>['webSocket']>) {
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data)) as ServerMessage;
      this.messages.push(message);
      if (message.type === 'session') { this.playerId = message.playerId; this.token = message.token; }
      if (message.type === 'state') this.room = message.room;
    });
    socket.accept();
  }
  static async connect(worker: Miniflare, nickname: string, token?: string) {
    const response = await worker.dispatchFetch('https://game.example/ws', {headers: {Upgrade: 'websocket', Origin: 'https://crisply2404.github.io'}});
    assert.equal(response.status, 101);
    assert.ok(response.webSocket);
    const client = new Client(response.webSocket);
    assert.equal((await client.request({type: 'hello', data: {nickname, token}})).ok, true);
    return client;
  }
  async wait(predicate: (message: ServerMessage) => boolean, from = 0, timeout = 12000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const message = this.messages.slice(from).find(predicate);
      if (message) return message;
      await delay(10);
    }
    assert.fail(`消息等待超时：${JSON.stringify(this.messages.slice(from))}`);
  }
  async request(command: ClientCommand): Promise<Reply> {
    const id = randomUUID();
    const start = this.messages.length;
    this.socket.send(JSON.stringify({...command, id}));
    return await this.wait(message => message.type === 'reply' && message.id === id, start) as Reply;
  }
  close() { if (this.socket.readyState === 1) this.socket.close(1000); }
}

test('Cloudflare 公开入口提供健康检查并限制 WebSocket 来源', async t => {
  const worker = createWorker();
  t.after(() => worker.dispose());
  const health = await worker.dispatchFetch('https://game.example/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json() as {ok: boolean}).ok, true);
  const rejected = await worker.dispatchFetch('https://game.example/ws', {headers: {Upgrade: 'websocket', Origin: 'https://wrong.example'}});
  assert.equal(rejected.status, 403);
});

test('Cloudflare 大厅、密码与身份在 Hibernation 后继续使用真实协议', async t => {
  const worker = createWorker();
  t.after(() => worker.dispose());
  const first = await Client.connect(worker, '甲玩家');
  const second = await Client.connect(worker, '乙玩家');
  t.after(() => first.close());
  t.after(() => second.close());
  assert.equal((await first.request({type: 'create', data: {name: '持久房间', password: '1234', settings: defaultSettings}})).ok, true);
  const roomId = first.room!.id;
  const pinyin = first.room!.roomPinyin;
  await worker.unsafeEvictDurableObject('chuan-zi-online', 'GameHub', {name: 'chuan-zi', webSockets: 'hibernate'});
  assert.equal((await second.request({type: 'joinByCode', data: {code: pinyin.replaceAll('-', ''), password: 'wrong'}})).ok, false);
  assert.equal((await second.request({type: 'joinByCode', data: {code: pinyin, password: '1234'}})).ok, true);
  assert.equal(second.room!.id, roomId);
  assert.equal(second.room!.players.length, 2);
  assert.equal((await first.request({type: 'chat', data: {text: '连接保留'}})).ok, true);
  await second.wait(message => message.type === 'state' && message.room?.chat.at(-1)?.text === '连接保留');
  const playerId = first.playerId;
  first.close();
  await second.wait(message => message.type === 'state' && message.room?.players.some(player => player.id === playerId && !player.online) === true);
  const recovered = await Client.connect(worker, '甲玩家', first.token);
  t.after(() => recovered.close());
  assert.equal(recovered.playerId, playerId);
  assert.equal(recovered.room!.id, roomId);
  assert.equal(recovered.room!.chat.at(-1)?.text, '连接保留');
});

test('Cloudflare 真实词库、草稿自动提交与 alarm 电脑输入在 Hibernation 后继续', async t => {
  const worker = createWorker();
  t.after(() => worker.dispose());
  const rules = new WordRules(JSON.parse(await readFile('data/dictionary.json', 'utf8')) as DictionaryData);
  const first = await Client.connect(worker, '甲玩家');
  const second = await Client.connect(worker, '乙玩家');
  t.after(() => first.close());
  t.after(() => second.close());
  const settings = {...structuredClone(defaultSettings), initialSeconds: 2};
  assert.equal((await first.request({type: 'create', data: {name: '', password: '', settings}})).ok, true);
  assert.equal((await second.request({type: 'join', data: {roomId: first.room!.id, password: ''}})).ok, true);
  await first.request({type: 'ready', data: {ready: true}});
  await second.request({type: 'ready', data: {ready: true}});
  assert.equal((await first.request({type: 'start', data: {}})).ok, true);
  const prompt = first.room!.prompt!;
  const word = rules.examples(prompt, settings)[0].word;
  const lives = first.room!.players.find(player => player.id === first.playerId)!.lives;
  const start = second.messages.length;
  assert.equal((await first.request({type: 'draft', data: {word, promptId: prompt.id}})).ok, true);
  await second.wait(message => message.type === 'state' && message.room?.draftMatch?.word === word, start);
  await worker.unsafeEvictDurableObject('chuan-zi-online', 'GameHub', {name: 'chuan-zi', webSockets: 'hibernate'});
  await second.wait(message => message.type === 'state' && message.room?.acceptedAnswer?.word === word, start);
  assert.equal(second.room!.players.find(player => player.id === first.playerId)!.lives >= lives, true);
  assert.equal(second.room!.currentPlayerId, second.playerId);
  const automatic = second.room!.acceptedAnswer!;
  assert.equal((await first.request({type: 'submit', data: {word, promptId: prompt.id}})).ok, true);
  assert.equal(second.room!.acceptedAnswer!.id, automatic.id);
  const reconnect = first.token;
  first.close();
  await second.wait(message => message.type === 'state' && message.room?.players.some(player => player.id === first.playerId && !player.online) === true, start);
  await worker.unsafeEvictDurableObject('chuan-zi-online', 'GameHub', {name: 'chuan-zi', webSockets: 'hibernate'});
  const recovered = await Client.connect(worker, '甲玩家', reconnect);
  t.after(() => recovered.close());
  assert.equal(recovered.room!.acceptedAnswer!.id, automatic.id);
});

test('Cloudflare alarm 广播电脑逐字输入与提交', async t => {
  const worker = createWorker();
  t.after(() => worker.dispose());
  const rules = new WordRules(JSON.parse(await readFile('data/dictionary.json', 'utf8')) as DictionaryData);
  const player = await Client.connect(worker, '玩家');
  t.after(() => player.close());
  await player.request({type: 'create', data: {name: '', password: '', settings: defaultSettings}});
  await player.request({type: 'addCpu', data: {}});
  await player.request({type: 'ready', data: {ready: true}});
  await player.request({type: 'start', data: {}});
  const word = rules.examples(player.room!.prompt!, defaultSettings)[0].word;
  await player.request({type: 'submit', data: {word, promptId: player.room!.prompt!.id}});
  const cpu = player.room!.players.find(candidate => candidate.cpu)!;
  const start = player.messages.length;
  await worker.unsafeEvictDurableObject('chuan-zi-online', 'GameHub', {name: 'chuan-zi', webSockets: 'hibernate'});
  await player.wait(message => message.type === 'state' && message.room?.players.some(candidate => candidate.cpu && [...candidate.draft].length === 1) === true, start);
  await worker.unsafeEvictDurableObject('chuan-zi-online', 'GameHub', {name: 'chuan-zi', webSockets: 'hibernate'});
  await player.wait(message => message.type === 'state' && message.room?.acceptedAnswer?.playerId === cpu.id, start);
  const states = player.messages.slice(start).filter((message): message is Extract<ServerMessage, {type: 'state'}> => message.type === 'state');
  const lengths = states.map(message => [...(message.room?.players.find(candidate => candidate.cpu)?.draft ?? '')].length).filter(Boolean);
  assert.ok(lengths.includes(1));
  assert.ok(lengths.includes(2));
  const completed = states.find(message => message.room?.draftMatch?.offset !== null && message.room?.currentPlayerId === cpu.id && message.room?.draftMatch?.word);
  assert.ok(completed?.room?.draftMatch?.reading);
  assert.equal(player.room!.currentPlayerId, player.playerId);
});

test('Cloudflare idle 隐藏、恢复展示与断线身份期限使用持久 alarm', async t => {
  const worker = createWorker({IDLE_MS: '140', RECONNECT_MS: '180'});
  t.after(() => worker.dispose());
  const first = await Client.connect(worker, '甲玩家');
  const second = await Client.connect(worker, '乙玩家');
  t.after(() => first.close());
  t.after(() => second.close());
  await first.request({type: 'create', data: {name: '', password: '', settings: defaultSettings}});
  const roomId = first.room!.id;
  const start = second.messages.length;
  await second.wait(message => message.type === 'lobby' && message.rooms.some(room => room.id === roomId), start - 1);
  await worker.unsafeEvictDurableObject('chuan-zi-online', 'GameHub', {name: 'chuan-zi', webSockets: 'hibernate'});
  await second.wait(message => message.type === 'lobby' && message.rooms.length === 0, start);
  assert.equal(first.room!.id, roomId);
  const resumed = second.messages.length;
  await first.request({type: 'chat', data: {text: '重新展示'}});
  await second.wait(message => message.type === 'lobby' && message.rooms.some(room => room.id === roomId), resumed);
  const token = first.token;
  first.close();
  await delay(300);
  const response = await worker.dispatchFetch('https://game.example/health');
  const health = await response.json() as {rooms: number};
  assert.equal(health.rooms, 0);
  const reconnected = await worker.dispatchFetch('https://game.example/ws', {headers: {Upgrade: 'websocket', Origin: 'https://crisply2404.github.io'}});
  const expired = new Client(reconnected.webSocket!);
  t.after(() => expired.close());
  assert.equal((await expired.request({type: 'hello', data: {nickname: '甲玩家', token}})).ok, false);
});

test('Cloudflare 身份切换连接后在 Hibernation 中仍然只接受当前连接', async t => {
  const worker = createWorker();
  t.after(() => worker.dispose());
  const first = await Client.connect(worker, '玩家');
  t.after(() => first.close());
  await first.request({type: 'create', data: {name: '身份房间', password: '', settings: defaultSettings}});
  const next = await Client.connect(worker, '玩家', first.token);
  t.after(() => next.close());
  await worker.unsafeEvictDurableObject('chuan-zi-online', 'GameHub', {name: 'chuan-zi', webSockets: 'hibernate'});
  assert.equal((await next.request({type: 'rename', data: {name: '当前连接'}})).ok, true);
  assert.equal(next.room!.name, '当前连接');
  assert.equal(next.playerId, first.playerId);
  assert.notEqual(first.socket.readyState, 1);
});

test('Cloudflare runtime 重启后从 SQLite 恢复房间与身份', async t => {
  const storage = `.scratch/cloudflare/test-restart-${randomUUID()}`;
  const worker = createWorker({}, storage);
  const first = await Client.connect(worker, '玩家');
  await first.request({type: 'create', data: {name: '重启房间', password: '', settings: defaultSettings}});
  await first.request({type: 'chat', data: {text: '保存聊天'}});
  const roomId = first.room!.id;
  const playerId = first.playerId;
  const token = first.token;
  await worker.dispose();
  const restarted = createWorker({}, storage);
  t.after(() => restarted.dispose());
  const player = await Client.connect(restarted, '玩家', token);
  t.after(() => player.close());
  assert.equal(player.playerId, playerId);
  assert.equal(player.room!.id, roomId);
  assert.equal(player.room!.name, '重启房间');
  assert.equal(player.room!.chat.at(-1)?.text, '保存聊天');
});

