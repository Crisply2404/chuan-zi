import {readFileSync} from 'node:fs';
import {expect, test, type Page} from '@playwright/test';
import {WordRules} from '../../shared/rules';
import type {DictionaryData, RoomView, ServerMessage} from '../../shared/types';

const rules = new WordRules(JSON.parse(readFileSync('data/dictionary.json', 'utf8')) as DictionaryData);

function roomState(page: Page) {
  const state: {room: RoomView | null} = {room: null};
  page.on('websocket', socket => socket.on('framereceived', ({payload}) => {
    const message = JSON.parse(String(payload)) as ServerMessage;
    if (message.type === 'state') state.room = message.room;
  }));
  return state;
}

async function start(page: Page) {
  await page.goto('./');
  await page.locator('.page-heading').getByRole('button', {name: '创建房间', exact: true}).click();
  await page.getByRole('button', {name: '添加电脑', exact: true}).click();
  await page.getByRole('button', {name: '准备', exact: true}).click();
  await page.getByRole('button', {name: '开始比赛', exact: true}).click();
  await expect(page.getByLabel('输入答案')).toBeFocused();
}

test('手机可见高度缩小时答案和奖励目标都保持可见', async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  try {
    const page = await context.newPage();
    await start(page);
    await page.setViewportSize({width: 390, height: 400});
    await page.getByLabel('输入答案').tap();
    await page.getByLabel('输入答案').fill('不置可否');
    await expect.poll(() => page.locator('.bonus-progress').evaluate(element => {
      const viewport = visualViewport!;
      const bonus = element.getBoundingClientRect();
      const answer = document.querySelector('.answer-editor')!.getBoundingClientRect();
      return bonus.bottom <= viewport.offsetTop + viewport.height && bonus.top >= viewport.offsetTop && answer.top >= viewport.offsetTop;
    })).toBe(true);
  } finally {await context.close();}
});

test('IME 确认汉字后的独立提交立即发送，动画继续补全', async ({page}) => {
  const state = roomState(page);
  await start(page);
  const answer = rules.cpuAnswer(state.room!.prompt!, state.room!.settings)!;
  const input = page.getByLabel('输入答案');
  await input.dispatchEvent('compositionstart');
  await input.fill('pinyin');
  await input.fill(answer.word);
  await input.dispatchEvent('compositionend', {data: answer.word});
  await input.press('Enter');
  await expect.poll(() => state.room?.history[0]?.word, {timeout: 1500}).toBe(answer.word);
});

test('确认候选的 Enter 不提交，随后独立 Enter 立即提交', async ({page}) => {
  const state = roomState(page);
  await start(page);
  const answer = rules.cpuAnswer(state.room!.prompt!, state.room!.settings)!;
  const input = page.getByLabel('输入答案');
  await input.dispatchEvent('compositionstart');
  await input.fill('pinyin');
  await input.dispatchEvent('keydown', {key: 'Enter', keyCode: 229, isComposing: true});
  await input.fill(answer.word);
  await input.dispatchEvent('compositionend', {data: answer.word});
  await input.dispatchEvent('keyup', {key: 'Enter', keyCode: 13});
  expect(state.room!.history).toHaveLength(0);
  await input.press('Enter');
  await expect.poll(() => state.room?.history[0]?.word, {timeout: 1500}).toBe(answer.word);
});

test('词库入口只有全部词语与成语，四个成语预设遵守星号分布', async ({page}) => {
  const state = roomState(page);
  await page.goto('./');
  await page.locator('.page-heading').getByRole('button', {name: '创建房间', exact: true}).click();
  await page.getByRole('tab', {name: '规则设置', exact: true}).click();
  await expect(page.getByRole('group', {name: '答案词库'}).getByRole('button')).toHaveCount(2);
  await page.getByRole('button', {name: '成语', exact: true}).click();
  for (const mode of ['声母+音调', '部首', '字', '只有音调']) {
    await page.getByRole('button', {name: mode, exact: true}).click();
    await expect.poll(() => state.room?.settings.promptLength).toBe(4);
    await page.getByRole('button', {name: '自定义', exact: true}).click();
    await expect(page.locator('.slot-card')).toHaveCount(4);
    await page.getByRole('button', {name: '游戏模式', exact: true}).click();
  }
});
