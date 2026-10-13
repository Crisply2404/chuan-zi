import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {availableBonusTypes, bonusCandidates, collectBonusValues, resolveBonusType} from '../shared/bonuses';
import {defaultSettings, type DictionaryData} from '../shared/types';
import {emptyPromptSlot, withPromptSlots} from '../shared/prompt-slots';
import {settingsSchema} from '../shared/settings';

const data = JSON.parse(readFileSync('data/dictionary.json', 'utf8')) as DictionaryData;

test('奖励优先选择提示中未使用的韵母、部首、声母', () => {
  assert.equal(resolveBonusType(defaultSettings), 'final');
  const final = withPromptSlots(defaultSettings, [{...emptyPromptSlot(), final: 'required'}]);
  assert.equal(resolveBonusType(final), 'radical');
  const both = withPromptSlots(defaultSettings, [{...emptyPromptSlot(), final: 'required', radical: true}]);
  assert.deepEqual(availableBonusTypes(both), ['initial']);
  assert.equal(resolveBonusType(both), 'initial');
  const all = withPromptSlots(defaultSettings, [{...emptyPromptSlot(), final: 'required', initial: 'required', radical: true}]);
  assert.equal(resolveBonusType(all), null);
  assert.deepEqual(bonusCandidates(all), []);
});

test('自定义可以选择未用于提示的奖励类型，条件变化自动重新选择', () => {
  const tone = withPromptSlots(defaultSettings, [{...emptyPromptSlot(), tone: true}]);
  assert.equal(resolveBonusType({...tone, bonusType: 'initial'}), 'initial');
  assert.equal(resolveBonusType({...defaultSettings, bonusType: 'initial'}), 'final');
  assert.equal(resolveBonusType({...tone, bonusEnabled: false}), null);
  assert.equal(settingsSchema.safeParse({...tone, bonusType: 'final', bonusFinals: []}).success, false);
  assert.equal(settingsSchema.safeParse({...tone, bonusType: 'radical', bonusRadicals: ['冫']}).success, true);
});

test('韵母和部首奖励从真实词语完整读音与对应笔画取得', () => {
  const word = data.words.find(entry => entry.word === '清澈')!;
  assert.deepEqual(collectBonusValues(word.word, word.readings[0], data.characters, 'final'), ['ing', 'e']);
  assert.deepEqual(collectBonusValues(word.word, word.readings[0], data.characters, 'radical'), ['氵']);
  assert.deepEqual(collectBonusValues(word.word, word.readings[0], data.characters, 'initial'), ['q', 'ch']);
});
