import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import WebSocket from 'ws';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { defaultSettings } from '../shared/types';

const directory = '.scratch/cloudflare';
await mkdir(directory, {recursive: true});
const worker = new Miniflare(convertV4MiniflareOptions({
  name: 'chuan-zi-online', modules: [{type: 'ESModule', path: `${directory}/bundle/worker.js`}, {type: 'Data', path: `${directory}/bundle/dictionary.gz`}],
  compatibilityDate: '2026-10-06', compatibilityFlags: ['nodejs_compat'], inspectorPort: 0,
  durableObjects: {GAME_HUB: {className: 'GameHub', useSQLite: true}}, bindings: {ALLOWED_ORIGINS: 'https://crisply2404.github.io'},
  resourcePersistencePath: `${directory}/measure-storage-${randomUUID()}`, resourceTmpPath: `${directory}/measure-runtime`,
}));
try {
  const health = await (await worker.dispatchFetch('https://game.example/health')).json();
  const inspector = await worker.getInspectorURL();
  inspector.protocol = 'http:';
  const targets = await (await fetch(new URL('/json/list', inspector))).json() as {id: string; title: string; webSocketDebuggerUrl: string}[];
  const target = targets.find(item => item.title.includes('chuan-zi'));
  if (!target) throw new Error('workerd Inspector 中没有找到游戏 Worker');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, 'open');
  let sequence = 0;
  const pending = new Map<number, {resolve: (result: unknown) => void; reject: (error: Error) => void}>();
  let contextId: number | undefined;
  socket.on('message', raw => {
    const message = JSON.parse(raw.toString()) as {id?: number; method?: string; params?: {context: {id: number}}; result?: unknown; error?: {message: string}};
    if (message.method === 'Runtime.executionContextCreated') contextId = message.params!.context.id;
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  const command = (method: string, params: Record<string, unknown> = {}) => new Promise<unknown>((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, {resolve, reject});
    socket.send(JSON.stringify({id, method, params}));
  });
  await command('Runtime.enable');
  const memoryBefore = await command('Runtime.getHeapUsage') as {usedSize: number; totalSize: number; backingStorageSize?: number; embedderHeapUsedSize?: number};
  const before = performance.now();
  const response = await worker.dispatchFetch('https://game.example/ws', {headers: {Upgrade: 'websocket', Origin: 'https://crisply2404.github.io'}});
  const player = response.webSocket!;
  player.accept();
  const requests = new Map<string, {resolve: (result: unknown) => void; reject: (error: Error) => void}>();
  player.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (message.type !== 'reply') return;
    const request = requests.get(message.id);
    requests.delete(message.id);
    if (message.ok) request?.resolve(message.result);
    else request?.reject(new Error(message.error));
  });
  const send = (type: string, data: unknown) => new Promise<unknown>((resolve, reject) => {
    const id = crypto.randomUUID();
    requests.set(id, {resolve, reject});
    player.send(JSON.stringify({id, type, data}));
  });
  await command('Profiler.enable');
  await command('Profiler.start');
  await send('hello', {nickname: '测量玩家'});
  await send('create', {name: '', password: '', settings: defaultSettings});
  await send('preview', {settings: defaultSettings});
  const after = performance.now();
  const profile = await command('Profiler.stop') as {profile: {nodes: {id: number; callFrame: {url: string; functionName: string}}[]; samples: number[]; timeDeltas: number[]}};
  const nodes = new Map(profile.profile.nodes.map(node => [node.id, node]));
  let sampledCpuMicroseconds = 0;
  profile.profile.samples.forEach((id, index) => {
    const name = nodes.get(id)?.callFrame.functionName;
    if (name !== '(idle)' && name !== '(program)') sampledCpuMicroseconds += profile.profile.timeDeltas[index];
  });
  const memory = await command('Runtime.getHeapUsage') as typeof memoryBefore;
  assert.ok(memory.usedSize + (memory.backingStorageSize ?? 0) < 128 * 1024 * 1024);
  const report = {memoryBefore, memory, elapsedMilliseconds: after - before, sampledCpuMicroseconds, health, contextId};
  await writeFile(`${directory}/memory-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  player.close();
  socket.close();
} finally {
  await worker.dispose();
}
