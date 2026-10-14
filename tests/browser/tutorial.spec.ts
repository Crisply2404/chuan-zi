import {expect,test} from '@playwright/test';
import type {RoomView,ServerMessage} from '../../shared/types';

test('玩法教学逐项体验四种模式，电脑错误尝试后败北',async({page})=>{
  let room:RoomView|null=null;
  const feedbacks=new Set<string>();
  page.on('websocket',socket=>socket.on('framereceived',({payload})=>{
    const message=JSON.parse(String(payload)) as ServerMessage;
    if(message.type==='state'){room=message.room;if(room?.answerFeedback)feedbacks.add(room.answerFeedback.id);}
  }));
  await page.goto('./');
  await page.getByRole('button',{name:'玩法教学',exact:true}).click();
  await expect(page.getByLabel('教学引导')).toBeVisible();
  const captions=['输入包含这个字的词','找带这个部首的字','声母和声调一起满足','按声调寻找词语'];
  for(let lesson=0;lesson<4;lesson++){
    await expect.poll(()=>room?.tutorial?.lesson).toBe(lesson);
    await expect(page.getByLabel('输入答案')).toBeEnabled();
    await expect(page.getByText(captions[lesson],{exact:true})).toBeVisible();
    const current=room as RoomView|null;
    expect(current?.tutorial).toBeTruthy();
    await page.getByLabel('输入答案').fill(current!.tutorial!.example.word);
    await page.getByLabel('输入答案').press('Enter');
    await expect(page.getByText('看看电脑怎样尝试',{exact:true})).toBeVisible();
    if(lesson<3)await expect.poll(()=>room?.tutorial?.lesson,{timeout:10000}).toBe(lesson+1);
    else await expect(page.getByText('教学完成',{exact:true})).toBeVisible({timeout:10000});
  }
  expect(feedbacks.size).toBeGreaterThanOrEqual(8);
  expect(room!.tutorial!.completed).toBe(true);
  expect(room!.players.find(player=>player.cpu)!.lives).toBe(0);
  await page.getByRole('button',{name:'返回大厅',exact:true}).click();
  await expect(page.getByRole('heading',{name:'游戏大厅',exact:true})).toBeVisible();
});

test('两名真人的准备房间保留额外电脑席位和可见入口',async({browser})=>{
  const host=await browser.newPage();const guest=await browser.newPage();
  try{
    await host.goto('http://localhost:4173/chuan-zi/');
    await host.locator('.page-heading').getByRole('button',{name:'创建房间',exact:true}).click();
    await expect(host.locator('.room-heading h1')).toBeVisible();
    await guest.goto(host.url());
    await expect(guest.locator('.room-heading h1')).toBeVisible();
    await expect(host.getByRole('button',{name:'添加电脑',exact:true})).toBeVisible();
    await host.getByRole('button',{name:'添加电脑',exact:true}).click();
    await expect(host.locator('.topology-player')).toHaveCount(3);
    await expect(guest.locator('.topology-player')).toHaveCount(3);
  }finally{await host.close();await guest.close();}
});
