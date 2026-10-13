import {readFileSync} from 'node:fs';
import type {AddressInfo} from 'node:net';
import {createServer} from 'vite';
import {test, expect, type Page} from '@playwright/test';
import {WordRules} from '../../shared/rules';
import {createGameServer} from '../../server/game-server';
import {defaultSettings, type DictionaryData, type RoomView, type ServerMessage} from '../../shared/types';

const rules = new WordRules(JSON.parse(readFileSync('data/dictionary.json', 'utf8')) as DictionaryData);

function observe(page: Page) {
  const state: {room: RoomView | null; errors: string[]} = {room: null, errors: []};
  page.on('pageerror', error => state.errors.push(error.message));
  page.on('websocket', socket => socket.on('framereceived', ({payload}) => {
    const message = JSON.parse(String(payload)) as ServerMessage;
    if (message.type === 'state') state.room = message.room;
  }));
  return state;
}

test('箭头目标按人数等分，字体与窗口尺寸变化后保持相同方向', async ({browser}) => {
  const contexts = await Promise.all(Array.from({length: 3}, () => browser.newContext({baseURL: 'http://localhost:4173/chuan-zi/'})));
  try {
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    const host = pages[0];
    const state = observe(host);
    await host.goto('./');
    await host.locator('.page-heading').getByRole('button', {name: '创建房间', exact: true}).click();
    await expect(host.locator('.room-heading h1')).toBeVisible();
    await pages[1].goto(host.url());
    await expect(host.locator('.topology-player')).toHaveCount(2);
    for (const page of pages.slice(0, 2)) await page.getByRole('button', {name: '准备', exact: true}).click();
    await host.getByRole('button', {name: '开始比赛', exact: true}).click();
    const assertAngles = async () => {
      await expect.poll(() => host.locator('.drum-hand-current').evaluate(element => {
        const players = [...document.querySelectorAll('.topology-player')];
        const index = players.findIndex(player => player.getAttribute('data-player-id') === element.getAttribute('data-player-id'));
        const expected = (players.length === 2 ? Math.PI : -Math.PI / 2) + index * Math.PI * 2 / players.length;
        const matrix = new DOMMatrix(getComputedStyle(element).transform);
        return Math.abs(Math.atan2(Math.sin(Math.atan2(matrix.b, matrix.a) - expected), Math.cos(Math.atan2(matrix.b, matrix.a) - expected)));
      })).toBeLessThan(.001);
    };
    await assertAngles();
    await host.addStyleTag({content: '.topology-player{align-items:flex-start}.topology-avatar{margin-left:13px;width:56px;height:56px}'});
    await host.setViewportSize({width: 390, height: 844});
    await assertAngles();
    await pages[2].goto(host.url());
    await expect(host.locator('.topology-player')).toHaveCount(3);
    await assertAngles();
    const answer = rules.examples(state.room!.prompt!, state.room!.settings, new Set(), 1)[0];
    await host.getByLabel('输入答案').fill(answer.word);
    await host.getByRole('button', {name: '提交答案', exact: true}).click();
    await assertAngles();
    await expect.poll(() => host.locator('.drum-hand-previous').evaluate(element => {
      const players = [...document.querySelectorAll('.topology-player')];
      const index = players.findIndex(player => player.getAttribute('data-player-id') === element.getAttribute('data-player-id'));
      const expected = -Math.PI / 2 + index * Math.PI * 2 / players.length;
      const matrix = new DOMMatrix(getComputedStyle(element).transform);
      return Math.abs(Math.atan2(Math.sin(Math.atan2(matrix.b, matrix.a) - expected), Math.cos(Math.atan2(matrix.b, matrix.a) - expected)));
    })).toBeLessThan(.001);
    expect(state.errors).toEqual([]);
  } finally { for (const context of contexts) await context.close(); }
});

