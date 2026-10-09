import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { WordRules } from '../shared/rules';
import { defaultSettings, conditionTypes, type DictionaryData, type Settings } from '../shared/types';

const rules = new WordRules(JSON.parse(readFileSync('data/dictionary.json', 'utf8')) as DictionaryData);
const reports: Array<{ name: string; count: number; milliseconds: number }> = [];
for (const type of conditionTypes) {
  const settings: Settings = { ...defaultSettings, promptLength: type === 'tone' ? 2 : 1, minAnswers: 1,
    appearance: { initial: 'off', final: 'off', tone: 'off', radical: 'off', component: 'off', contains: 'off', [type]: 'required' },
    toneScope: 'all' };
  const start = performance.now();
  for (let iteration = 0; iteration < 12; iteration++) {
    const prompt = rules.generate(settings);
    const actual = rules.data.words.filter(entry => rules.match(entry.word, prompt, settings).valid).length;
    assert.equal(prompt.answerCount, actual);
    assert.ok(actual >= settings.minAnswers && actual <= settings.maxAnswers);
  }
  reports.push({ name: type, count: 12, milliseconds: Math.round(performance.now() - start) });
}
console.log(JSON.stringify(reports));
