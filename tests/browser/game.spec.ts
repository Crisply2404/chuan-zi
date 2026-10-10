import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { WordRules } from '../../shared/rules';
import { settingsSchema } from '../../shared/settings';
import type { DictionaryData, RoomView, ServerMessage } from '../../shared/types';

const data = JSON.parse(readFileSync('data/dictionary.json', 'utf8')) as DictionaryData;
const rules = new WordRules(data);

function observe(page: Page) {
  const state: { room: RoomView | null; errors: string[] } = { room: null, errors: [] };
  page.on('pageerror', error => state.errors.push(error.message));
  page.on('websocket', socket => socket.on('framereceived', ({ payload }) => {
    const message = JSON.parse(String(payload)) as ServerMessage;
    if (message.type === 'state') state.room = message.room;
  }));
  return state;
}

async function connect(page: Page, nickname: string) {
  await page.goto('./');
  await page.getByRole('button', { name: '连接与昵称', exact: true }).click();
  await page.getByLabel('昵称', { exact: true }).fill(nickname);
  await page.getByRole('dialog').getByRole('button', { name: '保存昵称', exact: true }).click();
  await expect(page.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true })).toBeEnabled();
}

async function sampleMotion(page: Page, action: () => Promise<unknown>) {
  await page.evaluate(() => {
    const samples: { y: number; alpha: number; newCellAlpha: number; originConnected: boolean; originScale: number; answerY: number; time: number }[] = [];
    Object.assign(window, { motionSamples: samples, motionFinished: false });
    const started = performance.now();
    const origin = document.querySelector('.prompt-part.prompt-origin');
    const sample = () => {
      const prompt = document.querySelector('.prompt-layer')!;
      const supplement = document.querySelector('.prompt-complete .prompt-supplement');
      const newCell = document.querySelector('.answer-cell:nth-child(2) .answer-cell-surface');
      samples.push({ y: prompt.getBoundingClientRect().y, alpha: supplement ? Number(getComputedStyle(supplement).opacity) : 0,
        newCellAlpha: newCell ? Number(getComputedStyle(newCell).opacity) : 0, originConnected: origin?.isConnected ?? false,
        originScale: origin ? new DOMMatrix(getComputedStyle(origin).transform).m11 : 0,
        answerY: document.querySelector('.answer-cell')!.getBoundingClientRect().y, time: performance.now() - started });
      if (performance.now() - started < 1100) requestAnimationFrame(sample);
      else Object.assign(window, { motionFinished: true });
    };
    requestAnimationFrame(sample);
  });
  await action();
  await page.waitForFunction(() => Reflect.get(window, 'motionFinished'));
  return page.evaluate(() => Reflect.get(window, 'motionSamples') as { y: number; alpha: number; newCellAlpha: number; originConnected: boolean; originScale: number; answerY: number; time: number }[]);
}

async function assertLayout(page: Page) {
  const overflow = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    return { document: document.documentElement.scrollWidth > viewport + 1,
      controls: [...document.querySelectorAll('button,input,select')].filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > viewport + 1);
      }).map(element => element.getAttribute('aria-label') || element.textContent) };
  });
  expect(overflow).toEqual({ document: false, controls: [] });
}

async function assertGameLayout(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const bounds = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const topology = bounds('.player-topology');
    const stage = bounds('.timer-area, .waiting-stage');
    const game = bounds('.game-area');
    const activityElement = document.querySelector('.activity-area');
    const activity = activityElement?.getBoundingClientRect();
    const players = [...document.querySelectorAll('.topology-player')].map(element => element.getBoundingClientRect());
    const failures: unknown[] = [];
    players.forEach((player, index) => {
      if (player.top < game.top - 1 || player.bottom > stage.top + 1) failures.push({ index, player: player.toJSON(), game: game.toJSON(), stage: stage.toJSON() });
    });
    if (topology.bottom > stage.top + 1) failures.push({ topology: topology.toJSON(), stage: stage.toJSON() });
    if (game.bottom > innerHeight || (activity && activity.left < game.right && game.bottom > activity.top + 1)) failures.push({ game: game.toJSON(), activity: activity?.toJSON(), height: innerHeight });
    return failures;
  })).toEqual([]);
}

