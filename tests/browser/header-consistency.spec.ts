import {expect, test} from '@playwright/test';

for (const width of [1440, 390]) test(`${width}px 大厅和房间顶栏高度一致，游戏与规则标题等高`, async ({page}) => {
  await page.setViewportSize({width, height: 900});
  await page.goto('./');
  const header = await page.locator('.site-header').boundingBox();
  await page.locator('.page-heading').getByRole('button', {name: '创建房间', exact: true}).click();
  await expect(page.locator('.room-heading')).toBeVisible();
  const gameHeader = await page.locator('.site-header').boundingBox();
  const gameHeading = await page.locator('.room-heading').boundingBox();
  const gameTabs = await page.locator('.room-tabs').boundingBox();
  await page.getByRole('tab', {name: '规则设置', exact: true}).click();
  const rulesHeader = await page.locator('.site-header').boundingBox();
  const rulesHeading = await page.locator('.room-heading').boundingBox();
  const rulesTabs = await page.locator('.room-tabs').boundingBox();
  expect(gameHeader!.height).toBe(header!.height);
  expect(rulesHeader!.height).toBe(header!.height);
  expect(gameHeading!.height).toBe(rulesHeading!.height);
  expect(gameHeading!.y).toBe(rulesHeading!.y);
  expect(gameTabs!.height).toBe(rulesTabs!.height);
  expect(gameTabs!.y).toBe(rulesTabs!.y);
});
