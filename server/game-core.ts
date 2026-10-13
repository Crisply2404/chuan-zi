import { randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { settingsSchema } from '../shared/settings';
import { conditionTypes, type LobbyRoom, type PlayerView, type Request, type RoomView, type ServerMessage } from '../shared/types';
import { RuleError, WordRules } from '../shared/rules';
import { normalizePinyin } from '../shared/pinyin';
import { playerColors } from '../shared/player-layout';
import {bonusCandidates, collectBonusValues, resolveBonusType} from '../shared/bonuses';
import {stalemateScore} from '../shared/idiom-prompts';

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
  z.object({id: identifier, type: z.literal('draft'), data: z.object({word: z.string().max(30), promptId: identifier.optional()}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('chat'), data: z.object({text: z.string().trim().min(1).max(300)}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('transfer'), data: z.object({playerId: identifier}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('kick'), data: z.object({playerId: identifier}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('preview'), data: z.object({settings: settingsSchema}).strict()}).strict(),
  z.object({id: identifier, type: z.literal('ping'), data: empty}).strict(),
]);

class BusinessError extends Error {}

interface Session extends PlayerView {
  token: string;
  socket: GameSocket | null;
  roomId: string | null;
  cpu: boolean;
}

interface Room extends Omit<RoomView, 'players' | 'protected' | 'serverTime'> {
  players: Session[];
  passwordSalt: Buffer | null;
  passwordHash: Buffer | null;
  lastActivity: number;
  used: Set<string>;
  failedPromptPlayers: Set<string>;
  playOrder: string[];
  matchPlayerIds: Set<string>;
  contenderIds: Set<string>;
  matchBestOf: number;
  matchDuel: boolean;
  creationOrder: number;
  answersWithoutLifeLoss: number;
}

export interface GameSocket {
  readonly readyState: number;
  send(data: string): void;
  close(code: number, reason: string): void;
}

interface ScheduledEvent {
  key: string;
  at: number;
  type: 'idle' | 'turn' | 'cpu' | 'reconnect' | 'answer';
  target: string;
  promptId?: string;
  playerId?: string;
  word?: string;
  length?: number;
}

type StoredSession = Omit<Session, 'socket'>;
type StoredRoom = Omit<Room, 'players' | 'passwordSalt' | 'passwordHash' | 'used' | 'failedPromptPlayers' | 'matchPlayerIds' | 'contenderIds'> & {
  players: string[];
  passwordSalt: string | null;
  passwordHash: string | null;
  used: string[];
  failedPromptPlayers: string[];
  matchPlayerIds: string[];
  contenderIds: string[];
};

export interface GameState {
  version: 1;
  creationOrder: number;
  rooms: StoredRoom[];
  sessions: StoredSession[];
  events: ScheduledEvent[];
}

export interface GameCoreOptions {
  rules: WordRules;
  idleMs?: number;
  reconnectMs?: number;
  state?: GameState;
}

export function createGameCore(options: GameCoreOptions) {
  const idleMs = options.idleMs ?? 15 * 60 * 1000;
  const reconnectMs = options.reconnectMs ?? 60 * 1000;
  const rooms = new Map<string, Room>();
  const sessions = new Map<string, Session>();
  const socketSessions = new Map<GameSocket, Session>();
  const events = new Map<string, ScheduledEvent>();
  let creationOrder = 0;
  const loadedRules = options.rules;

  function getRules() {
    return Promise.resolve(loadedRules);
  }

  function send(socket: GameSocket | null, message: ServerMessage) {
    if (socket?.readyState === 1) socket.send(JSON.stringify(message));
  }

  function snapshot(room: Room): RoomView {
    return {
      id: room.id, roomKey: room.roomKey, roomPinyin: room.roomPinyin, name: room.name, createdAt: room.createdAt, creator: room.creator,
      hostId: room.hostId, protected: room.passwordHash !== null, listed: room.listed, phase: room.phase,
      settings: structuredClone(room.settings), players: room.players.map(player => ({
        id: player.id, nickname: player.nickname, online: player.online, ready: player.ready,
        role: player.role, lives: player.lives, wins: player.wins,
        collected: [...player.collected], bonusTargets: [...player.bonusTargets], draft: player.draft, cpu: player.cpu, color: player.color,
      })), round: room.round, suddenDeath: room.suddenDeath,
      currentPlayerId: room.currentPlayerId, prompt: room.prompt,
      deadline: room.deadline, serverTime: Date.now(), history: room.history, previousPlayerId: room.previousPlayerId,
      chat: room.chat, lastWinnerId: room.lastWinnerId, winnerIds: room.winnerIds, draftMatch: room.draftMatch, acceptedAnswer: room.acceptedAnswer,
    };
  }

  function lobby(): LobbyRoom[] {
    const now = Date.now();
    return [...rooms.values()].filter(room => room.listed && now - room.lastActivity < idleMs)
      .sort((first, second) => second.createdAt - first.createdAt || second.creationOrder - first.creationOrder)
      .map(room => ({
        id: room.id, roomKey: room.roomKey, roomPinyin: room.roomPinyin, name: room.name, createdAt: room.createdAt, creator: room.creator,
        playerCount: room.players.filter(player => !player.cpu).length, maxPlayers: room.settings.maxPlayers,
        protected: room.passwordHash !== null, listed: room.listed, phase: room.phase,
        mode: room.settings.mode,
        dictionary: room.settings.dictionary,
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
    schedule('idle', room.id, room.lastActivity + idleMs + 1);
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
    cancel('answer', room.id);
    const seconds = room.settings.timerMode === 'fixed' ? room.settings.initialSeconds
      : randomInt(room.settings.randomMinSeconds, room.settings.randomMaxSeconds + 1);
    room.deadline = Date.now() + seconds * 1000;
  }

  function armDeadline(room: Room) {
    cancel('turn', room.id);
    if (room.deadline === null || room.phase !== 'playing') return;
    schedule('turn', room.id, room.deadline);
  }

  function penalizeInvalidAnswer(room: Room) {
    if (room.deadline === null) return;
    room.deadline = Math.max(Date.now(), room.deadline - 1000);
    armDeadline(room);
    touch(room);
  }

  function finishRound(room: Room, winnerId: string | null) {
    cancel('answer', room.id);
    cancel('turn', room.id);
    cancel('cpu', room.id);
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
      room.winnerIds = [];
      if (room.round >= room.matchBestOf) {
        const participants = room.players.filter(player => room.matchPlayerIds.has(player.id));
        const highest = Math.max(...participants.map(player => player.wins));
        const leaders = participants.filter(player => player.wins === highest);
        if (leaders.length > 1 && !room.matchDuel) {
          room.suddenDeath = true;
          room.contenderIds = new Set(leaders.map(player => player.id));
        } else {
          room.phase = 'finished';
          if (leaders.length === 1) room.winnerIds = [leaders[0].id];
        }
      }
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
    cancel('answer', room.id);
    try {
      room.prompt = rules.generate(room.settings, room.used, {stalemateScore: stalemateScore(room.answersWithoutLifeLoss)});
      room.draftMatch = null;
      room.failedPromptPlayers.clear();
      return true;
    } catch (error) {
      if (!(error instanceof RuleError)) throw error;
      cancel('turn', room.id);
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
    cancel('cpu', room.id);
    if (room.deadline !== null && room.deadline > Date.now()) {
      armDeadline(room);
      return;
    }
    const player = room.players.find(item => item.id === room.currentPlayerId);
    if (!player) throw new Error('当前回合玩家不存在');
    if (!loadedRules) throw new Error('比赛词库需要保持可用');
    if (player.draft && loadedRules.match(player.draft, room.prompt!, room.settings, room.used).valid) {
      acceptWord(room, player, player.draft, loadedRules);
      return;
    }
    player.lives--;
    room.answersWithoutLifeLoss = 0;
    player.draft = '';
    room.failedPromptPlayers.add(player.id);
    const remaining = remainingPlayers(room);
    if (!remaining.length || remaining.length === 1 && room.failedPromptPlayers.has(remaining[0].id)) {
      finishRound(room, remaining[0]?.id ?? null);
      touch(room);
      return;
    }
    room.previousPlayerId = player.id;
    if (remaining.length === 1) {
      room.currentPlayerId = remaining[0].id;
      room.draftMatch = null;
      resetDeadline(room);
      armDeadline(room);
      scheduleCpuTurn(room);
      touch(room);
      return;
    }
    room.currentPlayerId = nextPlayer(room, player.id);
    room.draftMatch = null;
    if (!loadedRules) throw new Error('游戏开始后词库需要保持可用');
    if (remaining.every(item => room.failedPromptPlayers.has(item.id)) && !preparePrompt(room, loadedRules)) {
      touch(room);
      return;
    }
    resetDeadline(room);
    armDeadline(room);
    scheduleCpuTurn(room);
    touch(room);
  }

  function acceptWord(room: Room, player: Session, word: string, rules: WordRules) {
    cancel('answer', room.id);
    const result = rules.match(word, room.prompt!, room.settings, room.used);
    if (!result.valid) throw new Error(`答案没有通过规则：${word}`);
    const offset = result.offset!;
    const reading = result.reading!;
    room.acceptedAnswer = { id: randomUUID(), playerId: player.id, word, prompt: structuredClone(room.prompt!), color: player.color, at: Date.now(),
      match: { word, promptId: room.prompt!.id, offset, reading: { syllables: reading.syllables.slice(offset, offset + room.prompt!.cells.length), initials: reading.initials.slice(offset, offset + room.prompt!.cells.length), finals: reading.finals.slice(offset, offset + room.prompt!.cells.length), tones: reading.tones.slice(offset, offset + room.prompt!.cells.length) } } };
    room.used.add(word);
    room.answersWithoutLifeLoss++;
    room.history.push({playerId: player.id, nickname: player.nickname, word, at: Date.now()});
    player.draft = '';
    const bonusType = resolveBonusType(room.settings);
    if (result.reading && bonusType && player.bonusTargets.length) {
      const collected = new Set(player.collected);
      for (const value of collectBonusValues(word, result.reading, rules.data.characters, bonusType)) if (player.bonusTargets.includes(value)) collected.add(value);
      if (player.bonusTargets.every(initial => collected.has(initial))) {
        player.lives = Math.min(room.settings.maxLives, player.lives + 1);
        player.collected = [];
        player.bonusTargets = drawBonusTargets(room, player);
      } else player.collected = [...collected];
    }
    room.previousPlayerId = player.id;
    const remaining = remainingPlayers(room);
    if (remaining.length <= 1) {
      finishRound(room, remaining[0]?.id ?? null);
      touch(room);
      return;
    }
    room.currentPlayerId = nextPlayer(room, player.id);
    if (preparePrompt(room, rules)) {
      resetDeadline(room);
      armDeadline(room);
      scheduleCpuTurn(room);
    }
    touch(room);
  }

  function drawBonusTargets(room: Room, player: Session): string[] {
    if (!resolveBonusType(room.settings)) return [];
    const previous = new Set(player.bonusTargets);
    const shuffle = (values: string[]) => {
      for (let index = values.length - 1; index > 0; index--) {
        const position = randomInt(index + 1);
        [values[index], values[position]] = [values[position], values[index]];
      }
      return values;
    };
    const candidates = bonusCandidates(room.settings);
    const targets = [...shuffle(candidates.filter(value => !previous.has(value))), ...shuffle(candidates.filter(value => previous.has(value)))].slice(0, Math.min(5, candidates.length));
    const occupied = new Set(room.players.filter(item => item.id !== player.id).map(item => [...item.bonusTargets].sort().join(':')));
    if (candidates.length > targets.length && occupied.has([...targets].sort().join(':'))) {
      for (const replacement of [...shuffle(candidates.filter(value => !targets.includes(value) && !previous.has(value))), ...shuffle(candidates.filter(value => !targets.includes(value) && previous.has(value)))]) {
        let changed = false;
        for (let index = targets.length - 1; index >= 0; index--) {
          const next = targets.map((value, position) => position === index ? replacement : value);
          if (!occupied.has([...next].sort().join(':'))) { targets.splice(0, targets.length, ...next); changed = true; break; }
        }
        if (changed) break;
      }
    }
    return targets;
  }

  function scheduleCpuTurn(room: Room) {
    cancel('cpu', room.id);
    const player = room.players.find(item => item.id === room.currentPlayerId);
    if (room.phase !== 'playing' || !player?.cpu) return;
    schedule('cpu', room.id, Date.now() + 700, {promptId: room.prompt!.id, playerId: player.id, length: 1});
  }

  function scheduleAnswer(room: Room, player: Session, valid: boolean) {
    const key = `answer:${room.id}`;
    const pending = events.get(key);
    if (!valid) { cancel('answer', room.id); return; }
    const at = pending?.promptId === room.prompt!.id && pending.playerId === player.id ? pending.at : Date.now() + 2000;
    schedule('answer', room.id, at, {promptId: room.prompt!.id, playerId: player.id});
  }

  function automaticAnswer(room: Room, event: ScheduledEvent) {
    const player = room.players.find(item => item.id === event.playerId);
    if (!player || !room.prompt || room.phase !== 'playing' || room.currentPlayerId !== player.id || room.prompt.id !== event.promptId) return;
    if (Date.now() >= room.deadline!) { timeoutTurn(room); return; }
    if (loadedRules.match(player.draft, room.prompt, room.settings, room.used).valid) acceptWord(room, player, player.draft, loadedRules);
  }

  function cpuStep(room: Room, event: ScheduledEvent) {
    const player = room.players.find(item => item.id === event.playerId);
    if (room.phase !== 'playing' || !player?.cpu || !room.prompt || room.currentPlayerId !== player.id || room.prompt.id !== event.promptId || Date.now() >= room.deadline!) return;
    const word = event.word ?? loadedRules.cpuAnswer(room.prompt, room.settings, room.used)?.word;
    if (!word) return;
    const characters = [...word];
    const length = event.length!;
    if (length > characters.length) {
      acceptWord(room, player, word, loadedRules);
      return;
    }
    player.draft = characters.slice(0, length).join('');
    const draft = loadedRules.draft(player.draft, room.prompt, room.settings, room.used);
    const offset = draft.offset ?? null;
    const reading = draft.reading && offset !== null ? {
      syllables: draft.reading.syllables.slice(offset, offset + room.prompt.cells.length),
      initials: draft.reading.initials.slice(offset, offset + room.prompt.cells.length),
      finals: draft.reading.finals.slice(offset, offset + room.prompt.cells.length),
      tones: draft.reading.tones.slice(offset, offset + room.prompt.cells.length),
    } : undefined;
          room.draftMatch = {word: player.draft, promptId: room.prompt.id, offset, reading, reason: draft.reason};
    broadcastRoom(room);
    schedule('cpu', room.id, Date.now() + (length < characters.length ? 110 : 650), {promptId: event.promptId, playerId: player.id, word, length: length + 1});
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
      cancel('answer', room.id);
      cancel('idle', room.id);
      cancel('turn', room.id);
      cancel('cpu', room.id);
      rooms.delete(room.id);
      broadcastLobby();
      return;
    }
    if (room.players.length === 0) {
      cancel('idle', room.id);
      cancel('turn', room.id);
      rooms.delete(room.id);
      broadcastLobby();
      return;
    }
    if (room.hostId === session.id) room.hostId = (room.players.find(player => player.online) ?? room.players[0]).id;
    if (room.phase === 'playing') {
      const remaining = remainingPlayers(room);
      if (remaining.length <= 1) finishRound(room, remaining[0]?.id ?? null);
      else {
        let promptChanged = false;
        if (remaining.every(player => room.failedPromptPlayers.has(player.id))) {
          if (!loadedRules) throw new Error('比赛中词库需要保持可用');
          preparePrompt(room, loadedRules);
          promptChanged = room.phase === 'playing';
        }
        if (room.phase === 'playing' && previousId === session.id) {
          room.previousPlayerId = session.id;
          room.currentPlayerId = followingId;
          resetDeadline(room);
          armDeadline(room);
          scheduleCpuTurn(room);
        } else if (promptChanged) {
          resetDeadline(room);
          armDeadline(room);
          scheduleCpuTurn(room);
        }
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
    const cpuId = randomUUID();
    room.players.push({
      id: cpuId, token: `cpu-${cpuId}`, nickname: '电脑', online: true, ready: true, role: 'player', lives: 0,
      wins: 0, collected: [], bonusTargets: [], draft: '', socket: null, roomId: room.id, cpu: true, color: nextColor(room),
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
      prompt: null, deadline: null, history: [], chat: [], lastWinnerId: null, winnerIds: [], previousPlayerId: null, draftMatch: null, acceptedAnswer: null,
      passwordSalt: salt, passwordHash: salt ? scryptSync(passwordValue, salt, 64) : null,
      lastActivity: now, used: new Set(), failedPromptPlayers: new Set(), playOrder: [], matchPlayerIds: new Set(), answersWithoutLifeLoss: 0,
      contenderIds: new Set(), matchBestOf: settings.bestOf, matchDuel: false,
      creationOrder: ++creationOrder,
    };
    session.roomId = room.id;
    session.color = playerColors[0];
    session.role = 'player';
    session.ready = false;
    rooms.set(room.id, room);
    touch(room);
    return room;
  }

  function joinRoom(session: Session, room: Room | undefined, passwordValue: string) {
    if (!room) throw new BusinessError('房间不存在');
    if (room.players.filter(player => !player.cpu).length >= room.settings.maxPlayers) throw new BusinessError('房间人数已满');
    if (room.passwordHash && !timingSafeEqual(scryptSync(passwordValue, room.passwordSalt!, 64), room.passwordHash)) {
      throw new BusinessError('房间密码不正确');
    }
    session.roomId = room.id;
    session.color = nextColor(room);
    session.role = room.phase === 'playing' ? 'spectator' : 'player';
    session.ready = false;
    room.players.push(session);
    touch(room);
    return {roomId: room.id};
  }

  function nextColor(room: Room): string {
    const color = playerColors.find(value => !room.players.some(player => player.color === value));
    if (!color) throw new Error('没有可用玩家颜色');
    return color;
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
        if (request.data.settings.maxPlayers < room.players.filter(player => !player.cpu).length) throw new BusinessError('人数上限少于当前人数');
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
        room.failedPromptPlayers.clear();
        room.history = [];
        room.answersWithoutLifeLoss = 0;
        room.acceptedAnswer = null;
        room.draftMatch = null;
        room.prompt = prompt;
        for (const player of room.players) {
          player.lives = players.includes(player) ? room.settings.startingLives : 0;
          player.collected = [];
          player.bonusTargets = players.includes(player) ? drawBonusTargets(room, player) : [];
          player.draft = '';
          player.role = players.includes(player) ? 'player' : 'spectator';
        }
        room.previousPlayerId = null;
        room.currentPlayerId = players[(room.round - 1) % players.length].id;
        resetDeadline(room);
        armDeadline(room);
        scheduleCpuTurn(room);
        touch(room);
        return {};
      }
      case 'submit': {
        const alreadyAccepted = () => room.acceptedAnswer?.playerId === session.id
          && room.acceptedAnswer.word === request.data.word
          && room.acceptedAnswer.prompt.id === request.data.promptId;
        if (alreadyAccepted()) return {word: request.data.word};
        if (room.phase !== 'playing' || room.currentPlayerId !== session.id) throw new BusinessError('当前回合属于其他玩家');
        if (Date.now() >= room.deadline!) {
          timeoutTurn(room);
          if (alreadyAccepted()) return {word: request.data.word};
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
        if (request.data.promptId && request.data.promptId !== room.prompt?.id) throw new BusinessError('提示已经更新');
        if (Date.now() >= room.deadline!) throw new BusinessError('本回合时间已经结束');
        session.draft = request.data.word;
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
          room.draftMatch = {word: request.data.word, promptId: room.prompt!.id, offset, reading, reason: result.reason};
          scheduleAnswer(room, session, result.valid);
          broadcastRoom(room);
          return room.draftMatch;
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

  async function receive(socket: GameSocket, raw: string | ArrayBuffer, binary = false) {
    if (binary) {
      socket.close(1003, '仅支持 JSON 文本');
      return;
    }
    let input: unknown;
    try {
      input = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
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
          cancel('reconnect', session.token);
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
            collected: [], bonusTargets: [], draft: '', socket, roomId: null, cpu: false, color: playerColors[0],
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

  function schedule(type: ScheduledEvent['type'], target: string, at: number, details: Partial<ScheduledEvent> = {}) {
    const key = `${type}:${target}`;
    events.set(key, {key, type, target, at, ...details});
  }

  function cancel(type: ScheduledEvent['type'], target: string) {
    events.delete(`${type}:${target}`);
  }

  function disconnect(socket: GameSocket) {
    const session = socketSessions.get(socket);
    socketSessions.delete(socket);
    if (!session) return;
    disconnectSession(session);
  }

  function disconnectSession(session: Session) {
    session.online = false;
    session.socket = null;
    if (session.roomId) touch(requireRoom(session));
    schedule('reconnect', session.token, Date.now() + reconnectMs);
  }

  function tick() {
    for (;;) {
      const event = [...events.values()].filter(item => item.at <= Date.now()).sort((first, second) => first.at - second.at)[0];
      if (!event) break;
      events.delete(event.key);
      if (event.type === 'reconnect') {
        const session = sessions.get(event.target);
        if (session && !session.online) {
          removePlayer(session);
          sessions.delete(session.token);
        }
        continue;
      }
      const room = rooms.get(event.target);
      if (!room) continue;
      if (event.type === 'idle') broadcastLobby();
      if (event.type === 'turn') timeoutTurn(room);
      if (event.type === 'cpu') cpuStep(room, event);
      if (event.type === 'answer') automaticAnswer(room, event);
    }
  }

  function exportState(): GameState {
    const allSessions = new Map(sessions);
    for (const room of rooms.values()) for (const player of room.players) allSessions.set(player.token, player);
    return {
      version: 1, creationOrder, events: [...events.values()],
      sessions: [...allSessions.values()].map(({socket, ...session}) => session),
      rooms: [...rooms.values()].map(({players, passwordSalt, passwordHash, used, failedPromptPlayers, matchPlayerIds, contenderIds, ...room}) => ({
        ...room, players: players.map(player => player.token), passwordSalt: passwordSalt?.toString('hex') ?? null, passwordHash: passwordHash?.toString('hex') ?? null,
        used: [...used], failedPromptPlayers: [...failedPromptPlayers], matchPlayerIds: [...matchPlayerIds], contenderIds: [...contenderIds],
      })),
    };
  }

  if (options.state) {
    if (options.state.version !== 1) throw new Error('持久状态版本不支持');
    creationOrder = options.state.creationOrder;
    const allSessions = new Map(options.state.sessions.map(session => {
      const restored = {...session, socket: null};
      if (!Object.hasOwn(restored, 'bonusTargets')) Object.assign(restored, {bonusTargets: []});
      return [session.token, restored] as [string, Session];
    }));
    for (const session of allSessions.values()) if (!session.cpu) sessions.set(session.token, session);
    for (const room of options.state.rooms) rooms.set(room.id, {
      ...room, answersWithoutLifeLoss: room.answersWithoutLifeLoss ?? 0, players: room.players.map(token => {
        const player = allSessions.get(token);
        if (!player) throw new Error('持久房间中的玩家身份不存在');
        return player;
      }), passwordSalt: room.passwordSalt ? Buffer.from(room.passwordSalt, 'hex') : null,
      passwordHash: room.passwordHash ? Buffer.from(room.passwordHash, 'hex') : null,
      used: new Set(room.used), failedPromptPlayers: new Set(room.failedPromptPlayers), matchPlayerIds: new Set(room.matchPlayerIds), contenderIds: new Set(room.contenderIds),
    });
    for (const event of options.state.events) events.set(event.key, event);
    for (const room of rooms.values()) {
      const legacyBonus = room.settings.bonusType === undefined;
      room.settings.bonusType ??= 'auto';
      for (const player of room.players) {
        if (legacyBonus || !resolveBonusType(room.settings)) {player.bonusTargets = []; player.collected = [];}
        if (room.phase === 'playing' && resolveBonusType(room.settings) && !player.bonusTargets.length) player.bonusTargets = drawBonusTargets(room, player);
      }
    }
  }

  return {
    receive, disconnect, tick, exportState,
    nextEventAt: () => Math.min(...[...events.values()].map(event => event.at), Infinity),
    health: () => ({ok: true, rooms: rooms.size, players: sessions.size}),
    tokenFor: (socket: GameSocket) => socketSessions.get(socket)?.token,
    reconcileConnections() {
      for (const session of sessions.values()) if (session.online && !session.socket) disconnectSession(session);
    },
    attach(socket: GameSocket, token: string) {
      const session = sessions.get(token);
      if (!session || !session.online) throw new Error('持久连接中的玩家身份不存在');
      session.socket = socket;
      socketSessions.set(socket, session);
    },
  };
}