test('完整轻声拼音显示字母且保持原声母提示', async ({page}) => {
  const server = await createServer({server: {host: '127.0.0.1', port: 0}});
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=neutral`);
    await expect(page.locator('.prompt-part-initial')).toHaveText('d');
    await page.getByLabel('测试答案').fill('使得');
    await expect(page.locator('.prompt-layer-attached')).toBeVisible();
    await expect(page.locator('.prompt-part-tone')).toHaveCount(0);
    await expect(page.locator('.prompt-part-initial')).toHaveText('d');
    await expect(page.locator('.prompt-part-final')).toHaveText('e');
  } finally { await server.close(); }
});

test('全部提示条件组合保持每个格子内的字形与拼音', async ({page}) => {
  const server = await createServer({server: {host: '127.0.0.1', port: 0}});
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({width, height: 900});
      await page.goto(`http://127.0.0.1:${address.port}/tests/browser/prompt-harness.html?case=all`);
      const assertBounds = async () => {
        await expect.poll(() => page.locator('.prompt-cell').evaluateAll(cells => cells.flatMap(cell => {
          const bounds = cell.getBoundingClientRect();
          return [...cell.querySelectorAll<HTMLElement>('.prompt-origin')].filter(part => Number(getComputedStyle(part).opacity) > .9).filter(part => {
            const rect = part.getBoundingClientRect();
            return rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1;
          }).map(part => part.dataset.field);
        })), {timeout: 1500}).toEqual([]);
      };
      await assertBounds();
      await page.getByLabel('测试答案').fill('抓饼');
      await expect(page.locator('.prompt-layer-attached')).toBeVisible();
      await assertBounds();
    }
  } finally { await server.close(); }
});

test('空大厅与底栏只保留底栏分隔线', async ({page}) => {
  const service = await createGameServer({port: 0, host: '127.0.0.1'});
  const server = await createServer({server: {host: '127.0.0.1', port: 0}, define: {'import.meta.env.VITE_WS_URL': JSON.stringify(service.address)}});
  await server.listen();
  const address = server.httpServer!.address() as AddressInfo;
  try {
    await page.goto(`http://127.0.0.1:${address.port}/`);
    await expect(page.locator('.empty-lobby')).toBeVisible();
    await expect(page.locator('.empty-lobby')).toHaveCSS('border-bottom-width', '0px');
    await expect(page.locator('.site-footer')).toHaveCSS('border-top-width', '1px');
  } finally { await server.close(); await service.close(); }
});

