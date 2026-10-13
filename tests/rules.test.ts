import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { RuleError, WordRules } from '../shared/rules';
import { formatPinyin } from '../shared/pinyin';
import { getModeSettings, getPresetSettings } from '../shared/presets';
import { defaultSettings, type DictionaryData, type Prompt } from '../shared/types';
import corrections from '../data/common-mistakes.json' with {type: 'json'};
import {emptyPromptSlot, withPromptSlots} from '../shared/prompt-slots';

const data = JSON.parse(readFileSync('data/dictionary.json', 'utf8')) as DictionaryData;
const rules = new WordRules(data);
const prompt = (cells: Prompt['cells']): Prompt => ({ id: 'public-rule-test', cells, answerCount: 0 });

test('易误写表达返回正确词形，草稿与提交继续拒绝', () => {
  const question = prompt([{contains: '置'}]);
  assert.equal(rules.draft('不可置否', question, defaultSettings).reason, '这个词应写作「不置可否」');
  assert.equal(rules.match('不可置否', question, defaultSettings).reason, '这个词应写作「不置可否」');
  assert.equal(rules.match('不置可否', question, defaultSettings).valid, true);
  for (const entry of corrections.entries) {
    assert.equal(data.words.some(word => word.word === entry.incorrect), false, entry.incorrect);
    assert.equal(rules.draft(entry.incorrect, question, defaultSettings).reason, `这个词应写作「${entry.correct}」`);
    assert.equal(rules.match(entry.incorrect, question, defaultSettings).valid, false);
    assert.equal(rules.match(entry.correct, prompt([{contains: [...entry.correct][0]}]), defaultSettings).valid, true, entry.correct);
  }
});

test('默认设置使用全部词语并允许两个汉字答案', () => {
  assert.equal(defaultSettings.dictionary, 'all');
  assert.equal(defaultSettings.minLength, 2);
  for (const mode of ['initial-tone', 'radical', 'character', 'tone-only'] as const) {
    const settings = getModeSettings(mode);
    assert.equal(settings.dictionary, 'all');
    assert.equal(settings.minLength, 2);
  }
});

test('声调条件只生成第一至第四声，完整答案轻声正常显示', () => {
  const settings = {...defaultSettings, promptLength: 1, minAnswers: 1, maxAnswers: 100000, appearance: {initial: 'off' as const, final: 'off' as const, tone: 'required' as const, radical: 'off' as const, component: 'off' as const, contains: 'off' as const}};
  for (let index = 0; index < 80; index++) assert.ok(rules.generate(settings).cells.filter(cell => cell.tone !== undefined).every(cell => cell.tone! >= 1 && cell.tone! <= 4));
  assert.equal(formatPinyin('d', 'e', 5), 'de');
  assert.equal(rules.match('使得', prompt([{contains: '得'}]), defaultSettings).valid, true);
});

test('逐格条件固定同字条件和隐藏位置，并接受无声母或无韵母', () => {
  const settings = withPromptSlots({...defaultSettings, minLength: 3, maxAnswers: 100000, minAnswers: 1}, [
    {...emptyPromptSlot(), initial: 'absent', tone: true}, emptyPromptSlot(), {...emptyPromptSlot(), contains: true},
  ]);
  const result = rules.generate(settings);
  assert.equal(result.cells[0].initial, '');
  assert.ok(result.cells[0].tone! >= 1 && result.cells[0].tone! <= 4);
  assert.deepEqual(result.cells[1], {});
  assert.equal([...result.cells[2].contains!].length, 1);
  assert.ok(rules.examples(result, settings).length > 0);
  const consonant = withPromptSlots({...defaultSettings, minAnswers: 1, maxAnswers: 100000}, [{...emptyPromptSlot(), final: 'absent'}]);
  assert.equal(rules.generate(consonant).cells[0].final, '');
  assert.equal(rules.match('姆妈', prompt([{final: ''}]), consonant).valid, true);
});

test('两格提示在三个汉字答案前后均能匹配，星号占用一个汉字位置', () => {
  const settings = {...defaultSettings, minLength: 3};
  assert.equal(rules.match('白开水', prompt([{contains: '白'}, {contains: '开'}]), settings).offset, 0);
  assert.equal(rules.match('白开水', prompt([{contains: '开'}, {contains: '水'}]), settings).offset, 1);
  assert.equal(rules.match('白开水', prompt([{contains: '开'}, {contains: '水'}, {}]), settings).valid, false);
  assert.equal(rules.match('白开水', prompt([{}, {contains: '开'}, {contains: '水'}]), settings).valid, true);
});

test('草稿只在完整合法词语匹配提示后返回附着位置', () => {
  const settings = { ...defaultSettings, dictionary: 'words' as const, minLength: 2 };
  assert.equal(rules.draft('清', prompt([{ initial: 'q' }]), settings).valid, false);
  assert.equal(rules.draft('清澈', prompt([{ initial: 'q' }]), settings).valid, true);
});

test('官方快照收录独享，旋转遵守第三声，重复草稿返回原因', () => {
  assert.equal(rules.match('独享', prompt([{initial: 'd'}, {initial: 'x'}]), defaultSettings).valid, true);
  assert.equal(rules.match('旋转', prompt([{initial: 'x'}, {initial: 'zh', tone: 3}]), defaultSettings).valid, true);
  assert.equal(rules.match('旋转', prompt([{initial: 'x'}, {initial: 'zh', tone: 4}]), defaultSettings).valid, false);
  assert.equal(rules.draft('草帽', prompt([{contains: '草'}]), defaultSettings, new Set(['草帽'])).reason, '本局已经使用这个答案');
});

