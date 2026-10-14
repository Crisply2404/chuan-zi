import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {WordRules} from '../shared/rules';
import {cpuPlan} from '../shared/cpu-play';
import {defaultSettings,type DictionaryData} from '../shared/types';

const rules=new WordRules(JSON.parse(readFileSync('data/dictionary.json','utf8')) as DictionaryData);
const prompt={id:'cpu-character',cells:[{contains:'天'}],answerCount:1};
test('电脑展示真实错误尝试、修正答案与超时结果',()=>{
  const plans=Array.from({length:160},()=>cpuPlan(rules,prompt,defaultSettings,new Set()));
  assert.ok(plans.some(plan=>plan.succeed));
  assert.ok(plans.some(plan=>!plan.succeed));
  assert.ok(plans.some(plan=>plan.succeed&&plan.words.length>1));
  for(const plan of plans)for(const [index,word]of plan.words.entries())assert.equal(rules.match(word,prompt,defaultSettings).valid,plan.succeed&&index===plan.words.length-1);
});
test('教学电脑持续尝试接近提示的真实词语，结果为超时',()=>{
  const plan=cpuPlan(rules,prompt,defaultSettings,new Set(),true);
  assert.equal(plan.succeed,false);
  assert.ok(plan.words.length>=4);
  assert.ok(plan.words.every(word=>!rules.match(word,prompt,defaultSettings).valid));
});

test('成语电脑候选保持四个汉字，修正过程保留已知汉字',()=>{
  const settings={...defaultSettings,dictionary:'idioms' as const,minLength:4,maxLength:4};
  const challenge={id:'cpu-combination',cells:[{contains:'天'},{tone:1},{},{}],answerCount:1};
  const plan=cpuPlan(rules,challenge,settings,new Set(),true);
  assert.ok(plan.words.length>=4);
  for(const [index,word] of plan.words.entries()){
    assert.equal([...word].length,4);
    assert.ok(rules.data.words.find(entry=>entry.word===word)?.idiom);
    if(index<4)assert.equal([...word][0],'天');
  }
});
