import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { CedictEntry } from 'cedict-json';
import { parse as csv } from 'csv-parse/sync';
import { unzipSync, strFromU8 } from 'fflate';
import jsonlines from 'jsonlines';
import { parse as parseIds, flatten, children, type IDS } from 'parse-ids';
import { splitPinyin } from '../shared/pinyin';
import type { CharacterData, DictionaryData, Reading, WordEntry } from '../shared/types';

const componentVersion = 'bddc96d41bef78427ed0e034e9f7e31d71fd1b92';
const hanWord = /^\p{Script=Han}+$/u;
const provenance = [
  { name: 'CC-CEDICT contributors / MDBG 2026-10-12', license: 'CC-BY-SA-4.0', url: 'https://cc-cedict.org/wiki/' },
  { name: 'THUOCL / THUNLP', license: 'MIT', url: 'https://github.com/thunlp/THUOCL' },
  { name: 'jieba / Sun Junyi', license: 'MIT', url: 'https://github.com/fxsjy/jieba/tree/67fa2e36e72f69d9134b8a1037b83fbb070b9775' },
  { name: 'Unicode Unihan 18.0.0', license: 'Unicode-3.0', url: 'https://www.unicode.org/Public/18.0.0/ucd/Unihan.zip' },
  { name: `Make Me a Hanzi / ${componentVersion}`, license: 'LGPL-3.0-or-later', url: `https://github.com/skishore/makemeahanzi/tree/${componentVersion}` },
];

const thuoclRaw = await readFile('THUOCL_chengyu.txt');
if (createHash('sha256').update(thuoclRaw).digest('hex') !== 'c339d5d6e37d4f8ecdcb82f2a02b7fdfc66796f0a5215155f2aff8a77e89a7eb') {
  throw new Error('THUOCL 原始数据校验失败');
}
const frequency = new Map<string, number>(csv(thuoclRaw, { delimiter: '\t', trim: true, skip_empty_lines: true }).map((row: string[]) => [row[0], Number(row[1])]));
const jiebaRaw = await readFile('data/sources/jieba-dict.txt');
if (createHash('sha256').update(jiebaRaw).digest('hex') !== '7197c3211ddd98962b036cdf40324d1ea2bfaa12bd028e68faa70111a88e12a8') throw new Error('jieba 原始数据校验失败');
const everydayFrequency = new Map<string, number>(csv(jiebaRaw, { delimiter: ' ', trim: true, skip_empty_lines: true }).map((row: string[]) => {
  const value = Number(row[1]);
  if (row.length !== 3 || !Number.isInteger(value) || value < 0) throw new Error(`jieba 词频字段无效：${row[0]}`);
  return [row[0], value];
}));
const policy = JSON.parse(await readFile('data/policy.json', 'utf8')) as { excludedWords: string[]; retainedEverydayWords: string[]; specialistDefinitionPatterns: string[]; excludedDefinitionPatterns: string[] };
const excluded = new Set(policy.excludedWords);
const retained = new Set(policy.retainedEverydayWords);
const specialistDefinitions = policy.specialistDefinitionPatterns.map(pattern => new RegExp(pattern, 'i'));
const excludedDefinitions = policy.excludedDefinitionPatterns.map(pattern => new RegExp(pattern, 'i'));
const entries = new Map<string, WordEntry>();
const cedictRaw = await readFile('data/sources/cc-cedict-2026-10-12.json');
if (createHash('sha256').update(cedictRaw).digest('hex') !== 'fcf2d8875620d949854d18b091ac8dd8b7c38c18c0ce32c03cdf5ece00fee478') throw new Error('CC-CEDICT 数据来源校验失败');
const cedict = JSON.parse(cedictRaw.toString('utf8')) as CedictEntry[];
for (const item of cedict) {
  const length = [...item.simplified].length;
  if (length < 2 || length > 9 || !hanWord.test(item.simplified) || excluded.has(item.simplified)) continue;
  const definitions = item.english.join('; ');
  if (excludedDefinitions.some(pattern => pattern.test(definitions))) continue;
  const substantiveDefinitions = item.english.filter(definition => !/^(CL:|see also |also written |also pr\.)/i.test(definition));
  if (!retained.has(item.simplified) && substantiveDefinitions.length && substantiveDefinitions.every(definition => specialistDefinitions.some(pattern => pattern.test(definition)))) continue;
  const syllables = item.pinyin.trim().split(/\s+/);
  if (syllables.length !== length || syllables.some(value => !/^[a-züv:]+[1-5]$/i.test(value))) continue;
  if (syllables.some(value => /^[A-Z]/.test(value))) continue;
  const parts = syllables.map(splitPinyin);
  const reading: Reading = {
    syllables: parts.map(value => `${value.syllable}${value.tone}`),
    initials: parts.map(value => value.initial), finals: parts.map(value => value.final), tones: parts.map(value => value.tone),
  };
  let entry = entries.get(item.simplified);
  if (!entry) {
    entry = { word: item.simplified, readings: [], idiom: frequency.has(item.simplified) || /\(idiom\)/i.test(definitions), df: frequency.get(item.simplified) ?? 0,
      frequency: everydayFrequency.get(item.simplified) ?? 0,
      source: ['CC-CEDICT', ...(frequency.has(item.simplified) ? ['THUOCL'] : []), ...(everydayFrequency.has(item.simplified) ? ['jieba'] : [])] };
    entries.set(entry.word, entry);
  }
  if (!entry.readings.some(value => value.syllables.join(' ') === reading.syllables.join(' '))) entry.readings.push(reading);
}