test('真实成语按隐藏位置与连续声母序列接受答案', () => {
  const settings = { ...defaultSettings, promptLength: 4, hiddenCount: 1 };
  assert.equal(rules.match('生生不息', prompt([{ initial: 'sh' }, { initial: 'sh' }, {}, { initial: 'x' }]), settings).valid, true);
});

test('真实答案在任意相邻窗口满足部首与声调组合', () => {
  const settings = { ...defaultSettings, dictionary: 'words' as const, minLength: 2 };
  assert.equal(rules.match('清澈', prompt([{ radical: '氵', tone: 4 }]), settings).offset, 1);
  assert.equal(rules.match('森林', prompt([{ component: '木' }]), settings).valid, true);
});

test('部首提示使用常见部件形态且要求答案汉字包含其他笔画', () => {
  const settings = getModeSettings('radical');
  assert.equal(rules.match('夕阳', prompt([{ radical: '夕' }]), settings).valid, false);
  assert.equal(rules.match('清澈', prompt([{ radical: '氵' }]), settings).valid, true);
  assert.deepEqual(data.characters['冰'].strokeParts?.['冫'], [0, 1]);
  assert.deepEqual(data.characters['密'].strokeParts?.['宀'], [0, 1, 2]);
  assert.equal(rules.match('冬季', prompt([{ radical: '冫' }]), settings).valid, false);
  assert.equal(rules.match('才华', prompt([{ radical: '扌' }]), settings).valid, false);
  for (let index = 0; index < 20; index++) {
    const generated = rules.generate(settings);
    assert.ok(generated.cells.every(cell => cell.radical === undefined || ['氵', '扌', '忄', '艹', '宀', '讠', '纟', '钅', '灬', '辶', '阝', '犭', '饣', '衤', '礻', '冫', '疒', '亻', '刂', '囗', '⺮'].includes(cell.radical)));
    assert.ok(rules.examples(generated, settings).every(entry => rules.match(entry.word, generated, settings).valid));
  }
});

test('部首预设按相等概率生成一个或两个提示位置', () => {
  const settings = getModeSettings('radical');
  const counts = new Map<number, number>();
  for (let index = 0; index < 80; index++) {
    const result = rules.generate(settings);
    const count = result.cells.filter(cell => cell.radical !== undefined).length;
    counts.set(count, (counts.get(count) ?? 0) + 1);
    assert.ok(rules.examples(result, settings).every(entry => rules.match(entry.word, result, settings).valid));
  }
  assert.deepEqual([...counts.keys()].sort(), [1, 2]);
  assert.ok(counts.get(1)! >= 15 && counts.get(1)! <= 65);
});

test('空穴来风属于成语，实际宀部件可以匹配部首模式', () => {
  const settings = { ...defaultSettings, dictionary: 'idioms' as const, minLength: 4 };
  assert.equal(rules.match('空穴来风', prompt([{ contains: '空' }]), settings).valid, true);
  assert.equal(rules.match('空穴来风', prompt([{ radical: '宀' }]), settings).valid, true);
  assert.equal(rules.match('空穴来风', prompt([{ component: '宀' }]), settings).valid, true);
  assert.equal(rules.match('连接', prompt([{ component: '立' }]), defaultSettings).valid, false);
});

test('游戏词库按日常使用范围保留名称并排除专业词语', () => {
  assert.equal(rules.match('边缘性人格障碍', prompt([{ initial: 'b' }]), defaultSettings).valid, false);
  for (const word of ['乙酰胆碱', '二甲基亚砜', '精索静脉曲张', '苯丙酮尿症', '氰化钾', '乙二醇', '胰腺炎', '躁郁症']) assert.equal(data.words.some(entry => entry.word === word), false, word);
  for (const word of ['人工智能', '咖啡', '冰淇淋', '组织', '培养', '活泼', '新陈代谢', '药片', '流食', '呼吸机', '留观', '心律', '化学式']) assert.equal(data.words.some(entry => entry.word === word), true, word);
});

test('独立词语范围排除用户指定的口语组合', () => {
  for (const word of ['到家', '亲亲']) {
    assert.equal(data.words.some(entry => entry.word === word), false);
    assert.equal(rules.match(word, prompt([{ contains: [...word][0] }]), defaultSettings).valid, false);
  }
  assert.equal(rules.match('知识', prompt([{ contains: '知' }]), defaultSettings).valid, true);
});

test('电脑优先使用常见合法词语并继续遵守已使用答案集合', () => {
  const challenge = prompt([{ contains: '知' }]);
  assert.equal(rules.cpuAnswer(challenge, defaultSettings)?.word, '知道');
  const next = rules.cpuAnswer(challenge, defaultSettings, new Set(['知道']));
  assert.ok(next);
  assert.notEqual(next.word, '知道');
  assert.equal(rules.match(next.word, challenge, defaultSettings).valid, true);
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
  assert.equal(formatPinyin('m', '', 1), 'm̄');
  assert.equal(formatPinyin('m', '', 2), 'ḿ');
  assert.equal(rules.match('姆妈', prompt([{ initial: 'm', final: '', tone: 1 }]), defaultSettings).valid, true);
});

test('生成提示保留指定隐藏数量且开启字段覆盖其余位置', () => {
  const settings = { ...defaultSettings, minLength: 4, promptLength: 4, hiddenCount: 1, appearance: { ...defaultSettings.appearance, tone: 'off' as const } };
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
  const settings = { ...defaultSettings, minLength: 4, promptLength: 4, hiddenCount: 1, minAnswers: 1, toneScope: 'all' as const,
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
