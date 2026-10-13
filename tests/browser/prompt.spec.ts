import type { AddressInfo } from 'node:net';
import { createServer } from 'vite';
import { test, expect } from '@playwright/test';

test('部件与拼音提示采用汉字在上拼音在下的布局', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    for (const width of [390, 1440]) {
      await page.setViewportSize({width, height: 900});
      await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=combined`);
      await expect(page.locator('.prompt-part-radical')).toHaveText('冫');
      await expect.poll(() => page.locator('.prompt-cell').evaluate(element => {
        const radical = element.querySelector('.prompt-part-radical')!.getBoundingClientRect();
        const pinyin = element.querySelector('.prompt-part-initial')!.getBoundingClientRect();
        return radical.bottom <= pinyin.top;
      }), {timeout: 1000}).toBe(true);
      await page.getByLabel('测试答案').fill('冰凉');
      await expect(page.locator('.prompt-layer-attached')).toBeVisible();
      await expect(page.locator('.prompt-part-initial')).toHaveText('b');
      await expect(page.locator('.device-glyph-text')).toHaveText(['冰', '冰']);
    }
  } finally { await server.close(); }
});

test('提示内原有字段附着与返回都经过连续中间位置', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=sliding`);
    await page.waitForTimeout(100);
    const samples = await page.evaluate(async () => {
      const part = document.querySelector<HTMLElement>('.prompt-part-initial')!;
      const cell = part.closest('.prompt-cell')!;
      const read = () => {
        const fieldBounds = part.getBoundingClientRect();
        const cellBounds = cell.getBoundingClientRect();
        return { y: fieldBounds.y - cellBounds.y, connected: part.isConnected };
      };
      const frames = [read()];
      const input = document.querySelector('input')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '打击报复');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const started = performance.now();
      while (performance.now() - started < 850) {
        await new Promise(requestAnimationFrame);
        frames.push(read());
      }
      return frames;
    });
    const start = samples[0].y;
    const end = samples.at(-1)!.y;
    expect(Math.abs(end - start)).toBeGreaterThan(5);
    expect(samples.every(frame => frame.connected)).toBe(true);
    const middle = samples.filter(frame => Math.abs(frame.y - start) > .5 && Math.abs(frame.y - end) > .5);
    expect(new Set(middle.map(frame => Math.round(frame.y * 10))).size, JSON.stringify(samples)).toBeGreaterThan(8);
    const returning = await page.evaluate(async () => {
      const part = document.querySelector<HTMLElement>('.prompt-part-initial')!;
      const cell = part.closest('.prompt-cell')!;
      const read = () => part.getBoundingClientRect().y - cell.getBoundingClientRect().y;
      const frames = [read()];
      const input = document.querySelector('input')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '打击报');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const started = performance.now();
      while (performance.now() - started < 850) {
        await new Promise(requestAnimationFrame);
        frames.push(read());
      }
      return frames;
    });
    expect(returning.at(-1)!).toBeCloseTo(start, 1);
    expect(new Set(returning.filter(y => Math.abs(y - start) > .5 && Math.abs(y - end) > .5).map(y => Math.round(y * 10))).size).toBeGreaterThan(8);
  } finally { await page.close(); await server.close(); }
});

