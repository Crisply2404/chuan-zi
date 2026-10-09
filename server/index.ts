import { z } from 'zod';
import { createGameServer } from './game-server';

const port = z.coerce.number().int().min(1).max(65535).parse(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';
const origins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()).filter(Boolean)
  ?? ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173', 'https://crisply2404.github.io'];
for (const origin of origins) z.string().url().parse(origin);
const server = await createGameServer({port, host, allowedOrigins: origins});
console.log(`击鼓传字联机服务：${server.address}`);
process.once('SIGINT', async () => {await server.close(); process.exit(0);});
process.once('SIGTERM', async () => {await server.close(); process.exit(0);});