async function joinReadyPlayers(page: Page, code: string, count: number) {
  await page.evaluate(async ({ code, count }) => {
    for (let index = 0; index < count; index++) {
      const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
      await new Promise<void>((resolve, reject) => {
        socket.addEventListener('open', () => resolve(), { once: true });
        socket.addEventListener('error', () => reject(new Error('玩家连接失败')), { once: true });
      });
      for (const [id, command] of [
        ['hello', { type: 'hello', data: { nickname: '无名' } }],
        ['join', { type: 'joinByCode', data: { code, password: '' } }],
        ['ready', { type: 'ready', data: { ready: true } }],
      ] as const) {
        await new Promise<void>((resolve, reject) => {
          const receive = (event: MessageEvent) => {
            const message = JSON.parse(event.data) as ServerMessage;
            if (message.type !== 'reply' || message.id !== id) return;
            socket.removeEventListener('message', receive);
            if (message.ok) resolve();
            else reject(new Error(message.error));
          };
          socket.addEventListener('message', receive);
          socket.send(JSON.stringify({ ...command, id }));
        });
      }
    }
  }, { code, count });
}

test('自动连接、直接创建、分享链接和真实回合', async ({ browser }) => {
  const desktop = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/', viewport: { width: 1440, height: 1000 } });
  const mobile = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const host = await desktop.newPage();
  const guest = await mobile.newPage();
  const hostState = observe(host);
  const guestState = observe(guest);
  try {
    await connect(host, '电脑玩家');
    await connect(guest, '手机玩家');
    await host.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
    await expect(host.locator('.room-heading h1')).toBeVisible();
    const pinyin = new URL(host.url()).searchParams.get('room')!;
    expect(pinyin).toMatch(/^[a-zü]+(?:-[a-zü]+){3}$/u);
    await guest.goto(`./?room=${pinyin.replaceAll('-', '')}`);
    await expect(guest.locator('.room-heading h1')).toBeVisible();
    await expect.poll(() => new URL(guest.url()).searchParams.get('room')).toBe(pinyin);
    expect(await guest.getByText(/房间号|房间词|拼音/).count()).toBe(0);
    await assertLayout(host);
    await assertLayout(guest);

    await host.getByRole('tab', { name: '规则设置', exact: true }).click();
    await host.getByRole('button', { name: '自定义', exact: true }).click();
    await host.getByRole('button', { name: '预览提示', exact: true }).click();
    await expect(host.getByLabel('当前提示')).toBeVisible();
    const download = host.waitForEvent('download');
    await host.getByRole('button', { name: '导出规则', exact: true }).click();
    const ruleFile = await download;
    expect(ruleFile.suggestedFilename()).toBe('chuan-zi-rule.json');
    const exported = JSON.parse(readFileSync((await ruleFile.path())!, 'utf8'));
    expect(Object.keys(exported)).toEqual(['version', 'settings']);
    expect(exported.version).toBe(1);
    expect(settingsSchema.parse(exported.settings)).toEqual({ ...hostState.room!.settings, mode: 'custom' });
    await host.getByRole('button', { name: '保存规则', exact: true }).click();
    await expect(host.locator('.mode-card')).toHaveCount(5);
    await expect(host.getByRole('button', { name: '预览提示', exact: true })).toHaveCount(0);
    await expect(host.getByRole('group', { name: '声母', exact: true })).toHaveCount(0);
    await host.getByRole('tab', { name: '游戏', exact: true }).click();
    await host.getByRole('button', { name: '准备', exact: true }).click();
    await guest.getByRole('button', { name: '准备', exact: true }).click();
    await host.getByRole('button', { name: '开始比赛', exact: true }).click();
    await expect(host.getByLabel('当前提示')).toBeVisible();
    await expect(host.getByLabel('输入答案')).toHaveCount(1);
    await expect.poll(() => hostState.room?.settings.maxLength).toBeGreaterThan(0);
    expect(await host.locator('.prompt-cell').count()).toBe(hostState.room!.settings.promptLength);
    await expect(host.locator('.answer-cell')).toHaveCount(1);
    await expect(host.locator('.answer-cell-empty')).toHaveCount(1);
    const current = hostState.room!.currentPlayerId;
    const active = current === hostState.room!.players.find(player => player.nickname === '电脑玩家')?.id ? host : guest;
    const state = hostState.room!;
    const answer = data.words.find(entry => {
      const match = rules.match(entry.word, state.prompt!, state.settings);
      return match.valid && match.offset! > 0;
    })!.word;
    const offset = rules.match(answer, state.prompt!, state.settings).offset!;
    const mergeFrames = await sampleMotion(active, () => active.getByLabel('输入答案').fill(answer));
    expect(new Set(mergeFrames.map(frame => Math.round(frame.y))).size).toBeGreaterThan(5);
    expect(mergeFrames.some(frame => frame.alpha > 0 && frame.alpha < 1)).toBe(true);
    expect(mergeFrames.some(frame => frame.newCellAlpha > 0 && frame.newCellAlpha < 1)).toBe(true);
    expect(mergeFrames.every(frame => frame.originConnected)).toBe(true);
    expect(new Set(mergeFrames.map(frame => frame.originScale.toFixed(3))).size).toBeGreaterThan(5);
    expect(new Set(mergeFrames.map(frame => Math.round(frame.answerY))).size).toBeGreaterThan(5);
    const motionStart = mergeFrames.findIndex(frame => frame.y - mergeFrames[0].y > .3);
    const motionFrames = mergeFrames.slice(motionStart);
    const firstMotion = motionFrames[0];
    const earlyMotion = motionFrames.find(frame => frame.time - firstMotion.time >= 180)!;
    const lateMotion = motionFrames.find(frame => frame.time - firstMotion.time >= 550)!;
    expect(earlyMotion.y - firstMotion.y).toBeGreaterThan((lateMotion.y - firstMotion.y) * .65);
    await expect(active.locator('.answer-cells')).toBeVisible();
    await expect(active.locator('.prompt-layer-attached')).toBeVisible();
    await expect(active.locator('.prompt-origin').first()).toHaveCSS('color', 'rgb(34, 34, 34)');
    await expect(active.locator('.prompt-supplement').first()).toHaveCSS('color', 'rgb(255, 173, 50)');
    for (const [index, cell] of state.prompt!.cells.entries()) {
      if (cell.tone !== undefined) await expect(active.locator('.prompt-cell').nth(index).locator('.prompt-part-tone')).toHaveCSS('color', 'rgb(34, 34, 34)');
    }
    await expect.poll(() => active.locator('.prompt-cell').evaluateAll(elements => elements.every(element => {
      const tone = element.querySelector('.prompt-part-tone')!.getBoundingClientRect();
      const target = element.querySelector('.prompt-complete-layout [data-field="tone"]')!.getBoundingClientRect();
      return Math.abs(tone.x - target.x) < 1 && Math.abs(tone.y - target.y) < 1;
    }))).toBe(true);
    await expect.poll(() => active.locator('.answer-editor').evaluate(element => new DOMMatrix(getComputedStyle(element).transform).m42)).toBeLessThan(-20);
    const answerTransforms = await active.locator('.answer-cell').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().y));
    expect(Math.max(...answerTransforms) - Math.min(...answerTransforms)).toBeLessThan(1);
    await expect.poll(async () => active.locator('.prompt-cell').evaluateAll((elements, start) => {
      const answerCells = [...document.querySelectorAll('.answer-cell')];
      return elements.every((element, index) => {
        const prompt = element.getBoundingClientRect();
        const answer = answerCells[start + index].getBoundingClientRect();
        return Math.abs(prompt.x - answer.x) < 1 && Math.abs(prompt.y - answer.y) < 1 && Math.abs(prompt.width - answer.width) < 1;
      });
    }, offset)).toBe(true);
    await active.getByLabel('输入答案').press('ControlOrMeta+A');
    const returnFrames = await sampleMotion(active, () => active.getByLabel('输入答案').press('Backspace'));
    expect(new Set(returnFrames.map(frame => Math.round(frame.y))).size).toBeGreaterThan(5);
    expect(returnFrames.some(frame => frame.alpha > 0 && frame.alpha < 1)).toBe(true);
    await expect(active.locator('.prompt-layer-attached')).toHaveCount(0);
    await expect(active.locator('.answer-cell')).toHaveCount(1);
    await expect.poll(async () => {
      const prompt = (await active.locator('.prompt-layer').boundingBox())!;
      const answer = (await active.locator('.answer-cell').boundingBox())!;
      return prompt.y + prompt.height < answer.y && Math.abs(prompt.x + prompt.width / 2 - answer.x - answer.width / 2) < 1;
    }).toBe(true);
    await active.getByLabel('输入答案').fill(answer);
    await expect(active.locator('.prompt-layer-attached')).toBeVisible();
    await active.getByRole('button', { name: '提交答案', exact: true }).click();
    await expect.poll(() => hostState.room?.history.length).toBe(1);
    await expect.poll(() => guestState.room?.history.length).toBe(1);
    expect(hostState.errors).toEqual([]);
    expect(guestState.errors).toEqual([]);
  } finally {
    await desktop.close();
    await mobile.close();
  }
});

