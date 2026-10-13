import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import opentype from 'opentype.js';
import type {DictionaryData} from '../shared/types';
import {WordRules} from '../shared/rules';
import {defaultSettings} from '../shared/types';

const data = JSON.parse(await readFile('data/dictionary.json', 'utf8')) as DictionaryData;
const rawFont = await readFile('public/fonts/chuan-zi-kai.otf');
const font = opentype.parse(rawFont.buffer.slice(rawFont.byteOffset, rawFont.byteOffset + rawFont.byteLength));

test('全部有效答案由统一楷体覆盖，字体保留版权与修改说明', () => {
  for (const character of new Set(data.words.flatMap(entry => [...entry.word]))) {
    assert.ok(font.charToGlyphIndex(character) > 0, character);
    assert.ok(font.charToGlyph(character).path.commands.length > 0, character);
  }
  assert.match(font.getEnglishName('fontFamily'), /Chuan Zi Kai/);
  assert.match(font.getEnglishName('copyright'), /Arphic.*2026-10-14/s);
});

test('字体与逐笔资料使用相同字形轮廓与坐标', async () => {
  for (const character of ['冰', '清', '击', '报', '寻', '路']) {
    const glyph = JSON.parse(await readFile(`public/glyphs/${character.codePointAt(0)!.toString(16)}.json`, 'utf8')) as {strokes: string[]};
    const source = new opentype.Path();
    const parsePath = (opentype.Path as unknown as {fromSVG(data: string, options: {flipY: boolean; optimize: boolean}): opentype.Path}).fromSVG;
    for (const path of glyph.strokes) source.extend(parsePath(path, {flipY: false, optimize: false}));
    const actual = font.charToGlyph(character).path.getBoundingBox();
    const expected = source.getBoundingBox();
    for (const key of ['x1', 'x2', 'y1', 'y2'] as const) assert.ok(Math.abs(actual[key] - expected[key]) < 1, `${character}:${key}`);
    assert.equal(font.unitsPerEm, 1024);
    assert.equal(font.ascender, 900);
    assert.equal(font.descender, -124);
  }
});

test('万象寻路具有完整读音，草稿与提交接受连续声母条件', () => {
  const rules = new WordRules(data);
  const prompt = {id: 'wanxiang-xunlu', cells: [{initial: 'x'}, {initial: 'l'}], answerCount: 1};
  const word = data.words.find(entry => entry.word === '寻路')!;
  assert.ok(word.source.includes('Wanxiang'));
  assert.deepEqual(word.readings[0], {syllables: ['xun2', 'lu4'], initials: ['x', 'l'], finals: ['un', 'u'], tones: [2, 4]});
  assert.equal(rules.draft('寻路', prompt, defaultSettings).valid, true);
  assert.equal(rules.match('寻路', prompt, defaultSettings).valid, true);
  assert.equal(rules.match('寻路', prompt, {...defaultSettings, dictionary: 'idioms', minLength: 4}).valid, false);
});