test('同位置更换合法答案时原有声调连续移动至新的元音', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=sliding`);
    await page.getByLabel('测试答案').fill('打击报复');
    await expect(page.locator('.prompt-layer-attached')).toBeVisible();
    await page.waitForTimeout(800);
    const samples = await page.evaluate(async () => {
      const part = document.querySelector<HTMLElement>('.prompt-origin.prompt-part-tone')!;
      const cell = part.closest('.prompt-cell')!;
      const read = () => part.getBoundingClientRect().x - cell.getBoundingClientRect().x;
      const frames = [read()];
      const input = document.querySelector('input')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '除旧布新');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const started = performance.now();
      while (performance.now() - started < 850) {
        await new Promise(requestAnimationFrame);
        frames.push(read());
      }
      return frames;
    });
    const start = samples[0];
    const end = samples.at(-1)!;
    expect(Math.abs(end - start)).toBeGreaterThan(2);
    const middle = samples.filter(x => Math.abs(x - start) > .1 && Math.abs(x - end) > .1);
    expect(new Set(middle.map(x => Math.round(x * 10))).size, JSON.stringify(samples)).toBeGreaterThan(8);
  } finally { await page.close(); await server.close(); }
});

test('附着答案中间的提示读取对应汉字的完整拼音', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=sliding`);
    await page.getByLabel('测试答案').fill('打击报复');
    await expect(page.locator('.prompt-cell').first()).toHaveAttribute('aria-label', '击 jī');
    await expect(page.locator('.prompt-cell').nth(1)).toHaveAttribute('aria-label', '报 bào');
    await expect(page.locator('.prompt-part-initial')).toHaveText(['j', 'b']);
    await expect.poll(() => page.locator('.prompt-cell').evaluateAll(cells => cells.every(cell => {
      const character = cell.querySelector('.prompt-part-character')!.getBoundingClientRect();
      const pinyin = cell.querySelector('.prompt-part-initial')!.getBoundingClientRect();
      return character.bottom < pinyin.top;
    }))).toBe(true);
  } finally { await page.close(); await server.close(); }
});

test('未提供条件的提示位置显示星号', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=hidden`);
    await expect(page.locator('.prompt-cell').nth(1)).toHaveText('*');
    await expect(page.locator('.prompt-cell').nth(1)).toHaveAttribute('aria-label', '不限条件');
  } finally { await page.close(); await server.close(); }
});

test('部首附着保持设备字体，原部件区域黑色，补全橙色', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=radical`);
    await page.evaluate(() => {
      const samples: number[] = [];
      Object.assign(window, { radicalFrames: samples, radicalFinished: false });
      const started = performance.now();
      const sample = () => {
        const group = document.querySelector('.device-glyph-original .device-glyph-text');
        if (group) samples.push(Number(getComputedStyle(group).opacity));
        if (performance.now() - started < 1200) requestAnimationFrame(sample);
        else Reflect.set(window, 'radicalFinished', true);
      };
      requestAnimationFrame(sample);
    });
    await page.getByLabel('测试答案').fill('冰凉');
    await expect(page.locator('.prompt-layer-attached')).toBeVisible();
    await expect(page.locator('.device-glyph-original clipPath rect')).toHaveCount(2);
    await expect(page.locator('.device-glyph-original .device-glyph-text')).toHaveCSS('color', 'rgb(34, 34, 34)');
    await expect(page.locator('.device-glyph-supplement .device-glyph-text')).toHaveCSS('color', 'rgb(255, 173, 50)');
    await page.waitForFunction(() => Reflect.get(window, 'radicalFinished'));
    const samples = await page.evaluate(() => Reflect.get(window, 'radicalFrames') as number[]);
    expect(new Set(samples.map(scale => Math.round(scale * 100))).size).toBeGreaterThan(8);
    await expect.poll(() => page.locator('.prompt-part-radical').evaluate(element => {
      const box = element.getBoundingClientRect();
      const word = element.closest('.prompt-cell')!.querySelector('.prompt-part-character')!.getBoundingClientRect();
      return Math.abs(box.x - word.x) + Math.abs(box.y - word.y);
    })).toBeLessThan(1);
    const fonts = await page.evaluate(() => {
      const source = getComputedStyle(document.querySelector('.answer-character')!);
      const complete = getComputedStyle(document.querySelector('.device-glyph-text')!);
      return {source: {family: source.fontFamily, size: source.fontSize}, complete: {family: complete.fontFamily, size: complete.fontSize}};
    });
    expect(fonts.complete).toEqual(fonts.source);
    expect(await page.locator('.device-glyph-original clipPath rect').evaluateAll(elements => elements.every(element => Number(element.getAttribute('x')) < .5))).toBe(true);
    await page.getByLabel('测试答案').fill('冰');
    await expect(page.locator('.prompt-layer-attached')).toHaveCount(0);
    await expect(page.locator('.prompt-part-character')).toHaveCount(0);
    await expect(page.locator('.prompt-part-radical')).toHaveText('冫');
  } finally { await page.close(); await server.close(); }
});