test('隐藏房间通过分享链接输入密码加入', async ({ browser }) => {
  const hostContext = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/' });
  const guestContext = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/' });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  try {
    await connect(host, '房主');
    await host.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
    await expect(host.locator('.room-heading h1')).toBeVisible();
    const pinyin = new URL(host.url()).searchParams.get('room')!;
    expect(pinyin).toMatch(/^[a-zü]+(?:-[a-zü]+){3}$/u);
    await host.getByRole('button', { name: '修改房间名称', exact: true }).click();
    await host.getByLabel('房间名称', { exact: true }).fill('隐藏测试房间');
    await host.getByLabel('房间密码', { exact: true }).fill('test-password');
    await host.getByLabel('在大厅展示').uncheck();
    await host.getByRole('dialog').getByRole('button', { name: '保存房间设置', exact: true }).click();
    await connect(guest, '加入者');
    await guest.goto(`./?room=${pinyin}`);
    await expect(guest.getByRole('dialog')).toBeVisible();
    await guest.getByLabel('房间密码', { exact: true }).fill('test-password');
    await guest.getByRole('dialog').getByRole('button', { name: '加入房间', exact: true }).click();
    await expect(guest.getByRole('heading', { name: '隐藏测试房间' })).toBeVisible();
    await expect(guest.getByText(/房间号|房间词|拼音/)).toHaveCount(0);
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});

