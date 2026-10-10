import { randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import WebSocket, { WebSocketServer } from 'ws';
import { z } from 'zod';
import { settingsSchema } from '../shared/settings';
import { conditionTypes, type DictionaryData, type LobbyRoom, type PlayerView, type Request, type RoomView, type ServerMessage } from '../shared/types';
import { RuleError, WordRules } from '../shared/rules';
import { normalizePinyin } from '../shared/pinyin';

const sharedRulesCache = new Map<string, Promise<WordRules>>();

const empty = z.object({}).strict();
const nickname = z.string().trim().min(1).max(20);
const identifier = z.string().min(1).max(100);
const password = z.string().max(100);
const commandSchema = z.discriminatedUnion('type', [
  z.object({id: identifier, type: z.literal('hello'), data: z.object({nickname, token: identifier.optional()}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('create'), data: z.object({name: z.string().trim().max(40), password, listed: z.boolean().optional().default(true), settings: settingsSchema}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('join'), data: z.object({roomId: identifier, password}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('joinByCode'), data: z.object({code: z.string().trim().min(1).max(100), password}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('leave'), data: empty}).strict(),
  z.object({id: identifier, type: z.literal('ready'), data: z.object({ready: z.boolean()}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('settings'), data: z.object({settings: settingsSchema}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('rename'), data: z.object({name: z.string().trim().min(1).max(40)}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('visibility'), data: z.object({listed: z.boolean()}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('metadata'), data: z.object({name: z.string().trim().max(40), listed: z.boolean(), password: password.optional()}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('addCpu'), data: empty}).strict(),
  z.object({id: identifier, type: z.literal('removeCpu'), data: empty}).strict(),
  z.object({id: identifier, type: z.literal('start'), data: empty}).strict(),
  z.object({id: identifier, type: z.literal('submit'), data: z.object({word: z.string().trim().min(1).max(30), promptId: identifier}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('draft'), data: z.object({word: z.string().max(30)}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('chat'), data: z.object({text: z.string().trim().min(1).max(300)}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('transfer'), data: z.object({playerId: identifier}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('kick'), data: z.object({playerId: identifier}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('preview'), data: z.object({settings: settingsSchema}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('ping'), data: empty}).strict(),
]);

class BusinessError extends Error {}

interface Session extends PlayerView {
  token: string;
  socket: WebSocket | null;
  roomId: string | null;
  cpu: boolean;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

interface Room extends Omit<RoomView, 'players' | 'protected' | 'serverTime'> {
  players: Session[];
  passwordSalt: Buffer | null;
  passwordHash: Buffer | null;
  lastActivity: number;
  idleTimer?: ReturnType<typeof setTimeout>;
  turnTimer?: ReturnType<typeof setTimeout>;
  cpuTurnTimer?: ReturnType<typeof setTimeout>;
  used: Set<string>;
  playOrder: string[];
  matchPlayerIds: Set<string>;
  contenderIds: Set<string>;
  matchBestOf: number;
  matchDuel: boolean;
  creationOrder: number;
}

export interface GameServerOptions {
  port?: number;
  host?: string;
  dictionaryPath?: string;
  idleMs?: number;
  reconnectMs?: number;
  allowedOrigins?: string[];
}

export async function createGameServer(options: GameServerOptions = {}) {
  const idleMs = options.idleMs ?? 15 * 60 * 1000;
  const reconnectMs = options.reconnectMs ?? 60 * 1000;
  const rooms = new Map<string, Room>();
  const sessions = new Map<string, Session>();
  const socketSessions = new Map<WebSocket, Session>();
  const alive = new WeakMap<WebSocket, boolean>();
  const allowedOrigins = options.allowedOrigins;
  let closing = false;
  let creationOrder = 0;
  let rulesPromise: Promise<WordRules> | undefined;
  let loadedRules: WordRules | undefined;

  function getRules() {
    const dictionaryPath = options.dictionaryPath ?? fileURLToPath(new URL('../data/dictionary.json', import.meta.url));
    rulesPromise ??= sharedRulesCache.get(dictionaryPath) ?? (() => {
      const promise = readFile(dictionaryPath, 'utf8').then(data => new WordRules(JSON.parse(data) as DictionaryData));
      sharedRulesCache.set(dictionaryPath, promise);
      return promise;
    })();
    rulesPromise.then(rules => { loadedRules = rules; });
    return rulesPromise;
  }

  const httpServer = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, {'Content-Type': 'application/json'});
      response.end(JSON.stringify({ok: true, rooms: rooms.size, players: sessions.size}));
      return;
    }
    response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('页面不存在');
  });
  const wss = new WebSocketServer({noServer: true, maxPayload: 16 * 1024});

  httpServer.on('upgrade', (request, socket, head) => {
    const origin = request.headers.origin;
    if (allowedOrigins && (!origin || !allowedOrigins.includes(origin))) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, client => wss.emit('connection', client, request));
  });

  function send(socket: WebSocket | null, message: ServerMessage) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  function snapshot(room: Room): RoomView {
    return {
      id: room.id, roomKey: room.roomKey, roomPinyin: room.roomPinyin, name: room.name, createdAt: room.createdAt, creator: room.creator,
      hostId: room.hostId, protected: room.passwordHash !== null, listed: room.listed, phase: room.phase,
      settings: structuredClone(room.settings), players: room.players.map(player => ({
        id: player.id, nickname: player.nickname, online: player.online, ready: player.ready,
        role: player.role, lives: player.lives, wins: player.wins,
        collected: [...player.collected], draft: player.draft, cpu: player.cpu,
      })), round: room.round, suddenDeath: room.suddenDeath,
      currentPlayerId: room.currentPlayerId, prompt: room.prompt,
      deadline: room.deadline, serverTime: Date.now(), history: room.history,
      chat: room.chat, lastWinnerId: room.lastWinnerId, winnerIds: room.winnerIds,
    };
  }

  function lobby(): LobbyRoom[] {
    const now = Date.now();
    return [...rooms.values()].filter(room => room.listed && now - room.lastActivity < idleMs)
      .sort((first, second) => second.createdAt - first.createdAt || second.creationOrder - first.creationOrder)
      .map(room => ({
        id: room.id, roomKey: room.roomKey, roomPinyin: room.roomPinyin, name: room.name, createdAt: room.createdAt, creator: room.creator,
        playerCount: room.players.length, maxPlayers: room.settings.maxPlayers,
        protected: room.passwordHash !== null, listed: room.listed, phase: room.phase,
        mode: room.settings.mode,
        conditions: conditionTypes.filter(type => room.settings.appearance[type] !== 'off'),
      }));
  }

  function broadcastLobby() {
    const message: ServerMessage = {type: 'lobby', rooms: lobby()};
    for (const session of sessions.values()) send(session.socket, message);
  }

  function broadcastRoom(room: Room) {
    const message: ServerMessage = {type: 'state', room: snapshot(room)};
    for (const player of room.players) send(player.socket, message);
  }

  function makeRoomKey(rules: WordRules, usedKeys: Set<string>) {
    const candidates = rules.data.words.filter(entry => entry.idiom && [...entry.word].length === 4 && entry.readings.length > 0)
      .map(entry => ({roomKey: entry.word, roomPinyin: entry.readings[0].syllables.map(syllable => normalizePinyin(syllable)).join('-')}))
      .filter(candidate => !usedKeys.has(candidate.roomPinyin.replaceAll('-', '')));
    if (!candidates.length) throw new Error('当前房间拼音已经用尽');
    return candidates[randomInt(candidates.length)];
  }

  function touch(room: Room) {
    room.lastActivity = Date.now();
    clearTimeout(room.idleTimer);
    room.idleTimer = setTimeout(broadcastLobby, idleMs + 1);
    broadcastRoom(room);
    broadcastLobby();
  }

  function requireRoom(session: Session) {
    const room = session.roomId ? rooms.get(session.roomId) : undefined;
    if (!room) throw new BusinessError('请进入房间');
    return room;
  }

  function requireHost(session: Session, room: Room) {
    if (room.hostId !== session.id) throw new BusinessError('此操作需要房主身份');
  }

  function nextPlayer(room: Room, previousId: string) {
    const previousIndex = room.playOrder.indexOf(previousId);
    for (let offset = 1; offset <= room.playOrder.length; offset++) {
      const id = room.playOrder[(previousIndex + offset + room.playOrder.length) % room.playOrder.length];
      const player = room.players.find(item => item.id === id);
      if (player && player.lives > 0) return player.id;
    }
    return null;
  }

  function resetDeadline(room: Room) {
    const seconds = room.settings.timerMode === 'fixed' ? room.settings.initialSeconds
      : randomInt(room.settings.randomMinSeconds, room.settings.randomMaxSeconds + 1);
    room.deadline = Date.now() + seconds * 1000;
  }

  function armDeadline(room: Room) {
    clearTimeout(room.turnTimer);
    if (room.deadline === null || room.phase !== 'playing') return;
    room.turnTimer = setTimeout(() => timeoutTurn(room), Math.max(1, room.deadline - Date.now()));
  }

  function penalizeInvalidAnswer(room: Room) {
    if (room.deadline === null) return;
    room.deadline = Math.max(Date.now(), room.deadline - 1000);
    armDeadline(room);
    touch(room);
  }

  function finishRound(room: Room, winnerId: string | null) {
    clearTimeout(room.turnTimer);
    clearTimeout(room.cpuTurnTimer);
    room.phase = 'between';
    room.lastWinnerId = winnerId;
    room.currentPlayerId = null;
    room.deadline = null;
    room.prompt = null;
    for (const player of room.players) {
      player.ready = player.cpu;
      player.collected = [];
      player.draft = '';
    }
    const winner = room.players.find(player => player.id === winnerId);
    if (!winner) {
      room.phase = 'finished';
      room.winnerIds = [];
      return;
    }
    winner.wins++;
    if (room.suddenDeath || (room.matchDuel && winner.wins >= (room.matchBestOf + 1) / 2)) {
      room.phase = 'finished';
      room.winnerIds = [winner.id];
      return;
    }
    if (room.round >= room.matchBestOf) {
      const participants = room.players.filter(player => room.matchPlayerIds.has(player.id));
      const highest = Math.max(...participants.map(player => player.wins));
      const leaders = participants.filter(player => player.wins === highest);
      if (leaders.length === 1) {
        room.phase = 'finished';
        room.winnerIds = [leaders[0].id];
      } else {
        room.suddenDeath = true;
        room.contenderIds = new Set(leaders.map(player => player.id));
      }
    }
  }

  function remainingPlayers(room: Room) {
    return room.players.filter(player => room.playOrder.includes(player.id) && player.lives > 0);
  }

  function preparePrompt(room: Room, rules: WordRules): boolean {
    try {
      room.prompt = rules.generate(room.settings, room.used);
      return true;
    } catch (error) {
      if (!(error instanceof RuleError)) throw error;
      clearTimeout(room.turnTimer);
      room.phase = 'between';
      room.round--;
      room.currentPlayerId = null;
      room.deadline = null;
      room.prompt = null;
      room.lastWinnerId = null;
      for (const player of room.players) {
        player.ready = player.cpu;
        player.collected = [];
        player.draft = '';
        send(player.socket, {type: 'notice', text: '当前规则没有可用提示，本局中止且不计胜局。请修改规则并重新准备。'});
      }
      return false;
    }
  }

  function timeoutTurn(room: Room) {
    if (room.phase !== 'playing') return;
    clearTimeout(room.cpuTurnTimer);
    if (room.deadline !== null && room.deadline > Date.now()) {
      armDeadline(room);
      return;
    }
    const player = room.players.find(item => item.id === room.currentPlayerId);
    if (!player) throw new Error('当前回合玩家不存在');
    player.lives--;
    player.draft = '';
    const remaining = remainingPlayers(room);
    if (remaining.length <= 1) {
      finishRound(room, remaining[0]?.id ?? null);
      touch(room);
      return;
    }
    room.currentPlayerId = nextPlayer(room, player.id);
    if (!loadedRules) throw new Error('游戏开始后词库需要保持可用');
    if (!preparePrompt(room, loadedRules)) {
      touch(room);
      return;
    }
    resetDeadline(room);
    armDeadline(room);
    scheduleCpuTurn(room);
    touch(room);
  }

  function acceptWord(room: Room, player: Session, word: string, rules: WordRules) {
    const result = rules.match(word, room.prompt!, room.settings, room.used);
    if (!result.valid) throw new Error(`答案没有通过规则：${word}`);
    room.used.add(word);
    room.history.push({playerId: player.id, nickname: player.nickname, word, at: Date.now()});
    player.draft = '';
    if (result.reading) {
      const collected = new Set(player.collected);
      for (const initial of result.reading.initials) if (room.settings.bonusInitials.includes(initial)) collected.add(initial);
      if (room.settings.bonusInitials.every(initial => collected.has(initial))) {
        player.lives = Math.min(room.settings.maxLives, player.lives + 1);
        player.collected = [];
      } else player.collected = [...collected];
    }
    room.currentPlayerId = nextPlayer(room, player.id);
    if (preparePrompt(room, rules)) {
      room.deadline = Math.max(room.deadline!, Date.now() + room.settings.minimumSeconds * 1000);
      armDeadline(room);
      scheduleCpuTurn(room);
    }
    touch(room);
  }

  function scheduleCpuTurn(room: Room) {
    clearTimeout(room.cpuTurnTimer);
    const player = room.players.find(item => item.id === room.currentPlayerId);
    if (room.phase !== 'playing' || !player?.cpu) return;
    room.cpuTurnTimer = setTimeout(async () => {
      if (room.phase !== 'playing' || room.currentPlayerId !== player.id || !room.prompt) return;
      const rules = await getRules();
      const answer = rules.examples(room.prompt, room.settings, room.used, 1)[0];
      if (!answer) {
        timeoutTurn(room);
        return;
      }
      const result = rules.match(answer.word, room.prompt, room.settings, room.used);
      if (!result.valid) throw new Error(`电脑答案没有通过规则：${answer.word}`);
      acceptWord(room, player, answer.word, rules);
    }, 700);
  }

  function removePlayer(session: Session) {
    const room = session.roomId ? rooms.get(session.roomId) : undefined;
    session.roomId = null;
    session.ready = false;
    session.role = 'player';
    session.lives = 0;
    session.wins = 0;
    session.collected = [];
    session.draft = '';
    send(session.socket, {type: 'state', room: null});
    if (!room) return;
    const previousId = room.currentPlayerId;
    const followingId = previousId === session.id ? nextPlayer(room, session.id) : previousId;
    room.players = room.players.filter(player => player.id !== session.id);
    room.matchPlayerIds.delete(session.id);
    room.contenderIds.delete(session.id);
    if (!room.players.some(player => !player.cpu)) {
      clearTimeout(room.idleTimer);
      clearTimeout(room.turnTimer);
      clearTimeout(room.cpuTurnTimer);
      rooms.delete(room.id);
      broadcastLobby();
      return;
    }
    if (room.players.length === 0) {
      clearTimeout(room.idleTimer);
      clearTimeout(room.turnTimer);
      rooms.delete(room.id);
      broadcastLobby();
      return;
    }
    if (room.hostId === session.id) room.hostId = (room.players.find(player => player.online) ?? room.players[0]).id;
    if (room.phase === 'playing') {
      const remaining = remainingPlayers(room);
      if (remaining.length <= 1) finishRound(room, remaining[0]?.id ?? null);
      else if (previousId === session.id) {
        room.currentPlayerId = followingId;
        room.deadline = Math.max(room.deadline!, Date.now() + room.settings.minimumSeconds * 1000);
        armDeadline(room);
        scheduleCpuTurn(room);
      }
    }
    if (room.phase === 'between' && room.suddenDeath && room.contenderIds.size < 2) {
      room.phase = 'finished';
      room.winnerIds = [...room.contenderIds];
    }
    touch(room);
  }

  function addCpu(room: Room) {
    if (room.phase === 'playing') throw new BusinessError('本局游戏期间不能加入电脑');
    if (room.players.some(player => player.cpu)) throw new BusinessError('房间已经有电脑玩家');
    if (room.players.length >= room.settings.maxPlayers) throw new BusinessError('房间人数已满');
    const cpuId = randomUUID();
    room.players.push({
      id: cpuId, token: `cpu-${cpuId}`, nickname: '电脑', online: true, ready: true, role: 'player', lives: 0,
      wins: 0, collected: [], draft: '', socket: null, roomId: room.id, cpu: true,
    });
  }

  function removeCpu(room: Room) {
    if (room.phase === 'playing') throw new BusinessError('本局游戏期间不能移除电脑');
    const cpu = room.players.find(player => player.cpu);
    if (!cpu) throw new BusinessError('房间还没有电脑玩家');
    room.players = room.players.filter(player => player.id !== cpu.id);
    room.matchPlayerIds.delete(cpu.id);
    room.contenderIds.delete(cpu.id);
  }

  function createRoom(session: Session, requestedName: string, passwordValue: string, listed: boolean, requestedSettings: RoomView['settings'], rules: WordRules) {
    const now = Date.now();
    const code = makeRoomKey(rules, new Set([...rooms.values()].map(room => room.roomPinyin.replaceAll('-', ''))));
    const settings = structuredClone(requestedSettings);
    const salt = passwordValue ? randomBytes(16) : null;
    const room: Room = {
      id: randomUUID(), roomKey: code.roomKey, roomPinyin: code.roomPinyin, name: requestedName || code.roomKey, createdAt: now, creator: session.nickname,
      hostId: session.id, listed, phase: 'waiting', settings,
      players: [session], round: 0, suddenDeath: false, currentPlayerId: null,
      prompt: null, deadline: null, history: [], chat: [], lastWinnerId: null, winnerIds: [],
      passwordSalt: salt, passwordHash: salt ? scryptSync(passwordValue, salt, 64) : null,
      lastActivity: now, used: new Set(), playOrder: [], matchPlayerIds: new Set(),
      contenderIds: new Set(), matchBestOf: settings.bestOf, matchDuel: false,
      creationOrder: ++creationOrder,
    };
    session.roomId = room.id;
    session.role = 'player';
    session.ready = false;
    rooms.set(room.id, room);
    touch(room);
    return room;
  }

  function joinRoom(session: Session, room: Room | undefined, passwordValue: string) {
    if (!room) throw new BusinessError('房间不存在');
    if (room.players.length >= room.settings.maxPlayers) throw new BusinessError('房间人数已满');
    if (room.passwordHash && !timingSafeEqual(scryptSync(passwordValue, room.passwordSalt!, 64), room.passwordHash)) {
      throw new BusinessError('房间密码不正确');
    }
    session.roomId = room.id;
    session.role = room.phase === 'playing' ? 'spectator' : 'player';
    session.ready = false;
    room.players.push(session);
    touch(room);
    return {roomId: room.id};
  }

  async function handle(session: Session, request: Request): Promise<unknown> {
    switch (request.type) {
      case 'ping': return {serverTime: Date.now()};
      case 'preview': {
        const rules = await getRules();
        return rules.generate(request.data.settings);
      }
      case 'create': {
        if (session.roomId) throw new BusinessError('请离开当前房间后创建房间');
        const rules = await getRules();
        const room = createRoom(session, request.data.name, request.data.password, request.data.listed ?? true, request.data.settings, rules);
        return {roomId: room.id};
      }
      case 'join': {
        if (session.roomId) throw new BusinessError('请离开当前房间后加入');
        return joinRoom(session, rooms.get(request.data.roomId), request.data.password);
      }
      case 'joinByCode': {
        if (session.roomId) throw new BusinessError('请离开当前房间后加入');
        const code = request.data.code.trim().toLowerCase().replaceAll('-', '');
        const room = [...rooms.values()].find(item => item.roomKey === code || item.roomPinyin.replaceAll('-', '') === code);
        return joinRoom(session, room, request.data.password);
      }
      case 'leave': removePlayer(session); return {};
      case 'hello': throw new BusinessError('当前连接已经设置昵称');
    }
    const room = requireRoom(session);
    switch (request.type) {
      case 'ready':
        if (room.phase === 'playing') throw new BusinessError('本局结束后可以准备');
        if (room.phase === 'between' && room.suddenDeath && !room.contenderIds.has(session.id)) throw new BusinessError('加赛限并列领先者参加');
        session.ready = request.data.ready;
        if (session.ready) session.role = 'player';
        touch(room);
        return {};
      case 'settings':
        requireHost(session, room);
        if (room.phase === 'playing') throw new BusinessError('本局游戏期间设置保持不变');
        if (room.phase === 'between' && request.data.settings.bestOf !== room.matchBestOf) throw new BusinessError('比赛局数在比赛开始前设置');
        if (request.data.settings.maxPlayers < room.players.length) throw new BusinessError('人数上限少于当前人数');
        room.settings = structuredClone(request.data.settings);
        for (const player of room.players) player.ready = player.cpu;
        touch(room);
        return {};
      case 'rename':
        requireHost(session, room);
        room.name = request.data.name;
        touch(room);
        return {};
      case 'metadata':
        requireHost(session, room);
        if (room.phase === 'playing') throw new BusinessError('本局游戏期间不能修改房间信息');
        if (request.data.password !== undefined) {
          const nextPassword = request.data.password;
          const salt = nextPassword ? randomBytes(16) : null;
          room.passwordSalt = salt;
          room.passwordHash = salt ? scryptSync(nextPassword, salt, 64) : null;
        }
        room.name = request.data.name.trim() || '击鼓传字房间';
        room.listed = request.data.listed;
        touch(room);
        return {};
      case 'visibility':
        requireHost(session, room);
        room.listed = request.data.listed;
        touch(room);
        return {};
      case 'addCpu':
        requireHost(session, room);
        addCpu(room);
        touch(room);
        return {};
      case 'removeCpu':
        requireHost(session, room);
        removeCpu(room);
        touch(room);
        return {};
      case 'start': {
        requireHost(session, room);
        const rules = await getRules();
        requireHost(session, room);
        if (session.roomId !== room.id || room.phase === 'playing') throw new BusinessError('房间状态已经改变');
        const players = room.players.filter(player => player.online && player.role === 'player' && (room.phase !== 'between' || !room.suddenDeath || room.contenderIds.has(player.id)));
        if (players.length < 2) throw new BusinessError('至少需要两名参赛玩家');
        if (players.some(player => !player.ready)) throw new BusinessError('参赛玩家需要准备');
        const prompt = rules.generate(room.settings, new Set());
        if (room.phase === 'waiting' || room.phase === 'finished') {
          room.round = 0;
          room.suddenDeath = false;
          room.winnerIds = [];
          room.matchPlayerIds.clear();
          room.contenderIds.clear();
          room.matchBestOf = room.settings.bestOf;
          room.matchDuel = players.length === 2;
          for (const player of room.players) player.wins = 0;
        }
        for (const player of players) room.matchPlayerIds.add(player.id);
        if (room.matchPlayerIds.size > 2) room.matchDuel = false;
        room.phase = 'playing';
        room.round++;
        room.lastWinnerId = null;
        room.playOrder = players.map(player => player.id);
        room.used.clear();
        room.history = [];
        room.prompt = prompt;
        for (const player of room.players) {
          player.lives = players.includes(player) ? room.settings.startingLives : 0;
          player.collected = [];
          player.draft = '';
          player.role = players.includes(player) ? 'player' : 'spectator';
        }
        room.currentPlayerId = players[(room.round - 1) % players.length].id;
        resetDeadline(room);
        armDeadline(room);
        scheduleCpuTurn(room);
        touch(room);
        return {};
      }
      case 'submit': {
        if (room.phase !== 'playing' || room.currentPlayerId !== session.id) throw new BusinessError('当前回合属于其他玩家');
        if (Date.now() >= room.deadline!) {
          timeoutTurn(room);
          throw new BusinessError('本回合时间已经结束');
        }
        if (request.data.promptId !== room.prompt!.id) throw new BusinessError('提示已经更新');
        const rules = await getRules();
        const result = rules.match(request.data.word, room.prompt!, room.settings, room.used);
        if (!result.valid) {
          penalizeInvalidAnswer(room);
          throw new BusinessError(result.reason ?? '答案未满足条件');
        }
        acceptWord(room, session, request.data.word, rules);
        return {word: request.data.word};
      }
      case 'draft':
        if (room.phase !== 'playing' || room.currentPlayerId !== session.id) throw new BusinessError('当前回合属于其他玩家');
        session.draft = request.data.word;
        broadcastRoom(room);
        {
          const rules = await getRules();
          const result = rules.draft(request.data.word, room.prompt!, room.settings, room.used);
          const offset = result.offset ?? null;
          const reading = result.reading && offset !== null ? {
            syllables: result.reading.syllables.slice(offset, offset + room.prompt!.cells.length),
            initials: result.reading.initials.slice(offset, offset + room.prompt!.cells.length),
            finals: result.reading.finals.slice(offset, offset + room.prompt!.cells.length),
            tones: result.reading.tones.slice(offset, offset + room.prompt!.cells.length),
          } : undefined;
          return {word: request.data.word, promptId: room.prompt!.id, offset, reading};
        }
      case 'chat':
        room.chat.push({id: randomUUID(), nickname: session.nickname, text: request.data.text, at: Date.now()});
        room.chat = room.chat.slice(-100);
        touch(room);
        return {};
      case 'transfer': {
        requireHost(session, room);
        const target = room.players.find(player => player.id === request.data.playerId);
        if (!target) throw new BusinessError('玩家已经离开房间');
        room.hostId = target.id;
        touch(room);
        return {};
      }
      case 'kick': {
        requireHost(session, room);
        if (request.data.playerId === session.id) throw new BusinessError('房主可以使用离开房间');
        const target = room.players.find(player => player.id === request.data.playerId);
        if (!target) throw new BusinessError('玩家已经离开房间');
        send(target.socket, {type: 'notice', text: '房主已将你移出房间'});
        removePlayer(target);
        return {};
      }
    }
  }

  async function receive(socket: WebSocket, raw: Buffer, binary: boolean) {
    if (binary) {
      socket.close(1003, '仅支持 JSON 文本');
      return;
    }
    let input: unknown;
    try {
      input = JSON.parse(raw.toString());
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      socket.close(1007, 'JSON 格式不正确');
      return;
    }
    const parsed = commandSchema.safeParse(input);
    if (!parsed.success) {
      const requestId = z.object({id: identifier}).safeParse(input);
      if (requestId.success) send(socket, {type: 'reply', id: requestId.data.id, ok: false, error: parsed.error.issues.map(issue => issue.message).join('；')});
      else socket.close(1008, '消息缺少请求编号');
      return;
    }
    const request = parsed.data as Request;
    try {
      let session = socketSessions.get(socket);
      if (request.type === 'hello' && !session) {
        session = request.data.token ? sessions.get(request.data.token) : undefined;
        if (request.data.token && !session) throw new BusinessError('登录信息已过期，请重新连接');
        if (session) {
          clearTimeout(session.reconnectTimer);
          if (session.socket && session.socket !== socket) {
            socketSessions.delete(session.socket);
            session.socket.close(1000, '身份已在其他连接使用');
          }
          session.socket = socket;
          session.online = true;
          session.nickname = request.data.nickname;
        } else {
          session = {
            id: randomUUID(), token: randomBytes(32).toString('hex'), nickname: request.data.nickname,
            online: true, ready: false, role: 'player', lives: 0, wins: 0,
            collected: [], draft: '', socket, roomId: null, cpu: false,
          };
          sessions.set(session.token, session);
        }
        socketSessions.set(socket, session);
        send(socket, {type: 'session', playerId: session.id, token: session.token});
        if (session.roomId) touch(requireRoom(session));
        else send(socket, {type: 'state', room: null});
        send(socket, {type: 'lobby', rooms: lobby()});
        send(socket, {type: 'reply', id: request.id, ok: true, result: {playerId: session.id}});
        return;
      }
      if (!session) throw new BusinessError('请设置昵称');
      const result = await handle(session, request);
      send(socket, {type: 'reply', id: request.id, ok: true, result});
    } catch (error) {
      if (error instanceof BusinessError || error instanceof RuleError) {
        send(socket, {type: 'reply', id: request.id, ok: false, error: error.message});
        return;
      }
      throw error;
    }
  }

  wss.on('connection', socket => {
    alive.set(socket, true);
    socket.on('pong', () => alive.set(socket, true));
    socket.on('error', error => {
      if ('code' in error && ['ECONNRESET', 'EPIPE'].includes(String(error.code))) socket.terminate();
      else throw error;
    });
    let pending = Promise.resolve();
    socket.on('message', (data, binary) => {
      pending = pending.then(() => receive(socket, data as Buffer, binary));
    });
    socket.on('close', () => {
      const session = socketSessions.get(socket);
      socketSessions.delete(socket);
      if (!session || closing) return;
      session.online = false;
      session.socket = null;
      if (session.roomId) touch(requireRoom(session));
      session.reconnectTimer = setTimeout(() => {
        removePlayer(session);
        sessions.delete(session.token);
      }, reconnectMs);
    });
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!alive.get(socket)) socket.terminate();
      else {
        alive.set(socket, false);
        socket.ping();
      }
    }
  }, 30_000);

  await getRules();
  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(options.port ?? 8787, options.host ?? '0.0.0.0', () => {
      httpServer.removeListener('error', reject);
      resolve();
    });
  });
  const serverAddress = httpServer.address() as AddressInfo;
  const addressHost = serverAddress.address === '0.0.0.0' ? '127.0.0.1' : serverAddress.address;
  const address = `ws://${addressHost.includes(':') ? `[${addressHost}]` : addressHost}:${serverAddress.port}`;

  async function close() {
    closing = true;
    clearInterval(heartbeat);
    for (const room of rooms.values()) {
      clearTimeout(room.turnTimer);
      clearTimeout(room.idleTimer);
      clearTimeout(room.cpuTurnTimer);
    }
    for (const session of sessions.values()) clearTimeout(session.reconnectTimer);
    for (const socket of wss.clients) socket.terminate();
    await new Promise<void>((resolve, reject) => wss.close(error => error ? reject(error) : resolve()));
    await new Promise<void>((resolve, reject) => httpServer.close(error => error ? reject(error) : resolve()));
  }

  return {httpServer, wss, address, close};
}
