import {expect,test} from '@playwright/test';

test('移动光标时显示在前一个汉字右侧，Home回到首字左侧',async({page})=>{
  await page.goto('./');
  await page.getByRole('button',{name:'玩法教学',exact:true}).click();
  const input=page.getByLabel('输入答案');
  await input.fill('谢谢');
  await input.press('ArrowLeft');
  await expect.poll(()=>input.evaluate(element=>(element as HTMLInputElement).selectionStart)).toBe(1);
  const caret=page.locator('.answer-region .answer-cell-caret');
  await expect(caret).toHaveCount(1);
  await expect(caret.locator('.answer-character')).toHaveText('谢');
  const bounds=await caret.evaluate(element=>{
    const character=element.querySelector('.answer-character')!.getBoundingClientRect();
    return {caret:element.getBoundingClientRect().x+parseFloat(getComputedStyle(element,'::after').left),right:character.right};
  });
  expect(bounds.caret).toBeGreaterThanOrEqual(bounds.right);
  expect(bounds.caret-bounds.right).toBeLessThanOrEqual(4);
  await input.press('Home');
  await expect.poll(()=>input.evaluate(element=>(element as HTMLInputElement).selectionStart)).toBe(0);
  await expect(page.locator('.answer-region .answer-cell-caret')).toHaveAttribute('data-caret-placement','start');
});
