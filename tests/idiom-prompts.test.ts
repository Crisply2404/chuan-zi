import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {WordRules} from '../shared/rules';
import {getModeSettings} from '../shared/presets';
import {idiomVisiblePositions, stalemateScore} from '../shared/idiom-prompts';
import type {DictionaryData} from '../shared/types';

const rules = new WordRules(JSON.parse(readFileSync('data/dictionary.json', 'utf8')) as DictionaryData);

test('成语声母模式默认零个星号或只在第一格提示', () => {
  for (const mode of ['initial-tone'] as const) {
    const settings = {...getModeSettings(mode), dictionary: 'idioms' as const, minLength: 4, promptLength: 4, hiddenCount: 1};
    const shapes = new Set<string>();
    for (let index = 0; index < 36; index++) {
      const question = rules.generate(settings);
      const visible = question.cells.flatMap((cell, position) => Object.keys(cell).length ? [position] : []);
      assert.ok(visible.length === 4 || visible.length === 1 && visible[0] === 0, `${mode}: ${visible.join(',')}`);
      assert.equal(question.cells.length, 4);
      assert.ok(rules.examples(question, settings).length >= settings.minAnswers);
      shapes.add(visible.join(','));
    }
    assert.ok(shapes.has('0'), mode);
    assert.ok(shapes.has('0,1,2,3'), mode);
  }
});

test('成语部首与声调默认三个或两个星号，各占一半', () => {
  for (const mode of ['radical', 'tone-only'] as const) {
    const settings = {...getModeSettings(mode), dictionary: 'idioms' as const, minLength: 4};
    const shapes = new Set<number>();
    for (let index = 0; index < 60; index++) {
      const question = rules.generate(settings);
      const visible = question.cells.filter(cell => Object.keys(cell).length).length;
      assert.equal(question.cells.length, 4);
      assert.ok(visible === 1 || visible === 2, `${mode}: ${visible}`);
      shapes.add(visible);
    }
    assert.deepEqual([...shapes].sort(), [1,2]);
  }
});

test('胶着程度只依连续无人失去生命的有效回合计算', () => {
  assert.equal(stalemateScore(0), 0);
  assert.equal(stalemateScore(8), 0);
  assert.ok(stalemateScore(12) > 0 && stalemateScore(12) < 1);
  assert.equal(stalemateScore(20), 1);
});

test('成语分布为三个或零个星号，胶着程度保持此范围', () => {
  const normal = Array.from({length: 5000}, () => idiomVisiblePositions(0));
  assert.ok(normal.every(positions => positions.length === 4 || positions.length === 1 && positions[0] === 0));
  const firstOnly = normal.filter(positions => positions.length === 1).length;
  assert.ok(firstOnly > 2200 && firstOnly < 2800);
  const contested = Array.from({length: 5000}, () => idiomVisiblePositions(1));
  assert.ok(contested.every(positions => positions.length === 4 || positions.length === 1 && positions[0] === 0));
  assert.ok(contested.every(positions => new Set(positions).size === positions.length));
});

test('字模式全部词语与成语始终只给一个汉字提示', () => {
  for (const dictionary of ['all', 'idioms'] as const) {
    const settings = {...getModeSettings('character'), dictionary, minLength: dictionary === 'idioms' ? 4 : 2};
    for (let index = 0; index < 20; index++) {
      const question = rules.generate(settings);
      assert.equal(question.cells.length, 1);
      assert.equal([...question.cells[0].contains!].length, 1);
      assert.ok(rules.examples(question, settings).length >= settings.minAnswers);
    }
  }
});