test('手机可见高度缩小时仍能看见提示与全部答案格', async ({browser}) => {
  const context = await browser.newContext({baseURL: 'http://localhost:4173/chuan-zi/', viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  try {
    const page = await context.newPage();
    await page.goto('./');
    await page.locator('.page-heading').getByRole('button', {name: '创建房间', exact: true}).click();
    await expect(page.locator('.room-heading h1')).toBeVisible();
    await page.getByRole('button', {name: '添加电脑', exact: true}).click();
    await page.getByRole('button', {name: '准备', exact: true}).click();
    await page.getByRole('button', {name: '开始比赛', exact: true}).click();
    await page.setViewportSize({width: 390, height: 400});
    await page.getByLabel('输入答案').tap();
    await page.getByLabel('输入答案').fill('不置可否');
    await expect.poll(() => page.locator('.answer-form').evaluate(element => {
      const viewport = window.visualViewport!;
      const parts = [...element.querySelectorAll('.prompt-cell,.answer-cell')].map(part => part.getBoundingClientRect());
      return parts.every(rect => rect.top >= viewport.offsetTop && rect.bottom <= viewport.offsetTop + viewport.height);
    })).toBe(true);
    await expect(page.getByLabel('输入答案')).toBeFocused();
  } finally { await context.close(); }
});

test('逐格编辑保存无声母和星号，并按成语最短长度显示四格', async ({page}) => {
  const state = observe(page);
  await page.goto('./');
  await page.locator('.page-heading').getByRole('button', {name: '创建房间', exact: true}).click();
  await expect(page.locator('.room-heading h1')).toBeVisible();
  await page.getByRole('tab', {name: '规则设置', exact: true}).click();
  await page.getByRole('button', {name: '自定义', exact: true}).click();
  await page.getByRole('group', {name: '答案词库', exact: true}).getByRole('button', {name: '成语', exact: true}).click();
  await expect(page.locator('.slot-card')).toHaveCount(4);
  await page.getByRole('button', {name: '提示格 1', exact: true}).click();
  await page.getByRole('group', {name: '声母', exact: true}).getByRole('button', {name: '无声母', exact: true}).click();
  await page.getByLabel('声调', {exact: true}).check();
  for (const index of [2, 3, 4]) {
    await page.getByRole('button', {name: `提示格 ${index}`, exact: true}).click();
    await page.getByRole('group', {name: '声母', exact: true}).getByRole('button', {name: '不限', exact: true}).click();
    await page.getByLabel('声调', {exact: true}).uncheck();
  }
  await page.getByRole('button', {name: '预览提示', exact: true}).click();
  await expect(page.locator('.preview-area .prompt-cell')).toHaveCount(4);
  await expect(page.locator('.preview-area .prompt-unrestricted')).toHaveText(['*', '*', '*']);
  await page.getByRole('button', {name: '保存规则', exact: true}).click();
  await expect.poll(() => state.room?.settings.promptSlots?.[0].initial).toBe('absent');
  expect(state.room!.settings.minLength).toBe(4);
  await page.getByRole('button', {name: '自定义', exact: true}).click();
  await page.getByRole('button', {name: '删除提示格 4', exact: true}).click();
  await page.getByRole('button', {name: '删除提示格 3', exact: true}).click();
  await page.getByRole('button', {name: '保存规则', exact: true}).click();
  await expect.poll(() => state.room?.settings.promptLength).toBe(2);
  await page.getByRole('tab', {name: '游戏', exact: true}).click();
  await page.getByRole('button', {name: '添加电脑', exact: true}).click();
  await page.getByRole('button', {name: '准备', exact: true}).click();
  await page.getByRole('button', {name: '开始比赛', exact: true}).click();
  await expect(page.locator('.answer-length-hint')).toHaveText('答案最短为 4 个字');
  await expect(page.locator('.answer-form .prompt-cell')).toHaveCount(2);
  expect(state.errors).toEqual([]);
});

test('奖励开关显示候选，个人目标为五个，并可在多人房间添加电脑', async ({browser}) => {
  const context = await browser.newContext({baseURL: 'http://localhost:4173/chuan-zi/'});
  const other = await browser.newContext({baseURL: 'http://localhost:4173/chuan-zi/'});
  try {
    const page = await context.newPage(); const guest = await other.newPage();
    const state = observe(page);
    await page.goto('./');
    await page.locator('.page-heading').getByRole('button', {name: '创建房间', exact: true}).click();
    await expect(page.locator('.room-heading h1')).toBeVisible();
    await guest.goto(page.url());
    await expect(page.locator('.topology-player')).toHaveCount(2);
    await expect(page.getByRole('button', {name: '添加电脑', exact: true})).toBeVisible();
    await page.getByRole('tab', {name: '规则设置', exact: true}).click();
    await page.getByRole('button', {name: '自定义', exact: true}).click();
    await page.getByLabel('奖励生命', {exact: true}).uncheck();
    await expect(page.locator('.initial-grid')).toHaveCount(0);
    await page.getByLabel('奖励生命', {exact: true}).check();
    await expect(page.locator('.initial-grid input')).toHaveCount(34);
    await page.getByRole('button', {name: '保存规则', exact: true}).click();
    await page.getByRole('tab', {name: '游戏', exact: true}).click();
    await page.getByRole('button', {name: '添加电脑', exact: true}).click();
    await expect(page.locator('.topology-player')).toHaveCount(3);
    await page.getByRole('button', {name: '准备', exact: true}).click();
    await guest.getByRole('button', {name: '准备', exact: true}).click();
    await page.getByRole('button', {name: '开始比赛', exact: true}).click();
    await expect(page.locator('.bonus-letters > span')).toHaveCount(5);
    expect(new Set(state.room!.players[0].bonusTargets).size).toBe(5);
    expect(state.errors).toEqual([]);
  } finally { await context.close(); await other.close(); }
});

test('自定义奖励只显示未使用类型，全部使用时关闭奖励', async ({browser}) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto('./');
    await page.locator('.page-heading').getByRole('button', {name: '创建房间', exact: true}).click();
    await page.getByRole('tab', {name: '规则设置', exact: true}).click();
    await page.getByRole('button', {name: '自定义', exact: true}).click();
    await expect(page.getByRole('button', {name: '奖励韵母', exact: true})).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', {name: '奖励声母', exact: true})).toHaveCount(0);
    await page.getByRole('group', {name: '韵母', exact: true}).getByRole('button', {name: '提示', exact: true}).click();
    await expect(page.getByRole('button', {name: '奖励部首', exact: true})).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', {name: '奖励韵母', exact: true})).toHaveCount(0);
    await page.getByLabel('第 1 格条件', {exact: true}).getByLabel('部首', {exact: true}).check();
    await expect(page.getByLabel('奖励生命', {exact: true})).toBeDisabled();
    await expect(page.getByLabel('奖励生命', {exact: true})).not.toBeChecked();
    await expect(page.getByText('所有奖励类型已用于提示，奖励已关闭。', {exact: true})).toBeVisible();
    await page.getByRole('group', {name: '声母', exact: true}).getByRole('button', {name: '不限', exact: true}).click();
    await page.getByRole('button', {name: '提示格 2', exact: true}).click();
    await page.getByRole('group', {name: '声母', exact: true}).getByRole('button', {name: '不限', exact: true}).click();
    await expect(page.getByRole('button', {name: '奖励声母', exact: true})).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('group', {name: '奖励类型', exact: true}).getByRole('button')).toHaveCount(1);
  } finally {await context.close();}
});
