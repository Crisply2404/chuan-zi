import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { WordRules } from '../../shared/rules';
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
    const token = new URL(host.url()).searchParams.get('room');
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    await guest.goto(`./?room=${token}`);
    await expect(guest.locator('.room-heading h1')).toBeVisible();
    expect(await guest.getByText(/房间号|房间词|拼音/).count()).toBe(0);
    await assertLayout(host);
    await assertLayout(guest);

    await host.getByRole('tab', { name: '规则设置', exact: true }).click();
    await host.getByRole('button', { name: '自定义', exact: true }).click();
    await host.getByRole('button', { name: '预览提示', exact: true }).click();
    await expect(host.getByLabel('当前提示')).toBeVisible();
    const download = host.waitForEvent('download');
    await host.getByRole('button', { name: '导出规则', exact: true }).click();
    expect((await download).suggestedFilename()).toBe('chuan-zi-rule.json');
    await host.getByRole('tab', { name: '游戏', exact: true }).click();
    await host.getByRole('button', { name: '准备', exact: true }).click();
    await guest.getByRole('button', { name: '准备', exact: true }).click();
    await host.getByRole('button', { name: '开始比赛', exact: true }).click();
    await expect(host.getByLabel('当前提示')).toBeVisible();
    await expect(host.getByLabel('输入答案')).toHaveCount(1);
    await expect.poll(() => hostState.room?.settings.maxLength).toBeGreaterThan(0);
    expect(await host.locator('.prompt-cell').count()).toBe(hostState.room!.settings.promptLength);
    expect(await host.locator('.answer-cells').count()).toBe(0);
    const current = hostState.room!.currentPlayerId;
    const active = current === hostState.room!.players.find(player => player.nickname === '电脑玩家')?.id ? host : guest;
    const state = hostState.room!;
    const answer = data.words.find(entry => rules.match(entry.word, state.prompt!, state.settings).valid)!.word;
    await active.getByLabel('输入答案').fill(answer);
    await expect(active.locator('.answer-cells')).toBeVisible();
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
    const token = new URL(host.url()).searchParams.get('room')!;
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    await host.getByRole('button', { name: '修改房间名称', exact: true }).click();
    await host.getByLabel('房间名称', { exact: true }).fill('隐藏测试房间');
    await host.getByLabel('房间密码', { exact: true }).fill('test-password');
    await host.getByLabel('在大厅展示').uncheck();
    await host.getByRole('dialog').getByRole('button', { name: '保存房间设置', exact: true }).click();
    await connect(guest, '加入者');
    await guest.goto(`./?room=${token}`);
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

test('五个模式入口和移动端页面保持可用', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await connect(page, '小屏玩家');
  await expect(page.getByLabel('联机服务地址')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '加入房间', exact: true })).toHaveCount(0);
  await page.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
  await page.getByRole('tab', { name: '规则设置', exact: true }).click();
  await expect(page.locator('.mode-card')).toHaveCount(5);
  for (const label of ['声母+音调', '部首', '字', '只有音调', '自定义']) await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  await page.getByRole('button', { name: '自定义', exact: true }).click();
  await expect(page.getByRole('group', { name: '声母', exact: true })).toBeVisible();
  await assertLayout(page);
});