test('零声母提示显示空集符号并能附着真实答案', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=zeroInitial`);
    await expect(page.locator('.prompt-origin')).toHaveText('∅');
    await expect(page.locator('.prompt-cell')).toHaveAttribute('aria-label', '零声母');
    await page.getByLabel('测试答案').fill('安心');
    await expect(page.locator('.prompt-layer-attached')).toBeVisible();
    await expect(page.locator('.prompt-part-character')).toHaveText('安');
    await expect.poll(() => page.locator('.prompt-empty-phonetic').evaluate(element => Number(getComputedStyle(element).opacity))).toBe(0);
  } finally { await page.close(); await server.close(); }
});

test('更换合法答案时新增韵母渐渐显现', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=consonant`);
    await page.getByLabel('测试答案').fill('姆妈');
    await expect(page.locator('.prompt-layer-attached')).toBeVisible();
    await page.waitForTimeout(800);
    await expect(page.locator('.prompt-part-final')).toHaveCount(0);
    const samples = await page.evaluate(async () => {
      const input = document.querySelector('input')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '妈妈');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const frames: number[] = [];
      const started = performance.now();
      while (performance.now() - started < 850) {
        await new Promise(requestAnimationFrame);
        const part = document.querySelector('.prompt-part-final');
        frames.push(part ? Number(getComputedStyle(part).opacity) : 0);
      }
      return frames;
    });
    await expect(page.locator('.prompt-part-final')).toHaveText('a');
    expect(samples.at(-1)!).toBe(1);
    expect(samples.filter(alpha => alpha > 0 && alpha < 1).length, JSON.stringify(samples)).toBeGreaterThan(8);
  } finally { await page.close(); await server.close(); }
});

test('声调贴近实际元音并保持水平位置', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=sliding`);
    await page.getByLabel('测试答案').fill('打击报复');
    await expect(page.locator('.prompt-layer-attached')).toBeVisible();
    await page.waitForTimeout(800);
    const positions = await page.locator('.prompt-cell').evaluateAll(cells => cells.map(cell => {
      const letter = cell.querySelector<HTMLElement>('.prompt-part-final .prompt-letter-base')!;
      const letterBounds = letter.getBoundingClientRect();
      const style = getComputedStyle(letter);
      const context = document.createElement('canvas').getContext('2d')!;
      context.font = style.font;
      const metrics = context.measureText(letter.textContent!);
      const baseline = letterBounds.y + (letterBounds.height - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 + metrics.fontBoundingBoxAscent;
      const inkTop = baseline - metrics.actualBoundingBoxAscent;
      const tone = cell.querySelector('.prompt-part-tone')!.getBoundingClientRect();
      const ink = cell.querySelector('.prompt-part-tone path')!.getBoundingClientRect();
      return { gap: inkTop - ink.bottom, center: Math.abs(tone.x + tone.width / 2 - letterBounds.x - letterBounds.width / 2) };
    }));
    for (const position of positions) {
      expect(position.center, JSON.stringify(positions)).toBeLessThan(1);
      expect(position.gap, JSON.stringify(positions)).toBeGreaterThanOrEqual(0);
      expect(position.gap, JSON.stringify(positions)).toBeLessThan(4);
    }
  } finally { await page.close(); await server.close(); }
});

test('手机与电脑的 iu、ü 和长拼音声调保持自然间距', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const scenario of [
        { name: 'tone2', word: '牛奶', vowel: 'u', index: 1 },
        { name: 'tone3', word: '女儿', vowel: 'ü', index: 0 },
        { name: 'long', word: '窗户', vowel: 'a', index: 1 },
      ]) {
        await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=${scenario.name}`);
        await page.getByLabel('测试答案').fill(scenario.word);
        await expect(page.locator('.prompt-layer-attached')).toBeVisible();
        await page.waitForTimeout(800);
        const letter = page.locator('.prompt-part-final .prompt-letter-base').nth(scenario.index);
        await expect(letter).toHaveText(scenario.vowel);
        const position = await letter.evaluate(letter => {
          const cell = letter.closest('.prompt-cell')!;
          const bounds = letter.getBoundingClientRect();
          const tone = cell.querySelector('.prompt-part-tone')!.getBoundingClientRect();
          const ink = cell.querySelector('.prompt-part-tone path')!.getBoundingClientRect();
          const context = document.createElement('canvas').getContext('2d')!;
          context.font = getComputedStyle(letter).font;
          const metrics = context.measureText(letter.textContent!);
          const baseline = bounds.y + (bounds.height - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 + metrics.fontBoundingBoxAscent;
          return { gap: baseline - metrics.actualBoundingBoxAscent - ink.bottom,
            center: Math.abs(tone.x + tone.width / 2 - bounds.x - bounds.width / 2),
            inside: cell.querySelector('.prompt-part-final')!.getBoundingClientRect().right <= cell.getBoundingClientRect().right,
            scale: new DOMMatrix(getComputedStyle(letter.parentElement!).transform).a };
        });
        expect(position.center, `${width} ${scenario.name} ${JSON.stringify(position)}`).toBeLessThan(1);
        expect(position.gap, `${width} ${scenario.name} ${JSON.stringify(position)}`).toBeGreaterThanOrEqual(0);
        expect(position.gap, `${width} ${scenario.name} ${JSON.stringify(position)}`).toBeLessThan(4);
        expect(position.inside).toBe(true);
        expect(position.scale).toBe(1);
      }
    }
  } finally { await page.close(); await server.close(); }
});

