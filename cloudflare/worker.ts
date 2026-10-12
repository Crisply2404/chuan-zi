import type { DurableObjectNamespace, DurableObjectState, WebSocket as HibernatingSocket } from '@cloudflare/workers-types';
import { gunzipSync, strFromU8 } from 'fflate';
import dictionary from '../.scratch/cloudflare/bundle/dictionary.gz';
import { expandDictionary, type CompactDictionary } from '../shared/compact-dictionary';
import { WordRules } from '../shared/rules';
import { createGameCore, type GameState } from '../server/game-core';

interface Env {
  GAME_HUB: DurableObjectNamespace;
  ALLOWED_ORIGINS: string;
  IDLE_MS?: string;
  RECONNECT_MS?: string;
}

let rules: WordRules | undefined;
let rulesLoadMilliseconds: number | undefined;
function getRules() {
  if (!rules) {
    const started = performance.now();
    rules = new WordRules(expandDictionary(JSON.parse(strFromU8(gunzipSync(new Uint8Array(dictionary)))) as CompactDictionary));
    rulesLoadMilliseconds = performance.now() - started;
  }
  return rules;
}

export class GameHub {
  private core: ReturnType<typeof createGameCore>;
  private saved = new Map<string, string>();
  private pending = Promise.resolve();

  constructor(private context: DurableObjectState, env: Env) {
    context.storage.sql.exec('CREATE TABLE IF NOT EXISTS game_records (key TEXT PRIMARY KEY, data TEXT NOT NULL)');
    const rows = context.storage.sql.exec<{key: string; data: string}>('SELECT key, data FROM game_records').toArray();
    const state: GameState = {version: 1, creationOrder: 0, rooms: [], sessions: [], events: []};
    for (const row of rows) {
      this.saved.set(row.key, row.data);
      if (row.key === 'metadata') Object.assign(state, JSON.parse(row.data));
      if (row.key.startsWith('room:')) state.rooms.push(JSON.parse(row.data));
      if (row.key.startsWith('session:')) state.sessions.push(JSON.parse(row.data));
      if (row.key.startsWith('event:')) state.events.push(JSON.parse(row.data));
    }
    this.core = createGameCore({rules: getRules(), state: rows.length ? state : undefined, idleMs: env.IDLE_MS ? Number(env.IDLE_MS) : undefined, reconnectMs: env.RECONNECT_MS ? Number(env.RECONNECT_MS) : undefined});
    for (const socket of context.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as {token?: string} | null;
      if (attachment?.token) this.core.attach(socket, attachment.token);
    }
    this.core.reconcileConnections();
  }

  private async save() {
    const state = this.core.exportState();
    const next = new Map<string, string>([['metadata', JSON.stringify({version: state.version, creationOrder: state.creationOrder})]]);
    for (const room of state.rooms) next.set(`room:${room.id}`, JSON.stringify(room));
    for (const session of state.sessions) next.set(`session:${session.token}`, JSON.stringify(session));
    for (const event of state.events) next.set(`event:${event.key}`, JSON.stringify(event));
    this.context.storage.transactionSync(() => {
      for (const [key, data] of next) if (this.saved.get(key) !== data) {
        this.context.storage.sql.exec('INSERT INTO game_records (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data', key, data);
      }
      for (const key of this.saved.keys()) if (!next.has(key)) this.context.storage.sql.exec('DELETE FROM game_records WHERE key = ?', key);
    });
    this.saved = next;
    const at = this.core.nextEventAt();
    const current = await this.context.storage.getAlarm();
    if (Number.isFinite(at)) { if (current !== at) await this.context.storage.setAlarm(at); }
    else if (current !== null) await this.context.storage.deleteAlarm();
  }

  private run(operation: () => void | Promise<void>) {
    const next = this.pending.then(async () => {
      this.core.tick();
      await operation();
      await this.save();
    });
    this.pending = next;
    return next;
  }

  async fetch(request: Request) {
    await this.context.blockConcurrencyWhile(() => this.run(() => {}));
    if (new URL(request.url).pathname === '/health') return Response.json({...this.core.health(), dictionary: {words: rules!.data.words.length, initializationMilliseconds: rulesLoadMilliseconds}});
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1] as unknown as HibernatingSocket;
    this.context.acceptWebSocket(server);
    server.serializeAttachment({});
    return new Response(null, {status: 101, webSocket: client});
  }

  async webSocketMessage(socket: HibernatingSocket, message: string | ArrayBuffer) {
    if ((typeof message === 'string' ? new TextEncoder().encode(message).byteLength : message.byteLength) > 16 * 1024) {
      socket.close(1009, '消息超过长度限制');
      return;
    }
    await this.context.blockConcurrencyWhile(() => this.run(async () => {
      await this.core.receive(socket, message, typeof message !== 'string');
      for (const connection of this.context.getWebSockets()) connection.serializeAttachment({token: this.core.tokenFor(connection)});
    }));
  }

  async webSocketClose(socket: HibernatingSocket) {
    await this.context.blockConcurrencyWhile(() => this.run(() => this.core.disconnect(socket)));
  }

  async webSocketError(socket: HibernatingSocket) {
    socket.close(1011, '连接中断');
    await this.context.blockConcurrencyWhile(() => this.run(() => this.core.disconnect(socket)));
  }

  async alarm() {
    await this.context.blockConcurrencyWhile(() => this.run(() => {}));
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname !== '/health' && url.pathname !== '/ws') return new Response('页面不存在', {status: 404});
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('需要 WebSocket 连接', {status: 426});
      const origin = request.headers.get('Origin');
      const allowed = env.ALLOWED_ORIGINS.split(',').map(value => value.trim());
      if (!origin || !allowed.includes(origin)) return new Response('来源不允许', {status: 403});
    }
    const id = env.GAME_HUB.idFromName('chuan-zi');
    return env.GAME_HUB.get(id, {locationHint: 'apac'}).fetch(request as never);
  },
};