const usedCharacters = new Set([...entries.keys()].flatMap(word => [...word]));
const characters: Record<string, CharacterData> = {};
for (const character of usedCharacters) characters[character] = { radicals: [], components: [] };
const radicalMap = new Map<string, string>();
for (const row of csv(await readFile('data/sources/CJKRadicals-18.0.0.txt'), { delimiter: ';', comment: '#', trim: true, skip_empty_lines: true }) as string[][]) {
  radicalMap.set(row[0], String.fromCodePoint(Number.parseInt(row[2], 16)));
}
const archive = unzipSync(await readFile('data/sources/Unihan-18.0.0.zip'));
const radicalRows = csv(strFromU8(archive['Unihan_IRGSources.txt']), { delimiter: '\t', comment: '#', skip_empty_lines: true, quote: false }) as string[][];
for (const [codepoint, property, value] of radicalRows) {
  if (property !== 'kRSUnicode') continue;
  const character = String.fromCodePoint(Number.parseInt(codepoint.slice(2), 16));
  if (!characters[character]) continue;
  characters[character].radicals = [...new Set(value.split(' ').map(item => radicalMap.get(item.split('.')[0])).filter((item): item is string => Boolean(item)))];
}

const componentMap = new Map<string, string[]>();
const glyphRadicals = new Map<string, string>();
interface Glyph { character: string; decomposition: string; radical: string; matches: (number[] | null)[] }
const strokeParts = new Map<string, Record<string, number[]>>();
const glyphRecords = new Map<string, Glyph>();
const occurrences = new Map<string, { component: string; indices: number[] }[]>();
const parser = createReadStream('data/sources/makemeahanzi-dictionary.jsonl', { encoding: 'utf8' }).pipe(jsonlines.parse());
for await (const raw of parser) {
  const glyph = raw as Glyph;
  glyphRecords.set(glyph.character, glyph);
  const ids = parseIds(glyph.decomposition);
  if (!ids) throw new Error(`IDS 数据解析失败：${glyph.character} ${JSON.stringify(glyph.decomposition)}`);
  const components = flatten(ids).filter(item => item.type === 'char' && hanWord.test(item.char)).map(item => (item as { char: string }).char);
  componentMap.set(glyph.character, [...new Set(components.filter(item => item !== glyph.character))]);
  glyphRadicals.set(glyph.character, glyph.radical);
  const parts: Record<string, number[]> = {};
  const leaves: { component: string; indices: number[] }[] = [];
  const collect = (node: IDS, path: number[]) => {
    if (node.type === 'char') {
      const indices = glyph.matches.flatMap((match, index) => match && path.every((value, position) => match[position] === value) ? [index] : []);
      if (indices.length) parts[node.char] = [...new Set([...(parts[node.char] ?? []), ...indices])];
      if (indices.length) leaves.push({ component: node.char, indices });
    }
    children(node).forEach((child, index) => collect(child, [...path, index]));
  };
  collect(ids, []);
  strokeParts.set(glyph.character, parts);
  occurrences.set(glyph.character, leaves);
}
const expanded = new Set<string>();
function expandStrokeParts(character: string, visiting = new Set<string>()): Record<string, number[]> {
  const parts = strokeParts.get(character) ?? {};
  if (expanded.has(character) || visiting.has(character)) return parts;
  const next = new Set([...visiting, character]);
  for (const { component, indices } of occurrences.get(character) ?? []) {
    const record = glyphRecords.get(component);
    if (!record || component === character || indices.length !== record.matches.length) continue;
    for (const [nested, mapped] of Object.entries(expandStrokeParts(component, next))) {
      parts[nested] = [...new Set([...(parts[nested] ?? []), ...mapped.map(index => indices[index])])].sort((first, second) => first - second);
    }
  }
  expanded.add(character);
  return parts;
}
function allComponents(character: string, visited = new Set<string>()): Set<string> {
  if (visited.has(character)) return visited;
  visited.add(character);
  for (const component of componentMap.get(character) ?? []) allComponents(component, visited);
  return visited;
}
for (const [character, info] of Object.entries(characters)) {
  info.components = [...allComponents(character)].filter(item => item !== character).sort();
  const glyphRadical = glyphRadicals.get(character);
  if (glyphRadical && info.radicals.length) info.radicals = [...new Set([...info.radicals, glyphRadical])];
  info.strokeParts = expandStrokeParts(character);
  info.strokeCount = glyphRecords.get(character)?.matches.length;
}

const words = [...entries.values()].sort((first, second) => first.word.localeCompare(second.word, 'zh-Hans'));
const data: DictionaryData = { words, characters, metadata: { version: '2026-10-13', wordCount: words.length, idiomCount: words.filter(entry => entry.idiom).length, sources: provenance } };
await mkdir('data/sources', { recursive: true });
await writeFile('data/dictionary.json', `${JSON.stringify(data)}\n`);
await writeFile('data/components.json', `${JSON.stringify(Object.fromEntries([...componentMap]), null, 2)}\n`);
await copyFile('node_modules/cedict-json/LICENSE', 'licenses/CC-CEDICT.txt');
const coveredIdioms = words.filter(entry => frequency.has(entry.word)).length;
await writeFile('data/build-report.json', `${JSON.stringify({ ...data.metadata, thuoclCount: frequency.size, thuoclWithCompleteReadings: coveredIdioms, characterCount: Object.keys(characters).length, componentCharacterCount: componentMap.size, modifications: ['词语与长度筛选', '排除专名及指定释义', '完整读音去重', 'Unihan 部首映射', 'IDS 字形部件递归整理'] }, null, 2)}\n`);
console.log(JSON.stringify({ wordCount: words.length, idiomCount: data.metadata.idiomCount, thuoclWithCompleteReadings: coveredIdioms, characterCount: Object.keys(characters).length }));