test('拼音字形完整位于方格内部', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=sliding`);
      await page.getByLabel('测试答案').fill('打击报复');
      await expect(page.locator('.prompt-layer-attached')).toBeVisible();
      await page.waitForTimeout(800);
      const margin = await page.locator('.prompt-cell').evaluateAll(cells => Math.min(...cells.map(cell => {
        const bounds = cell.getBoundingClientRect();
        const letters = [...cell.querySelectorAll('.prompt-part-initial, .prompt-part-final')];
        return bounds.bottom - Math.max(...letters.map(letter => letter.getBoundingClientRect().bottom));
      })));
      expect(margin).toBeGreaterThanOrEqual(5);
    }
  } finally { await page.close(); await server.close(); }
});

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
      const tone = element.querySelector('.prompt-part-tone path')!.getBoundingClientRect();
      const vowel = element.querySelector('.prompt-part-final')!.getBoundingClientRect();
      return tone.bottom - vowel.top;
    })).toBeLessThan(5);
    await page.goto(`${base}?case=initial`);
    const width = await page.locator('.prompt-part-initial').evaluate(element => element.getBoundingClientRect().width);
    const naturalWidth = await page.locator('.prompt-part-initial').evaluate(element => element.scrollWidth);
    expect(width).toBeGreaterThanOrEqual(naturalWidth - 1);
    await expect(page.locator('.prompt-part-initial .prompt-letter')).toHaveCount(2);
    expect(await page.locator('.prompt-part-initial').evaluate(element => new DOMMatrix(getComputedStyle(element).transform).a)).toBe(1);
    await page.goto(`${base}?case=consonant`);
    await page.getByLabel('测试答案').fill('姆妈');
    await expect(page.locator('.prompt-layer-attached')).toBeVisible();
    await expect.poll(() => page.locator('.prompt-cell').evaluate(element => {
      const tone = element.querySelector('.prompt-part-tone path')!.getBoundingClientRect();
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

test('系统减少动态效果时提示附着仍有必要的连续运动', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=sliding`);
    await page.waitForTimeout(100);
    const frames = await page.evaluate(async () => {
      const prompt = document.querySelector('.prompt-layer')!;
      const input = document.querySelector('input')!;
      const samples = [prompt.getBoundingClientRect().y];
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '打击报复');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const start = performance.now();
      while (performance.now() - start < 850) {
        await new Promise(requestAnimationFrame);
        samples.push(prompt.getBoundingClientRect().y);
      }
      return samples;
    });
    const start = frames[0];
    const end = frames.at(-1)!;
    expect(Math.abs(end - start)).toBeGreaterThan(20);
    expect(frames.filter(y => Math.abs(y - start) > .5 && Math.abs(y - end) > .5).length, JSON.stringify(frames)).toBeGreaterThan(8);
  } finally { await page.close(); await server.close(); }
});

