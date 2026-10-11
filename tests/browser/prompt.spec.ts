import type { AddressInfo } from 'node:net';
import { createServer } from 'vite';
import { test, expect } from '@playwright/test';

test('显示文字替换 i 原点，zh 保持宽度，成音节辅音声调位于字母上方', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  const base = `http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html`;
  try {
    await page.goto(`${base}?case=vowel`);
    await expect(page.locator('.prompt-part-final')).toHaveText('ı');
    await page.getByLabel('测试答案').fill('知识');
    await expect(page.locator('.prompt-layer-attached')).toBeVisible();
    await expect(page.locator('.prompt-part-final')).toHaveText('ı');
    await expect(page.locator('.prompt-part-tone')).toHaveCSS('color', 'rgb(34, 34, 34)');
    await expect.poll(() => page.locator('.prompt-cell').evaluate(element => {
      const tone = element.querySelector('.prompt-part-tone')!.getBoundingClientRect();
      const vowel = element.querySelector('.prompt-part-final')!.getBoundingClientRect();
      return tone.bottom - vowel.top;
    })).toBeLessThan(5);
    await page.goto(`${base}?case=initial`);
    const width = await page.locator('.prompt-part-initial').evaluate(element => element.getBoundingClientRect().width);
    const naturalWidth = await page.locator('.prompt-part-initial').evaluate(element => element.scrollWidth);
    expect(width).toBeGreaterThanOrEqual(naturalWidth - 1);
    await page.goto(`${base}?case=consonant`);
    await page.getByLabel('测试答案').fill('姆妈');
    await expect(page.locator('.prompt-layer-attached')).toBeVisible();
    await expect.poll(() => page.locator('.prompt-cell').evaluate(element => {
      const tone = element.querySelector('.prompt-part-tone')!.getBoundingClientRect();
      const initial = element.querySelector('.prompt-part-initial')!.getBoundingClientRect();
      return tone.bottom - initial.top;
    })).toBeLessThan(5);
  } finally { await page.close(); await server.close(); }
});

test('补间进行期间删除与再次输入连续运动并到达最终方格', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=sliding`);
    const input = page.getByLabel('测试答案');
    await input.fill('打击报复');
    await expect(page.locator('.prompt-layer-attached')).toBeVisible();
    await page.waitForTimeout(100);
    await input.fill('打击报');
    await page.waitForTimeout(100);
    await input.fill('打击报复');
    await expect.poll(() => page.locator('.prompt-cell').evaluateAll(elements => {
      const answers = document.querySelectorAll('.answer-cell');
      return elements.every((element, index) => {
        const prompt = element.getBoundingClientRect();
        const answer = answers[index + 1].getBoundingClientRect();
        return Math.abs(prompt.x - answer.x) < 1 && Math.abs(prompt.y - answer.y) < 1;
      });
    })).toBe(true);
    await input.fill('打击报');
    await expect.poll(() => page.locator('.prompt-supplement').evaluateAll(elements => elements.every(element => Number(getComputedStyle(element).opacity) === 0))).toBe(true);
  } finally { await page.close(); await server.close(); }
});

test('系统减少动态效果时提示立即完成且不保留动画', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=sliding`);
    await page.getByLabel('测试答案').fill('打击报复');
    await expect(page.locator('.prompt-layer-attached')).toBeVisible();
    await expect.poll(() => page.locator('.prompt-layer, .answer-editor, .prompt-part, .answer-cell').evaluateAll(elements => {
      return elements.every(element => element.getAnimations().length === 0);
    })).toBe(true);
  } finally { await page.close(); await server.close(); }
});