test('组合提示附着后保留部首与字形部件', async ({ browser }) => {
  const hostContext = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/' });
  const guestContext = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/' });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const state = observe(host);
  try {
    await connect(host, '组合房主');
    await host.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
    await expect(host.locator('.room-heading h1')).toBeVisible();
    await guest.goto(host.url());
    await expect(guest.locator('.room-heading h1')).toBeVisible();
    await host.getByRole('tab', { name: '规则设置', exact: true }).click();
    await host.getByRole('button', { name: '自定义', exact: true }).click();
    for (const label of ['声母', '声调']) await host.getByRole('group', { name: label, exact: true }).getByRole('button', { name: '关闭', exact: true }).click();
    for (const label of ['部首', '字形部件']) await host.getByRole('group', { name: label, exact: true }).getByRole('button', { name: '必选', exact: true }).click();
    await host.getByLabel('部首与字形部件关系', { exact: true }).selectOption('same');
    await host.getByLabel('提示位置数量', { exact: true }).fill('1');
    await host.getByLabel('可用答案下限', { exact: true }).fill('1');
    await host.getByRole('button', { name: '保存规则', exact: true }).click();
    await expect.poll(() => state.room?.settings.appearance.component).toBe('required');
    await host.getByRole('tab', { name: '游戏', exact: true }).click();
    await host.getByRole('button', { name: '准备', exact: true }).click();
    await guest.getByRole('button', { name: '准备', exact: true }).click();
    await host.getByRole('button', { name: '开始比赛', exact: true }).click();
    await expect(host.getByLabel('当前提示')).toBeVisible();
    const room = state.room!;
    const cell = room.prompt!.cells[0];
    expect(cell.radical).toBeTruthy();
    expect(cell.component).toBeTruthy();
    const answer = data.words.find(entry => rules.match(entry.word, room.prompt!, room.settings).valid)!.word;
    const active = room.players.find(player => player.id === room.currentPlayerId)!.nickname === '组合房主' ? host : guest;
    await active.getByLabel('输入答案', { exact: true }).fill(answer);
    await expect(active.locator('.prompt-layer-attached')).toBeVisible();
    await expect(active.locator('.prompt-part-radical')).toHaveText(cell.radical!);
    await expect(active.locator('.prompt-part-component')).toHaveText(cell.component!);
    await expect(active.locator('.prompt-part-radical')).toHaveCSS('color', 'rgb(34, 34, 34)');
    expect(state.errors).toEqual([]);
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});

test('五个模式入口和移动端页面保持可用', async ({ page }) => {
  const state = observe(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await connect(page, '小屏玩家');
  await expect(page.getByLabel('联机服务地址')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '加入房间', exact: true })).toHaveCount(0);
  await page.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
  await page.getByRole('tab', { name: '规则设置', exact: true }).click();
  await expect(page.locator('.mode-card')).toHaveCount(5);
  for (const label of ['声母+音调', '部首', '字', '只有音调', '自定义']) await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  await expect(page.locator('.mode-icon')).toHaveCount(5);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    const modes = await page.locator('.mode-card').evaluateAll(elements => elements.map(element => {
      const bounds = element.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
        color: getComputedStyle(element.querySelector('.mode-icon')!).color };
    }));
    expect(modes.map(mode => mode.color)).toEqual(['rgb(155, 61, 53)', 'rgb(53, 99, 95)', 'rgb(88, 112, 68)', 'rgb(76, 95, 122)', 'rgb(115, 93, 115)']);
    for (const [index, mode] of modes.entries()) {
      expect(mode.x).toBe(modes[0].x);
      expect(mode.width).toBe(modes[0].width);
      expect(mode.height).toBeGreaterThanOrEqual(64);
      if (index > 0) expect(mode.y).toBeGreaterThanOrEqual(modes[index - 1].y + modes[index - 1].height);
    }
    await assertLayout(page);
  }
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole('button', { name: '声母+音调', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '部首', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => state.room?.settings.mode).toBe('radical');
  await expect(page.getByRole('button', { name: '部首', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const [label, mode] of [['部首', 'radical'], ['字', 'character'], ['只有音调', 'tone-only'], ['声母+音调', 'initial-tone']]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect.poll(() => state.room?.settings.mode).toBe(mode);
    await expect(page.getByRole('button', { name: '保存规则', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '预览提示', exact: true })).toHaveCount(0);
  }
  await page.getByRole('button', { name: '自定义', exact: true }).click();
  await expect(page.getByRole('group', { name: '声母', exact: true })).toBeVisible();
  await assertLayout(page);
});

test('原生 IME 组合文本保持可编辑，确认汉字后更新答案', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/' });
  const guestContext = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/' });
  const host = await context.newPage();
  const guest = await guestContext.newPage();
  const state = observe(host);
  try {
    await connect(host, '输入房主');
    await host.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
    await expect(host.locator('.room-heading h1')).toBeVisible();
    await guest.goto(host.url());
    await expect(guest.locator('.room-heading h1')).toBeVisible();
    await host.getByRole('button', { name: '准备', exact: true }).click();
    await guest.getByRole('button', { name: '准备', exact: true }).click();
    await host.getByRole('button', { name: '开始比赛', exact: true }).click();
    await expect.poll(() => state.room?.currentPlayerId).toBeTruthy();
    const active = state.room!.players.find(player => player.id === state.room!.currentPlayerId)!.nickname === '输入房主' ? host : guest;
    const input = active.getByLabel('输入答案', { exact: true });
    await expect(active.locator('.answer-cell')).toHaveCount(1);
    const initialCell = await active.locator('.answer-cell').boundingBox();
    expect(Math.abs(initialCell!.width - initialCell!.height)).toBeLessThan(1);
    await input.focus();
    const cdp = await active.context().newCDPSession(active);
    await cdp.send('Input.imeSetComposition', { text: 'da', selectionStart: 2, selectionEnd: 2 });
    await expect(input).toHaveValue('da', { timeout: 1000 });
    await expect(active.locator('.answer-character')).toHaveCount(0);
    await cdp.send('Input.imeSetComposition', { text: "da'ji", selectionStart: 5, selectionEnd: 5 });
    await expect(input).toHaveValue("da'ji");
    await cdp.send('Input.insertText', { text: '打击报复' });
    await expect(input).toHaveValue('打击报复');
    await expect(active.locator('.answer-character')).toHaveText(['打', '击', '报', '复']);
    await expect(active.locator('.answer-cell')).toHaveCount(5);
    await expect(active.locator('.answer-cell-empty')).toHaveCount(1);
    expect(await active.locator('.answer-cell-surface').nth(4).evaluate(element => getComputedStyle(element).animationName)).toBe('cell-appear');
    await active.locator('.answer-cell').nth(1).click();
    expect(await input.evaluate((element: HTMLInputElement) => element.selectionStart)).toBe(2);
    await input.click();
    expect(await input.evaluate((element: HTMLInputElement) => element.selectionStart)).toBe(3);
    await active.locator('.answer-cell').nth(1).click();
    expect(await input.evaluate((element: HTMLInputElement) => element.selectionStart)).toBe(2);
    await input.press('Backspace');
    await expect(input).toHaveValue('打报复');
    await cdp.send('Input.insertText', { text: '击' });
    await expect(input).toHaveValue('打击报复');
    await input.press('ArrowLeft');
    await input.press('Backspace');
    await expect(input).toHaveValue('击报复');
    await input.fill('天地玄黄宇宙洪荒日月');
    await expect(input).toHaveValue('天地玄黄宇宙洪荒日');
    await expect(active.locator('.answer-cell')).toHaveCount(9);
    await expect(active.locator('.answer-cell-empty')).toHaveCount(0);
    await input.fill('打abc;123击');
    await expect(input).toHaveValue('打击');
    await expect(active.locator('.answer-character')).toHaveText(['打', '击']);
    expect(state.errors).toEqual([]);
  } finally {
    await context.close();
    await guestContext.close();
  }
});

