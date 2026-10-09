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
  await page.getByLabel('联机服务地址').fill('ws://localhost:8787');
  await page.getByRole('button', { name: '连接大厅', exact: true }).click();
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

test('电脑与手机在生产子目录完成密码房间、条件设置、输入法与真实回答', async ({ browser }) => {
  const desktop = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/', viewport: { width: 1440, height: 1000 } });
  const mobile = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const host = await desktop.newPage();
  const guest = await mobile.newPage();
  const hostState = observe(host);
  const guestState = observe(guest);
  const roomName = `浏览器验证-${Date.now()}`;
  try {
    await connect(host, '电脑玩家');
    await connect(guest, '手机玩家');
    await assertLayout(host);
    await assertLayout(guest);
    await host.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
    await host.getByLabel('房间名称').fill(roomName);
    await host.getByLabel('房间密码').fill('test-password');
    await host.getByRole('dialog').getByRole('button', { name: '创建房间', exact: true }).click();
    await expect(host.getByRole('heading', { name: roomName })).toBeVisible();
    await guest.getByRole('button').filter({ hasText: roomName }).click();
    await guest.getByLabel('房间密码').fill('wrong-password');
    await guest.getByRole('dialog').getByRole('button', { name: '加入房间', exact: true }).click();
    await expect(guest.getByRole('alert')).toContainText('房间密码不正确');
    await guest.getByLabel('房间密码').fill('test-password');
    await guest.getByRole('dialog').getByRole('button', { name: '加入房间', exact: true }).click();
    await expect(guest.getByRole('heading', { name: roomName })).toBeVisible();

    await host.getByRole('tab', { name: '规则设置', exact: true }).click();
    await host.getByLabel('初始秒数').fill('60');
    await host.getByLabel('初始生命').fill('1');
    await host.getByLabel('比赛总局数').fill('1');
    await host.getByRole('button', { name: '预览提示', exact: true }).click();
    await expect(host.getByLabel('当前提示')).toBeVisible();
    await host.getByRole('button', { name: '保存规则', exact: true }).click();
    await expect.poll(() => hostState.room?.settings.initialSeconds).toBe(60);
    await host.getByRole('tab', { name: '游戏', exact: true }).click();
    await host.getByRole('button', { name: '准备', exact: true }).click();
    await guest.getByRole('button', { name: '准备', exact: true }).click();
    await host.getByRole('button', { name: '开始比赛', exact: true }).click();
    await expect(host.getByLabel('当前提示')).toBeVisible();
    await expect(host.getByLabel('输入答案')).toBeEnabled();
    await assertLayout(host);
    await assertLayout(guest);
    await host.getByRole('tab', { name: '规则设置', exact: true }).click();
    await expect(host.getByLabel('初始秒数')).toBeDisabled();
    await host.getByRole('tab', { name: '游戏', exact: true }).click();

    const deadline = hostState.room!.deadline;
    await host.getByLabel('输入答案').fill('不存在的游戏答案');
    await host.getByLabel('提交答案').click();
    await expect(host.getByRole('alert')).toContainText('答案');
    expect(hostState.room!.deadline).toBe(deadline);
    const state = hostState.room!;
    const answer = data.words.find(entry => rules.match(entry.word, state.prompt!, state.settings).valid)!.word;
    await host.getByLabel('输入答案').fill(answer);
    await host.getByLabel('输入答案').dispatchEvent('compositionstart');
    await host.getByLabel('输入答案').press('Enter');
    expect(hostState.room!.history).toHaveLength(0);
    await host.getByLabel('输入答案').dispatchEvent('compositionend');
    await expect.poll(() => Date.now()).toBeGreaterThan(Date.now() + 150);
    await host.getByLabel('提交答案').click();
    await expect.poll(() => guestState.room?.history.length).toBe(1);
    await expect(guest.getByLabel('输入答案')).toBeEnabled();
    await expect(guest.getByText(answer, { exact: true })).toBeVisible();
    await assertLayout(guest);
    await guest.getByRole('tab', { name: '聊天', exact: true }).click();
    await guest.getByLabel('聊天消息').fill('手机输入正常');
    await guest.getByLabel('发送消息', { exact: true }).click();
    await expect(guest.getByText('手机输入正常', { exact: true })).toBeVisible();

    const roomId = guestState.room!.id;
    await guest.reload();
    await expect(guest.getByRole('heading', { name: roomName })).toBeVisible();
    expect(guestState.room!.id).toBe(roomId);
    await assertLayout(guest);
    await guest.getByRole('button', { name: '离开房间', exact: true }).click();
    await expect(host.getByText('比赛结束', { exact: true }).first()).toBeVisible();
    await host.getByRole('button', { name: '离开房间', exact: true }).click();
    await expect(host.getByRole('heading', { name: '游戏大厅' })).toBeVisible();
    expect(hostState.errors).toEqual([]);
    expect(guestState.errors).toEqual([]);
  } finally {
    await desktop.close();
    await mobile.close();
  }
});