test('立即提交合法答案加速结合并经过中间状态返回', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=sliding`);
    await page.evaluate(() => {
      const samples: { y: number; at: number; attached: boolean }[] = [];
      Reflect.set(window, 'quickFrames', samples);
      const start = performance.now();
      const sample = () => {
        const element = document.querySelector('.prompt-layer')!;
        samples.push({ y: element.getBoundingClientRect().y, at: performance.now() - start, attached: element.classList.contains('prompt-layer-attached') });
        if (performance.now() - start < 1100) requestAnimationFrame(sample);
        else Reflect.set(window, 'quickFinished', true);
      };
      requestAnimationFrame(sample);
    });
    await page.getByLabel('测试答案').fill('打击报复');
    await page.getByRole('button', { name: '提交合法答案' }).click();
    await page.waitForFunction(() => Reflect.get(window, 'quickFinished'));
    const frames = await page.evaluate(() => Reflect.get(window, 'quickFrames') as { y: number; at: number; attached: boolean }[]);
    const start = frames[0].y;
    const max = Math.max(...frames.map(frame => frame.y));
    expect(max - start).toBeGreaterThan(30);
    expect(frames.filter(frame => frame.y > start + .5 && frame.y < max - .5).length).toBeGreaterThan(5);
    expect(frames.find(frame => frame.y === max)!.at).toBeLessThan(450);
    expect(frames.at(-1)!.y).toBeCloseTo(start, 1);
  } finally { await page.close(); await server.close(); }
});

test('首次部首资源延迟时完整笔画结合完成后才返回', async ({ page }) => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'glyph-network-delay',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url === '/glyphs/51b0.json') setTimeout(next, 450);
        else next();
      });
    },
  }] });
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=radical`);
    await page.evaluate(() => {
      const frames: { at: number; attached: boolean; glyph: boolean; scale: number; alpha: number }[] = [];
      Reflect.set(window, 'delayedGlyphFrames', frames);
      const start = performance.now();
      const sample = () => {
        const root = document.querySelector('.prompt')!;
        const group = root.querySelector('.device-glyph-original .device-glyph-text');
        const supplement = root.querySelector('.prompt-part-character.prompt-supplement');
        frames.push({ at: performance.now() - start, attached: Boolean(root.querySelector('.prompt-layer-attached')), glyph: Boolean(group),
          scale: group ? Number(getComputedStyle(group).opacity) : 0,
          alpha: supplement ? Number(getComputedStyle(supplement).opacity) : 0 });
        if (performance.now() - start < 1800) requestAnimationFrame(sample);
        else Reflect.set(window, 'delayedGlyphFinished', true);
      };
      requestAnimationFrame(sample);
    });
    await page.getByLabel('测试答案').fill('冰凉');
    await page.getByRole('button', { name: '提交合法答案' }).click();
    await page.waitForFunction(() => Reflect.get(window, 'delayedGlyphFinished'));
    const frames = await page.evaluate(() => Reflect.get(window, 'delayedGlyphFrames') as { at: number; attached: boolean; glyph: boolean; scale: number; alpha: number }[]);
    const firstAttached = frames.findIndex(frame => frame.attached);
    const returned = frames.slice(firstAttached).find(frame => !frame.attached)!;
    const firstGlyph = frames.find(frame => frame.glyph)!;
    expect(firstGlyph).toBeTruthy();
    expect(returned.at).toBeGreaterThan(firstGlyph.at);
    expect(frames.some(frame => frame.attached && frame.glyph && frame.scale > .99 && frame.alpha > .99)).toBe(true);
    expect(returned.at - firstGlyph.at).toBeLessThan(300);
    expect(new Set(frames.filter(frame => frame.attached && frame.glyph).map(frame => Math.round(frame.scale * 100))).size).toBeGreaterThan(2);
  } finally { await page.close(); await server.close(); }
});
