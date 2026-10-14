import {expect, test} from '@playwright/test';
import type {RoomView, ServerMessage} from '../../shared/types';

test('成语各预设默认十五秒，切回全部词语恢复十秒', async ({page}) => {
  let room: RoomView | null = null;
  page.on('websocket', socket => socket.on('framereceived', ({payload}) => {
    const message = JSON.parse(String(payload)) as ServerMessage;
    if (message.type === 'state') room = message.room;
  }));
  await page.goto('./');
  await page.locator('.page-heading').getByRole('button', {name:'创建房间',exact:true}).click();
  await page.getByRole('tab', {name:'规则设置',exact:true}).click();
  await page.getByRole('button', {name:'成语',exact:true}).click();
  await expect.poll(() => room?.settings.initialSeconds).toBe(15);
  for (const mode of ['声母+音调','部首','字','只有音调']) {
    await page.getByRole('button', {name:mode,exact:true}).click();
    await expect.poll(() => room?.settings.initialSeconds).toBe(15);
  }
  await page.getByRole('button', {name:'自定义',exact:true}).click();
  await expect(page.getByLabel('每回合秒数', {exact:true})).toHaveValue('15');
  await page.getByLabel('每回合秒数', {exact:true}).fill('20');
  await page.getByRole('button', {name:'保存规则',exact:true}).click();
  await expect.poll(() => room?.settings.initialSeconds).toBe(20);
  await expect(page.getByRole('button', {name:'字',exact:true})).toBeVisible();
  await page.getByRole('button', {name:'字',exact:true}).click();
  await page.getByRole('tab', {name:'游戏',exact:true}).click();
  await page.getByRole('button', {name:'添加电脑',exact:true}).click();
  await page.getByRole('button', {name:'准备',exact:true}).click();
  await page.getByRole('button', {name:'开始比赛',exact:true}).click();
  await expect(page.getByLabel('输入答案')).toBeEnabled();
  expect(room!.deadline! - room!.serverTime).toBeGreaterThan(14000);
  expect(room!.deadline! - room!.serverTime).toBeLessThanOrEqual(15000);
  await page.getByRole('button', {name:'离开房间',exact:true}).click();
  await page.locator('.page-heading').getByRole('button', {name:'创建房间',exact:true}).click();
  await page.getByRole('tab', {name:'规则设置',exact:true}).click();
  await page.getByRole('button', {name:'成语',exact:true}).click();
  await page.getByRole('button', {name:'全部词语',exact:true}).click();
  await expect.poll(() => room?.settings.initialSeconds).toBe(10);
});