test('预设、自定义导出、公开拼音地址和房间内电脑对战', async ({ browser, page }) => {
  const state = observe(page);
  const guestContext = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const guest = await guestContext.newPage();
  const guestState = observe(guest);
  try {
    await connect(page, '房主测试玩家');
    await page.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '创建房间', exact: true }).click();
    await expect.poll(() => state.room?.roomKey).toMatch(/^[\u3400-\u9fff]{4}$/u);
    const roomKey = state.room!.roomKey;
    const roomPinyin = state.room!.roomPinyin;
    await expect(page.getByRole('heading', { name: roomKey })).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get('room')).toBe(roomPinyin);
    await page.getByRole('button', { name: '添加电脑', exact: true }).click();
    await expect(page.getByText('电脑', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: '修改房间名称', exact: true }).click();
    await page.getByLabel('房间名称', { exact: true }).fill('电脑验证房间');
    await page.getByRole('dialog').getByRole('button', { name: '保存名称', exact: true }).click();
    await expect(page.getByRole('heading', { name: '电脑验证房间' })).toBeVisible();

    await page.getByRole('tab', { name: '规则设置', exact: true }).click();
    await page.getByRole('button', { name: '困难模式', exact: true }).click();
    await expect(page.getByText('声母、韵母和声调交叉提示', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '简单模式', exact: true }).click();
    await page.getByRole('button', { name: '自定义模式', exact: true }).click();
    await expect(page.getByRole('group', { name: '声母', exact: true })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出规则', exact: true }).click();
    expect((await download).suggestedFilename()).toBe('chuan-zi-rule.json');
    await page.getByRole('checkbox', { name: '在大厅展示' }).click();
    await expect.poll(() => state.room?.listed).toBe(false);

    await connect(guest, '房间加入玩家');
    await guest.locator('.page-heading').getByRole('button', { name: '加入房间', exact: true }).click();
    await guest.getByLabel('房间号或拼音').fill(roomPinyin);
    await guest.getByRole('dialog').getByRole('button', { name: '加入房间', exact: true }).click();
    await expect(guest.getByRole('heading', { name: '电脑验证房间' })).toBeVisible();
    await guest.getByRole('button', { name: '离开房间', exact: true }).click();
    await expect(guest.getByRole('heading', { name: '游戏大厅' })).toBeVisible();
    await guest.locator('.page-heading').getByRole('button', { name: '加入房间', exact: true }).click();
    await guest.getByLabel('房间号或拼音').fill(roomKey);
    await guest.getByRole('dialog').getByRole('button', { name: '加入房间', exact: true }).click();
    await expect(guest.getByRole('heading', { name: '电脑验证房间' })).toBeVisible();

    await page.getByRole('tab', { name: '游戏', exact: true }).click();
    await page.getByRole('button', { name: '准备', exact: true }).click();
    await guest.getByRole('button', { name: '准备', exact: true }).click();
    await page.getByRole('button', { name: '开始比赛', exact: true }).click();
    await expect(page.getByLabel('当前提示')).toBeVisible();
    const answer = data.words.find(entry => rules.match(entry.word, state.room!.prompt!, state.room!.settings).valid)!.word;
    await page.getByLabel('输入答案').fill(answer);
    await page.getByRole('button', { name: '提交答案', exact: true }).click();
    await expect.poll(() => state.room?.history.length).toBe(1);
    await expect.poll(() => state.room?.history.length).toBeGreaterThan(1);
    expect(state.room?.history.some(item => item.nickname === '电脑')).toBe(true);
    await guest.getByRole('button', { name: '离开房间', exact: true }).click();
    await page.getByRole('button', { name: '离开房间', exact: true }).click();
    await expect(page.getByRole('heading', { name: '游戏大厅' })).toBeVisible();
    expect(state.errors).toEqual([]);
    expect(guestState.errors).toEqual([]);
  } finally {
    await guestContext.close();
  }
});

