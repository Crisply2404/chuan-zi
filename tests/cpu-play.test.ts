import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {WordRules} from '../shared/rules';
import {cpuPlan} from '../shared/cpu-play';
import {defaultSettings,type DictionaryData} from '../shared/types';

const rules=new WordRules(JSON.parse(readFileSync('data/dictionary.json','utf8')) as DictionaryData);
const prompt={id:'cpu-character',cells:[{contains:'天'}],answerCount:1};
test('电脑展示真实错误尝试、修正答案与超时结果',()=>{
  const plans=Array.from({length:80},()=>cpuPlan(rules,prompt,defaultSettings,new Set()));
  assert.ok(plans.some(plan=>plan.succeed));
  assert.ok(plans.some(plan=>!plan.succeed));
  assert.ok(plans.some(plan=>plan.succeed&&plan.words.length>1));
  for(const plan of plans)for(const [index,word]of plan.words.entries())assert.equal(rules.match(word,prompt,defaultSettings).valid,plan.succeed&&index===plan.words.length-1);
});
test('教学电脑连续尝试两个真实错误词语，结果为超时',()=>{
  const plan=cpuPlan(rules,prompt,defaultSettings,new Set(),true);
  assert.equal(plan.succeed,false);
  assert.equal(plan.words.length,2);
  assert.ok(plan.words.every(word=>!rules.match(word,prompt,defaultSettings).valid));
});
