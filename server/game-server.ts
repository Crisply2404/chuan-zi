import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import WebSocket, { WebSocketServer } from 'ws';
import { WordRules } from '../shared/rules';
import type { DictionaryData } from '../shared/types';
import { createGameCore } from './game-core';

const sharedRulesCache = new Map<string, Promise<WordRules>>();

export interface GameServerOptions {
  port?: number;
  host?: string;
  dictionaryPath?: string;
  idleMs?: number;
  reconnectMs?: number;
  allowedOrigins?: string[];
}

export async function createGameServer(options: GameServerOptions = {}) {
  const dictionaryPath = options.dictionaryPath ?? fileURLToPath(new URL('../data/dictionary.json', import.meta.url));
  if (!sharedRulesCache.has(dictionaryPath)) sharedRulesCache.set(dictionaryPath, readFile(dictionaryPath, 'utf8').then(data => new WordRules(JSON.parse(data) as DictionaryData)));
  const core = createGameCore({rules: await sharedRulesCache.get(dictionaryPath)!, idleMs: options.idleMs, reconnectMs: options.reconnectMs});
  let closing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = Promise.resolve();
  const alive = new WeakMap<WebSocket, boolean>();
  const httpServer = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, {'Content-Type': 'application/json'});
      response.end(JSON.stringify(core.health()));
      return;
    }
    response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('页面不存在');
  });
  const wss = new WebSocketServer({noServer: true, maxPayload: 16 * 1024});
  httpServer.on('upgrade', (request, socket, head) => {
    const origin = request.headers.origin;
    if (options.allowedOrigins && (!origin || !options.allowedOrigins.includes(origin))) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, client => wss.emit('connection', client, request));
  });
  function arm() {
    clearTimeout(timer);
    const at = core.nextEventAt();
    if (Number.isFinite(at) && !closing) timer = setTimeout(() => enqueue(() => core.tick()), Math.max(1, at - Date.now()));
  }
  function enqueue(operation: () => void | Promise<void>) {
    pending = pending.then(async () => {
      core.tick();
      await operation();
      arm();
    });
  }
  wss.on('connection', socket => {
    alive.set(socket, true);
    socket.on('pong', () => alive.set(socket, true));
    socket.on('error', error => {
      if ('code' in error && ['ECONNRESET', 'EPIPE'].includes(String(error.code))) socket.terminate();
      else throw error;
    });
    socket.on('message', (data, binary) => enqueue(() => core.receive(socket, data.toString(), binary)));
    socket.on('close', () => { if (!closing) enqueue(() => core.disconnect(socket)); });
  });
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!alive.get(socket)) socket.terminate();
      else { alive.set(socket, false); socket.ping(); }
    }
  }, 30_000);
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
    clearTimeout(timer);
    for (const socket of wss.clients) socket.terminate();
    await pending;
    await new Promise<void>((resolve, reject) => wss.close(error => error ? reject(error) : resolve()));
    await new Promise<void>((resolve, reject) => httpServer.close(error => error ? reject(error) : resolve()));
  }
  return {httpServer, wss, address, close};
}
