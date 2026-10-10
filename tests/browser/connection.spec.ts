import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';
import { test, expect } from '@playwright/test';
import { createServer as createViteServer } from 'vite';
import WebSocket, { WebSocketServer } from 'ws';
import { createGameServer } from '../../server/game-server';
import type { Request, ServerMessage } from '../../shared/types';

test('真实联机中断后的通知在恢复时关闭，临时错误定时关闭', async ({ page }) => {
  let server = await createGameServer({ port: 0, host: '127.0.0.1' });
  const port = Number(new URL(server.address).port);
  const webpage = await createViteServer({
    define: { 'import.meta.env.VITE_WS_URL': JSON.stringify(server.address) },
    server: { host: '127.0.0.1', port: 0 },
  });
  try {
    await webpage.listen();
    const address = webpage.httpServer!.address() as AddressInfo;
    const webpageUrl = `http://127.0.0.1:${address.port}/`;
    await page.goto(`${webpageUrl}?room=unknown-room`);
    await expect(page.locator('.notice-banner')).toContainText('房间不存在');
    await expect(page.locator('.notice-banner')).toHaveCount(0, { timeout: 8000 });
    await server.close();
    await expect(page.getByRole('button', { name: '重新连接', exact: true }).first()).toBeVisible();
    await expect(page.locator('.notice-banner')).toContainText('联机服务暂时无法连接');
    server = await createGameServer({ port, host: '127.0.0.1' });
    await expect(page.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true })).toBeEnabled();
    await expect(page.locator('.notice-banner')).toHaveCount(0);
    await page.goto(`${webpageUrl}?room=another-unknown-room`);
    await expect(page.locator('.notice-banner')).toContainText('房间不存在');
    await page.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
    await expect(page.locator('.room-heading h1')).toBeVisible();
    await expect(page.locator('.notice-banner')).toHaveCount(0);
  } finally {
    await page.close();
    await webpage.close();
    await server.close();
  }
});

test('真实服务的延迟成功回复到达后立即清除超时通知', async ({ page }) => {
  const server = await createGameServer({ port: 0, host: '127.0.0.1' });
  const relayHttp = createServer();
  const relay = new WebSocketServer({ server: relayHttp });
  const upstreams = new Set<WebSocket>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  relay.on('connection', downstream => {
    const upstream = new WebSocket(server.address);
    upstreams.add(upstream);
    const requests: WebSocket.RawData[] = [];
    let delayedId: string | undefined;
    upstream.on('open', () => {
      if (downstream.readyState !== WebSocket.OPEN) { upstream.close(); return; }
      requests.splice(0).forEach(payload => upstream.send(payload, { binary: false }));
    });
    downstream.on('message', payload => {
      const request = JSON.parse(payload.toString()) as Request;
      if (request.type === 'create') delayedId = request.id;
      if (upstream.readyState === WebSocket.OPEN) upstream.send(payload, { binary: false });
      else requests.push(payload);
    });
    upstream.on('message', payload => {
      const message = JSON.parse(payload.toString()) as ServerMessage;
      const forward = () => { if (downstream.readyState === WebSocket.OPEN) downstream.send(payload, { binary: false }); };
      if (message.type === 'reply' && message.id === delayedId) {
        const timer = setTimeout(() => { timers.delete(timer); forward(); }, 16_500);
        timers.add(timer);
      } else forward();
    });
    downstream.on('close', () => { if (upstream.readyState === WebSocket.OPEN) upstream.close(); });
    upstream.on('close', () => upstreams.delete(upstream));
  });
  await new Promise<void>(resolve => relayHttp.listen(0, '127.0.0.1', resolve));
  const relayAddress = relayHttp.address() as AddressInfo;
  const webpage = await createViteServer({
    define: { 'import.meta.env.VITE_WS_URL': JSON.stringify(`ws://127.0.0.1:${relayAddress.port}`) },
    server: { host: '127.0.0.1', port: 0 },
  });
  try {
    await webpage.listen();
    const webpageAddress = webpage.httpServer!.address() as AddressInfo;
    await page.goto(`http://127.0.0.1:${webpageAddress.port}/`);
    await page.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
    await expect(page.locator('.room-heading h1')).toBeVisible();
    await expect(page.locator('.notice-banner')).toContainText('服务器响应超时', { timeout: 17_000 });
    await expect(page.locator('.notice-banner')).toHaveCount(0, { timeout: 2500 });
  } finally {
    await page.close();
    await webpage.close();
    timers.forEach(timer => clearTimeout(timer));
    relay.clients.forEach(socket => socket.terminate());
    upstreams.forEach(socket => socket.terminate());
    await new Promise<void>((resolve, reject) => relay.close(error => error ? reject(error) : resolve()));
    await new Promise<void>((resolve, reject) => relayHttp.close(error => error ? reject(error) : resolve()));
    await server.close();
  }
});
