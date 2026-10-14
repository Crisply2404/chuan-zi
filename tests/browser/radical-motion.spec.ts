import {createServer} from 'vite';
import type {AddressInfo} from 'node:net';
import {expect, test} from '@playwright/test';

test('部首笔画从提示位置连续直达目标，不经过额外中心跳动', async ({page}) => {
  const server = await createServer({server: {host: '127.0.0.1', port: 0}});
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=radical`);
    await page.evaluate(async () => {await document.fonts.load('25px "Chuan Zi Kai"', '冰凉');});
    await page.getByLabel('测试答案').fill('冰凉');
    await page.waitForTimeout(850);
    await page.getByLabel('测试答案').fill('');
    await page.waitForTimeout(850);
    const frames = await page.evaluate(async () => {
      const input = document.querySelector('input')!;
      const samples: {x: number; y: number; vector: boolean}[] = [];
      const start = performance.now();
      const read = () => {
        const part = document.querySelector('.prompt-part-radical')!;
        const glyph = part.querySelector('.stroke-glyph-vector g g');
        const rect = (glyph ?? part).getBoundingClientRect();
        const cell = part.closest('.prompt-cell')!.getBoundingClientRect();
        samples.push({x: rect.x + rect.width / 2 - cell.x, y: rect.y + rect.height / 2 - cell.y, vector: Boolean(glyph)});
      };
      read();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '冰凉');
      input.dispatchEvent(new Event('input', {bubbles: true}));
      while (performance.now() - start < 1000) {await new Promise(requestAnimationFrame);read();}
      return samples;
    });
    expect(frames.some(frame => frame.vector)).toBe(true);
    const xs = frames.map(frame => frame.x);
    const ys = frames.map(frame => frame.y);
    expect(Math.max(...xs) - xs[0]).toBeLessThan(1);
    expect(frames.every((frame, index) => index === 0 || frame.x <= frames[index - 1].x + 1), JSON.stringify(frames)).toBe(true);
    expect(new Set(xs.map(x => Math.round(x * 10))).size).toBeGreaterThan(8);
    expect(Math.max(...ys)).toBeLessThan(Math.max(ys[0], ys.at(-1)!) + 1);
    expect(Math.min(...ys)).toBeGreaterThan(Math.min(ys[0], ys.at(-1)!) - 1);
  } finally {await page.close();await server.close();}
});
