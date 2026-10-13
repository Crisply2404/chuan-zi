import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {WordRules} from '../shared/rules';
import {getModeSettings} from '../shared/presets';
import {idiomVisiblePositions, stalemateScore} from '../shared/idiom-prompts';
import type {DictionaryData} from '../shared/types';

const rules = new WordRules(JSON.parse(readFileSync('data/dictionary.json', 'utf8')) as DictionaryData);

test('成语预设默认随机一格星号或只在第一格提示', () => {
  for (const mode of ['initial-tone', 'radical', 'character', 'tone-only'] as const) {
    const settings = {...getModeSettings(mode), dictionary: 'idioms' as const, minLength: 4, promptLength: 4, hiddenCount: 1};
    const shapes = new Set<string>();
    for (let index = 0; index < 36; index++) {
      const question = rules.generate(settings);
      const visible = question.cells.flatMap((cell, position) => Object.keys(cell).length ? [position] : []);
      assert.ok(visible.length === 3 || visible.length === 1 && visible[0] === 0, `${mode}: ${visible.join(',')}`);
      assert.equal(question.cells.length, 4);
      assert.ok(rules.examples(question, settings).length >= settings.minAnswers);
      shapes.add(visible.join(','));
    }
    assert.ok(shapes.has('0'), mode);
    assert.ok([...shapes].some(shape => shape.split(',').length === 3), mode);
  }
});

test('胶着程度只依连续无人失去生命的有效回合计算', () => {
  assert.equal(stalemateScore(0), 0);
  assert.equal(stalemateScore(8), 0);
  assert.ok(stalemateScore(12) > 0 && stalemateScore(12) < 1);
  assert.equal(stalemateScore(20), 1);
});

test('成语分布只有两种默认形式，充分胶着时两星号保持少量', () => {
  const normal = Array.from({length: 5000}, () => idiomVisiblePositions(0));
  assert.ok(normal.every(positions => positions.length === 3 || positions.length === 1 && positions[0] === 0));
  const firstOnly = normal.filter(positions => positions.length === 1).length;
  assert.ok(firstOnly > 2200 && firstOnly < 2800);
  const contested = Array.from({length: 5000}, () => idiomVisiblePositions(1));
  const pairs = contested.filter(positions => positions.length === 2).length;
  assert.ok(pairs > 350 && pairs < 650);
  assert.ok(contested.every(positions => new Set(positions).size === positions.length));
});
