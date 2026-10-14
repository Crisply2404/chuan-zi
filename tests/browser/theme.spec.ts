import {expect, test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {WordRules} from '../../shared/rules';
import type {DictionaryData, RoomView, ServerMessage} from '../../shared/types';

const rules = new WordRules(JSON.parse(readFileSync('data/dictionary.json', 'utf8')) as DictionaryData);

test('点击昵称修改，明暗主题独立切换并保存在设备', async ({page}) => {
  await page.goto('./');
  await page.getByRole('button', {name: '修改昵称', exact: true}).click();
  await page.getByLabel('昵称', {exact: true}).fill('水墨玩家');
  await page.getByRole('button', {name: '保存昵称', exact: true}).click();
  await expect(page.getByRole('button', {name: '修改昵称', exact: true})).toContainText('水墨玩家');
  await page.getByRole('button', {name: '切换暗色主题', exact: true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(27, 28, 30)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.page-heading').getByRole('button', {name: '创建房间', exact: true}).click();
  await expect(page.locator('.room-heading h1')).toBeVisible();
  await page.getByRole('tab', {name: '规则设置', exact: true}).click();
  await expect(page.locator('.mode-card').first()).toHaveCSS('background-color', 'rgb(27, 28, 30)');
  await page.getByRole('button', {name: '切换亮色主题', exact: true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.setViewportSize({width: 320, height: 700});
  await expect(page.getByRole('button', {name: '修改昵称', exact: true})).toBeVisible();
  expect(await page.locator('.site-header').evaluate(element => element.scrollWidth <= innerWidth)).toBe(true);
});

test('暗色主题保持玩家头像颜色与奖励收集进度', async ({page}) => {
  let room: RoomView | null = null;
  let playerId = '';
  page.on('websocket', socket => socket.on('framereceived', ({payload}) => {
    const message = JSON.parse(String(payload)) as ServerMessage;
    if (message.type === 'state') room = message.room;
    if (message.type === 'session') playerId = message.playerId;
  }));
  await page.goto('./');
  await page.getByRole('button', {name: '切换暗色主题', exact: true}).click();
  await page.locator('.page-heading').getByRole('button', {name: '创建房间', exact: true}).click();
  await page.getByRole('button', {name: '添加电脑', exact: true}).click();
  await page.getByRole('button', {name: '准备', exact: true}).click();
  await page.getByRole('button', {name: '开始比赛', exact: true}).click();
  await expect(page.getByLabel('输入答案')).toBeEnabled();
  const state = room as RoomView | null;
  expect(state).not.toBeNull();
  for (const player of state!.players) {
    const color = await page.evaluate(value => {const element = document.createElement('div');element.style.color = value;return element.style.color;}, player.color);
    await expect(page.locator(`.topology-player[data-player-id="${player.id}"] .topology-avatar`)).toHaveCSS('border-top-color', color);
  }
  const targets = state!.players.find(player => player.id === playerId)!.bonusTargets;
  const answer = rules.examples(state!.prompt!, state!.settings, new Set(), 100000).find(entry => entry.readings.some(reading => reading.finals.some(final => targets.includes(final))))!;
  expect(answer).toBeTruthy();
  await page.getByLabel('输入答案').fill(answer.word);
  await page.getByRole('button', {name: '提交答案', exact: true}).click();
  await expect.poll(() => page.locator('.bonus-collected').count()).toBeGreaterThan(0);
  await expect(page.locator('.bonus-collected').first()).toHaveCSS('color', 'rgb(238, 233, 226)');
  await expect(page.locator('.bonus-collected').first()).toHaveCSS('border-bottom-color', 'rgb(238, 233, 226)');
});