test('较小手机屏幕与许可页保持可访问', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await connect(page, '小屏玩家');
  await assertLayout(page);
  await page.getByRole('button', { name: '数据与许可', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('CC BY-SA 4.0');
  const licenseResponse = await page.request.get('./licenses.html');
  expect(licenseResponse.ok()).toBe(true);
  expect(await licenseResponse.text()).toContain('THUNLP');
  const fullLicense = await page.request.get('./licenses/CC-CEDICT.txt');
  expect(fullLicense.ok()).toBe(true);
  expect(await fullLicense.text()).toContain('Attribution-ShareAlike 4.0 International');
  await assertLayout(page);
  await page.getByRole('button', { name: '关闭窗口', exact: true }).click();
});

test('同一个浏览器的独立窗口保持不同玩家身份', async ({ context }) => {
  const first = await context.newPage();
  const second = await context.newPage();
  const firstState = observe(first);
  const secondState = observe(second);
  await connect(first, '窗口玩家甲');
  await connect(second, '窗口玩家乙');
  await first.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
  const name = `独立窗口-${Date.now()}`;
  await first.getByLabel('房间名称').fill(name);
  await first.getByRole('dialog').getByRole('button', { name: '创建房间', exact: true }).click();
  await expect(first.getByRole('heading', { name })).toBeVisible();
  await second.getByRole('button').filter({ hasText: name }).click();
  await expect.poll(() => firstState.room?.players.length).toBe(2);
  expect(firstState.room?.players.map(player => player.id)).toHaveLength(2);
  await expect.poll(() => secondState.room?.players.filter(player => player.online).length).toBe(2);
  await first.getByRole('button', { name: '离开房间', exact: true }).click();
  await second.getByRole('button', { name: '离开房间', exact: true }).click();
  expect(firstState.errors).toEqual([]);
  expect(secondState.errors).toEqual([]);
});

test('复制游戏窗口恢复身份后原窗口停止自动重连', async ({ page }) => {
  await connect(page, '恢复窗口玩家');
  await page.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
  await page.getByLabel('房间名称').fill('恢复测试');
  await page.getByRole('dialog').getByRole('button', { name: '创建房间', exact: true }).click();
  await expect(page.getByRole('heading', { name: '恢复测试' })).toBeVisible();
  const popupPromise = page.waitForEvent('popup');
  await page.evaluate(() => window.open(location.href));
  const popup = await popupPromise;
  await expect(popup.getByRole('button', { name: '已连接', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('身份已在其他连接使用');
  await expect(page.getByRole('button', { name: '未连接', exact: true })).toBeVisible();
  const startedAt = Date.now();
  await expect.poll(() => Date.now() - startedAt).toBeGreaterThan(2200);
  await expect(popup.getByRole('button', { name: '已连接', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '未连接', exact: true })).toBeVisible();
  await popup.getByRole('button', { name: '离开房间', exact: true }).click();
  await popup.close();
});

test('提示耗尽时网页展示中止结果并保留有效答案', async ({ browser }) => {
  const hostContext = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/' });
  const guestContext = await browser.newContext({ baseURL: 'http://localhost:4173/chuan-zi/' });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const hostState = observe(host);
  const guestState = observe(guest);
  try {
    await connect(host, '条件玩家甲');
    await connect(guest, '条件玩家乙');
    await host.locator('.page-heading').getByRole('button', { name: '创建房间', exact: true }).click();
    const name = `提示数量-${Date.now()}`;
    await host.getByLabel('房间名称').fill(name);
    await host.getByRole('dialog').getByRole('button', { name: '创建房间', exact: true }).click();
    await expect(host.getByRole('heading', { name })).toBeVisible();
    await guest.getByRole('button').filter({ hasText: name }).click();
    await expect(guest.getByRole('heading', { name })).toBeVisible();
    await host.getByRole('tab', { name: '规则设置', exact: true }).click();
    await host.getByLabel('答案最短字数').fill('2');
    await host.getByLabel('答案最长字数').fill('2');
    await host.getByLabel('可用答案下限').fill('1');
    await host.getByLabel('初始秒数').fill('60');
    await host.getByRole('group', { name: '声母', exact: true }).getByRole('button', { name: '关闭', exact: true }).click();
    await host.getByRole('group', { name: '声调', exact: true }).getByRole('button', { name: '关闭', exact: true }).click();
    await host.getByRole('group', { name: '连续汉字', exact: true }).getByRole('button', { name: '必选', exact: true }).click();
    await host.getByRole('button', { name: '保存规则', exact: true }).click();
    await expect.poll(() => hostState.room?.settings.minLength).toBe(2);
    await host.getByRole('tab', { name: '游戏', exact: true }).click();
    await host.getByRole('button', { name: '准备', exact: true }).click();
    await guest.getByRole('button', { name: '准备', exact: true }).click();
    await host.getByRole('button', { name: '开始比赛', exact: true }).click();
    await expect(host.getByLabel('当前提示')).toBeVisible();
    const count = data.words.filter(entry => entry.idiom && [...entry.word].length === 2).length;
    expect(count).toBe(5);
    for (let index = 0; index < count; index++) {
      const state = hostState.room!;
      const used = new Set(state.history.map(item => item.word));
      const answer = data.words.find(entry => rules.match(entry.word, state.prompt!, state.settings, used).valid)!.word;
      const active = index % 2 === 0 ? host : guest;
      await expect(active.getByLabel('输入答案')).toBeEnabled();
      await active.getByLabel('输入答案').fill(answer);
      await active.getByLabel('提交答案').click();
      await expect.poll(() => hostState.room?.history.length).toBe(index + 1);
      await expect.poll(() => guestState.room?.history.length).toBe(index + 1);
    }
    await expect(host.getByRole('heading', { name: '本局中止', exact: true })).toBeVisible();
    await expect(guest.getByRole('heading', { name: '本局中止', exact: true })).toBeVisible();
    expect(hostState.room?.round).toBe(0);
    expect(hostState.room?.players.every(player => player.wins === 0)).toBe(true);
    await host.getByRole('button', { name: '离开房间', exact: true }).click();
    await guest.getByRole('button', { name: '离开房间', exact: true }).click();
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
