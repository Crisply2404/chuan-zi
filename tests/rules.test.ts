import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { RuleError, WordRules } from '../shared/rules';
import { formatPinyin } from '../shared/pinyin';
import { getPresetSettings } from '../shared/presets';
import { defaultSettings, type DictionaryData, type Prompt } from '../shared/types';

const data = JSON.parse(readFileSync('data/dictionary.json', 'utf8')) as DictionaryData;
const rules = new WordRules(data);
const prompt = (cells: Prompt['cells']): Prompt => ({ id: 'public-rule-test', cells, answerCount: 0 });

test('真实成语按隐藏位置与连续声母序列接受答案', () => {
  const settings = { ...defaultSettings, promptLength: 4, hiddenCount: 1 };
  assert.equal(rules.match('生生不息', prompt([{ initial: 'sh' }, { initial: 'sh' }, {}, { initial: 'x' }]), settings).valid, true);
});

test('真实答案在任意相邻窗口满足部首与声调组合', () => {
  const settings = { ...defaultSettings, dictionary: 'words' as const, minLength: 2 };
  assert.equal(rules.match('清澈', prompt([{ radical: '氵', tone: 4 }]), settings).offset, 1);
  assert.equal(rules.match('森林', prompt([{ component: '木' }]), settings).valid, true);
});

test('同字关系要求两种条件覆盖相同汉字位置', () => {
  const settings = { ...defaultSettings, dictionary: 'words' as const, minLength: 2, relations: [{ first: 'initial' as const, second: 'final' as const, mode: 'same' as const }] };
  assert.equal(rules.match('清澈', prompt([{ initial: 'q' }, { final: 'e' }]), settings).valid, false);
  assert.equal(rules.match('清澈', prompt([{ initial: 'q', final: 'ing' }]), settings).valid, true);
});

test('多音词全部条件使用同一套完整读音', () => {
  const settings = { ...defaultSettings, dictionary: 'words' as const, minLength: 2 };
  assert.equal(rules.match('重重', prompt([{ initial: 'ch', tone: 2 }, { initial: 'ch', tone: 2 }]), settings).valid, true);
  assert.equal(rules.match('重重', prompt([{ initial: 'ch', tone: 2 }, { initial: 'zh', tone: 4 }]), settings).valid, false);
});

test('连续汉字匹配相邻内容并拒绝本局已使用答案', () => {
  const settings = { ...defaultSettings };
  assert.equal(rules.match('天翻地覆', prompt([{ contains: '天翻' }]), settings).valid, true);
  assert.equal(rules.match('天翻地覆', prompt([{ contains: '天地' }]), settings).valid, false);
  assert.equal(rules.match('天翻地覆', prompt([{ contains: '天' }]), settings, new Set(['天翻地覆'])).valid, false);
});

test('声调提示只展示拼音符号', () => {
  assert.equal(formatPinyin(undefined, undefined, 1), 'ˉ');
  assert.equal(formatPinyin('t', 'ian', 1), 'tiān');
  assert.equal(formatPinyin('sh', undefined, 4), 'shˋ');
});

test('生成提示保留指定隐藏数量且开启字段覆盖其余位置', () => {
  const settings = { ...defaultSettings, promptLength: 4, hiddenCount: 1, appearance: { ...defaultSettings.appearance, tone: 'off' as const } };
  const result = rules.generate(settings);
  assert.equal(result.cells.filter(cell => !Object.keys(cell).length).length, 1);
  assert.equal(result.cells.filter(cell => cell.initial !== undefined).length, 3);
});

test('生成提示的可答数量与词库实际交集一致且排除已使用答案', () => {
  const settings = { ...defaultSettings, minAnswers: 2, maxAnswers: 20 };
  const result = rules.generate(settings);
  const answers = rules.examples(result, settings, new Set(), Infinity);
  assert.equal(result.answerCount, answers.length);
  assert.ok(answers.length >= 2 && answers.length <= 20);
  const used = new Set([answers[0].word]);
  assert.equal(rules.examples(result, settings, used, Infinity).length, answers.length - 1);
  assert.ok(answers.every(entry => rules.match(entry.word, result, settings).valid));
});

test('交叉条件关系同时支持同字与不同字', () => {
  const settings = { ...defaultSettings, minAnswers: 1, appearance: { ...defaultSettings.appearance, final: 'required' as const, tone: 'required' as const },
    relations: [{ first: 'initial' as const, second: 'tone' as const, mode: 'same' as const }, { first: 'initial' as const, second: 'final' as const, mode: 'different' as const }] };
  const result = rules.generate(settings);
  assert.ok(result.cells.every(cell => (cell.initial === undefined) === (cell.tone === undefined)));
  assert.ok(result.cells.every(cell => cell.initial === undefined || cell.final === undefined));
  assert.ok(rules.examples(result, settings).length);
});

test('全部声调范围覆盖每个显示汉字并保留隐藏位置', () => {
  const settings = { ...defaultSettings, promptLength: 4, hiddenCount: 1, minAnswers: 1, toneScope: 'all' as const,
    appearance: { initial: 'off' as const, final: 'off' as const, tone: 'required' as const, radical: 'off' as const, component: 'off' as const, contains: 'off' as const } };
  const result = rules.generate(settings);
  assert.equal(result.cells.filter(cell => cell.tone !== undefined).length, 3);
  assert.equal(result.cells.filter(cell => !Object.keys(cell).length).length, 1);
});

test('同字关系与不同字关系矛盾时返回可读错误', () => {
  const settings = { ...defaultSettings, appearance: { ...defaultSettings.appearance, final: 'required' as const, tone: 'required' as const },
    relations: [{ first: 'initial' as const, second: 'tone' as const, mode: 'same' as const }, { first: 'tone' as const, second: 'final' as const, mode: 'same' as const }, { first: 'initial' as const, second: 'final' as const, mode: 'different' as const }] };
  assert.throws(() => rules.generate(settings), RuleError);
});

test('随机字段可以补充声调提示的其他位置', () => {
  const settings = { ...defaultSettings, minAnswers: 1, appearance: { ...defaultSettings.appearance, initial: 'random' as const, tone: 'required' as const } };
  const result = rules.generate(settings);
  assert.equal(result.cells.filter(cell => cell.tone !== undefined).length, 1);
  assert.ok(result.cells.every(cell => Object.keys(cell).length));
});

test('不同字关系拒绝在同一位置叠加条件', () => {
  const settings = { ...defaultSettings, dictionary: 'words' as const, minLength: 2,
    relations: [{ first: 'initial' as const, second: 'tone' as const, mode: 'different' as const }] };
  assert.equal(rules.match('清澈', prompt([{ initial: 'q', tone: 1 }]), settings).valid, false);
  assert.equal(rules.match('清澈', prompt([{ initial: 'q' }, { tone: 4 }]), settings).valid, true);
});

test('完整词语读音保留 ü 的声调', () => {
  const settings = { ...defaultSettings, dictionary: 'words' as const, minLength: 2 };
  assert.equal(rules.match('女儿', prompt([{ initial: 'n', final: 'ü', tone: 3 }]), settings).valid, true);
});

test('三个规则预设都能根据真实词库生成提示', () => {
  for (const id of ['simple', 'hard', 'featured'] as const) {
    const result = rules.generate(getPresetSettings(id));
    assert.ok(result.answerCount >= getPresetSettings(id).minAnswers);
  }
});