test('桌面与手机的双人准备和比赛无需页面滚动', async ({ browser }) => {
  for (const viewport of [{ width: 1440, height: 800 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
    const context = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/', viewport });
    const page = await context.newPage();
    try {
      await connect(page, '布局玩家');
      await page.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
      await expect(page.getByRole('button', { name: '添加电脑', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '添加电脑', exact: true }).click();
      await expect(page.locator('.topology-player')).toHaveCount(2);
      const players = await page.locator('.topology-player').evaluateAll(elements => elements.map(element => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      }));
      expect(Math.abs(players[0].y - players[1].y)).toBeLessThan(1);
      expect(players[0].x).toBeLessThan(players[1].x);
      await expect(page.locator('.game-area .drum-mark')).toHaveCount(1);
      await expect(page.locator('.topology-arrow, .topology-heading, .room-meta')).toHaveCount(0);
      await expect(page.locator('.game-area')).not.toContainText('位玩家');
      await page.getByRole('button', { name: '准备', exact: true }).click();
      const start = page.getByRole('button', { name: '开始比赛', exact: true });
      expect((await start.boundingBox())!.y + (await start.boundingBox())!.height).toBeLessThan(viewport.height);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
      await assertGameLayout(page);
      await start.click();
      await expect(page.getByLabel('当前提示')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
      await assertLayout(page);
      await assertGameLayout(page);
    } finally { await context.close(); }
  }
});

test('过期身份自动恢复大厅且不显示成功通知', async ({ page }) => {
  await connect(page, '重连玩家');
  await page.evaluate(() => {
    const key = Object.keys(sessionStorage).find(key => key.startsWith('chuan-zi:token:'))!;
    sessionStorage.setItem(key, 'expired-session');
  });
  await page.reload();
  await expect(page.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true })).toBeEnabled();
  await expect(page.locator('.notice-banner')).toHaveCount(0);
});

test('窄窗口活动面板默认收起，房间设置与局数在各宽度可用', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = observe(page);
  await connect(page, '活动玩家');
  await expect(page.getByRole('button', { name: '数据与许可', exact: true })).toBeVisible();
  await page.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
  await expect(page.locator('.site-footer')).toHaveCount(0);
  await expect(page.getByLabel('比赛局数')).toHaveText('第 1 局 / 3 局');
  await expect(page.getByRole('button', { name: '查看答案记录与聊天', exact: true })).toBeVisible();
  await expect(page.locator('.history-list')).toBeHidden();
  await page.getByRole('button', { name: '查看答案记录与聊天', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '答案记录与聊天', exact: true })).toBeVisible();
  const panel = (await page.getByRole('dialog', { name: '答案记录与聊天', exact: true }).boundingBox())!;
  expect(panel.height).toBeGreaterThan(300);
  await expect(page.getByRole('tab', { name: '答案记录', exact: false })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: '关闭记录与聊天', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tab', { name: '答案记录', exact: false })).toBeFocused();
  await page.getByRole('tab', { name: '聊天', exact: true }).click();
  await page.getByLabel('聊天消息', { exact: true }).fill('这条消息保持清楚可读');
  await page.getByRole('button', { name: '发送消息', exact: true }).click();
  await expect(page.locator('.chat-message p')).toHaveText('这条消息保持清楚可读');
  await page.getByRole('button', { name: '关闭记录与聊天', exact: true }).click();
  await page.getByRole('tab', { name: '规则设置', exact: true }).click();
  await page.getByRole('checkbox', { name: '在大厅展示', exact: true }).click();
  await expect.poll(() => state.room?.listed).toBe(false);
  await page.setViewportSize({ width: 1440, height: 800 });
  await expect(page.getByRole('checkbox', { name: '在大厅展示', exact: true })).toBeVisible();
  await expect(page.locator('.settings-room-info')).toHaveCount(0);
  await page.getByRole('tab', { name: '游戏', exact: true }).click();
  await expect(page.locator('.history-list')).toBeVisible();
  const height = await page.getByRole('tab', { name: '聊天', exact: true }).evaluate(element => element.getBoundingClientRect().height);
  expect(height).toBeGreaterThanOrEqual(44);
  await assertLayout(page);
});

