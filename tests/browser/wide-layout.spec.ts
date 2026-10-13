import {expect, test} from '@playwright/test';

test('宽窗口游戏使用完整页面并常驻右侧聊天', async ({page}) => {
  await page.setViewportSize({width: 1920, height: 1080});
  await page.goto('./');
  await page.locator('.page-heading').getByRole('button', {name: '创建房间', exact: true}).click();
  await expect(page.locator('.room-heading h1')).toBeVisible();
  const room = await page.locator('.room-page').boundingBox();
  expect(room!.width).toBeGreaterThan(1800);
  const stage = await page.locator('.game-area').boundingBox();
  expect(stage!.y + stage!.height).toBeGreaterThan(1040);
  await expect(page.locator('.room-layout > .activity-area')).toBeVisible();
  await expect(page.getByRole('dialog', {name: '答案记录与聊天'})).toHaveCount(0);
  await page.getByRole('tab', {name: '聊天', exact: true}).click();
  await expect(page.getByLabel('聊天消息')).toBeVisible();
  const form = await page.locator('.chat-form').boundingBox();
  expect(form!.y + form!.height).toBeGreaterThan(1040);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(1080);
});

test('大屏大厅、规则设置及比赛使用可用宽高，切换窄窗口保留聊天', async ({page}) => {
  for (const viewport of [{width: 1920, height: 1080}, {width: 3840, height: 2166}]) {
    await page.setViewportSize(viewport);
    await page.goto('./');
    expect((await page.locator('.lobby-page').boundingBox())!.width).toBe(viewport.width - 72);
    const footer = await page.locator('.site-footer').boundingBox();
    expect(footer!.y + footer!.height).toBeCloseTo(viewport.height, 0);
    await page.locator('.page-heading').getByRole('button', {name: '创建房间', exact: true}).click();
    await expect(page.locator('.room-layout > .activity-area')).toBeVisible();
    await page.getByRole('tab', {name: '规则设置', exact: true}).click();
    expect((await page.locator('.room-settings-layout').boundingBox())!.width).toBe(viewport.width - 72);
    const modes = await page.locator('.mode-grid').boundingBox();
    expect(modes!.y + modes!.height).toBeGreaterThan(viewport.height - 160);
    await page.getByRole('tab', {name: '游戏', exact: true}).click();
    await page.getByRole('button', {name: '添加电脑', exact: true}).click();
    await page.getByRole('button', {name: '准备', exact: true}).click();
    await page.getByRole('button', {name: '开始比赛', exact: true}).click();
    await expect(page.locator('.answer-region')).toBeVisible();
    await page.getByRole('tab', {name: '规则设置', exact: true}).click();
    await expect(page.getByRole('button', {name: '部首', exact: true})).toBeDisabled();
    await expect(page.getByRole('button', {name: '只有音调', exact: true})).toBeDisabled();
    await page.getByRole('tab', {name: '游戏', exact: true}).click();
    const bonus = await page.locator('.bonus-progress').boundingBox();
    expect(bonus!.y + bonus!.height).toBeGreaterThan(viewport.height - 60);
    await page.getByRole('tab', {name: '聊天', exact: true}).click();
    await page.getByLabel('聊天消息').fill('切换宽度保留输入');
    await page.setViewportSize({width: 390, height: 844});
    await expect(page.locator('.activity-area')).toHaveCount(0);
    await page.getByRole('button', {name: '查看答案记录与聊天', exact: true}).click();
    await expect(page.getByLabel('聊天消息')).toHaveValue('切换宽度保留输入');
    await page.setViewportSize(viewport);
    await expect(page.locator('.modal-drawer')).toHaveCount(0);
    await expect(page.getByLabel('聊天消息')).toHaveValue('切换宽度保留输入');
    await page.getByRole('button', {name: '离开房间', exact: true}).click();
  }
});