for (const playerCount of [8, 16]) test(`${playerCount} 人玩家图和头像管理菜单保持可用`, async ({ browser }) => {
  const hostContext = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/', viewport: { width: 320, height: 640 } });
  try {
    const host = await hostContext.newPage();
    await connect(host, '多人房主');
    await host.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
    await expect(host.locator('.room-heading h1')).toBeVisible();
    const code = new URL(host.url()).searchParams.get('room')!;
    await host.getByRole('button', { name: '添加电脑', exact: true }).click();
    await host.getByRole('button', { name: '电脑，玩家管理', exact: true }).click();
    await host.getByRole('button', { name: '移除电脑', exact: true }).click();
    await expect(host.getByRole('button', { name: '添加电脑', exact: true })).toBeVisible();
    if (playerCount > 8) {
      await host.getByRole('tab', { name: '规则设置', exact: true }).click();
      await host.getByRole('button', { name: '自定义', exact: true }).click();
      await host.getByLabel('人数上限', { exact: true }).fill(String(playerCount));
      await host.getByRole('button', { name: '保存规则', exact: true }).click();
      await host.getByRole('tab', { name: '游戏', exact: true }).click();
    }
    await joinReadyPlayers(host, code, playerCount - 1);
    await expect(host.locator('.topology-player')).toHaveCount(playerCount);
    await expect.poll(() => host.locator('.topology-player').evaluateAll(elements => {
      const avatars = elements.map(element => element.getBoundingClientRect());
      return avatars.flatMap((avatar, index) => avatars.flatMap((other, otherIndex) => index < otherIndex &&
        avatar.right > other.left && other.right > avatar.left && avatar.bottom > other.top && other.bottom > avatar.top
        ? [[index, otherIndex]] : []));
    })).toEqual([]);
    expect(await host.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    await assertLayout(host);
    await assertGameLayout(host);
    await host.getByRole('button', { name: '无名，玩家管理', exact: true }).first().click();
    await expect(host.getByRole('button', { name: '移除 无名', exact: true })).toBeVisible();
    await host.getByRole('button', { name: '移除 无名', exact: true }).click();
    await expect(host.locator('.topology-player')).toHaveCount(playerCount - 1);
    await joinReadyPlayers(host, code, 1);
    await expect(host.locator('.topology-player')).toHaveCount(playerCount);
    await host.getByRole('button', { name: '准备', exact: true }).click();
    await host.getByRole('button', { name: '开始比赛', exact: true }).click();
    await expect(host.getByLabel('当前提示')).toBeVisible();
    expect(await host.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    await assertLayout(host);
    await assertGameLayout(host);
  } finally { await hostContext.close(); }
});
