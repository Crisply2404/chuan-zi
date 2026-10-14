import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { CedictEntry } from 'cedict-json';
import { parse as csv } from 'csv-parse/sync';
import { unzipSync, strFromU8 } from 'fflate';
import jsonlines from 'jsonlines';
import { parse as parseIds, flatten, children, type IDS } from 'parse-ids';
import { splitPinyin } from '../shared/pinyin';
import {parse as parseTable} from 'csv-parse';
import {z} from 'zod';
import {bonusRadicalCandidates} from '../shared/bonus-candidates';
import type { CharacterData, DictionaryData, Reading, WordEntry } from '../shared/types';

const componentVersion = 'bddc96d41bef78427ed0e034e9f7e31d71fd1b92';
const reviewedPartSchema=z.object({component:z.string().min(1),indices:z.array(z.number().int().nonnegative()).min(1)}).strict();
const strokeReviews=z.object({sourceVersion:z.literal(componentVersion),audit:z.string(),records:z.array(z.object({
  character:z.string().min(1),decomposition:z.string().min(1),strokeCount:z.number().int().positive(),
  replacements:z.array(reviewedPartSchema.extend({parts:z.array(reviewedPartSchema).min(1)})).optional(),
  finalParts:z.record(z.array(z.number().int().nonnegative()).min(1)).optional(),excludedFinalParts:z.array(z.string()).optional(),
}).strict())}).strict().parse(JSON.parse(await readFile('data/stroke-part-reviews.json','utf8')));
const strokeReviewMap=new Map(strokeReviews.records.map(review=>[review.character,review]));
const hanWord = /^\p{Script=Han}+$/u;
const provenance = [
  { name: 'CC-CEDICT contributors / MDBG 2026-10-12', license: 'CC-BY-SA-4.0', url: 'https://cc-cedict.org/wiki/' },
  { name: 'THUOCL / THUNLP', license: 'MIT', url: 'https://github.com/thunlp/THUOCL' },
  { name: 'jieba / Sun Junyi', license: 'MIT', url: 'https://github.com/fxsjy/jieba/tree/67fa2e36e72f69d9134b8a1037b83fbb070b9775' },
  { name: 'Unicode Unihan 18.0.0', license: 'Unicode-3.0', url: 'https://www.unicode.org/Public/18.0.0/ucd/Unihan.zip' },
  { name: `Make Me a Hanzi / ${componentVersion}`, license: 'LGPL-3.0-or-later', url: `https://github.com/skishore/makemeahanzi/tree/${componentVersion}` },
  {name: '万象词库 / amzxyz RIME-LMDG', license: 'CC-BY-4.0', url: 'https://github.com/amzxyz/RIME-LMDG/tree/5da3670129a82aeb0b20c3081d48c4f05ebd794b'},
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

const readingSupplement = z.object({version: z.literal(1), entries: z.array(z.object({word: z.string(), syllables: z.array(z.string().regex(/^[a-zü]+[1-5]$/u)), sourceDefinition: z.string()}).strict())}).strict().parse(JSON.parse(await readFile('data/reading-supplement.json', 'utf8')));
for (const approved of readingSupplement.entries) {
  const entry = entries.get(approved.word);
  if (!entry || !cedict.some(item => item.simplified === approved.word && item.english.includes(approved.sourceDefinition))) throw new Error(`补充读音缺少固定来源依据：${approved.word}`);
  if (approved.syllables.length !== [...approved.word].length) throw new Error(`补充读音长度不符：${approved.word}`);
  if (approved.sourceDefinition !== `also pr. [${approved.syllables.join('')}]`) throw new Error(`补充读音与来源声明不符：${approved.word}`);
  const parts = approved.syllables.map(splitPinyin);
  const reading: Reading = {syllables: approved.syllables, initials: parts.map(part => part.initial), finals: parts.map(part => part.final), tones: parts.map(part => part.tone)};
  if (!entry.readings.some(value => value.syllables.join(' ') === reading.syllables.join(' '))) entry.readings.push(reading);
}

const supplement = z.object({version: z.literal(1), sourceVersion: z.literal('5da3670129a82aeb0b20c3081d48c4f05ebd794b'), entries: z.array(z.object({
  word: z.string().regex(/^\p{Script=Han}{2,9}$/u), pinyin: z.string().min(1), idiom: z.boolean(), review: z.string().min(1),
}).strict())}).strict().parse(JSON.parse(await readFile('data/wanxiang-supplement.json', 'utf8')));
const supplementKeys = new Set(supplement.entries.map(entry => `${entry.word}:${entry.pinyin}`));
if (supplementKeys.size !== supplement.entries.length) throw new Error('万象补充词条重复');
const wanxiangRaw = await readFile('data/sources/wanxiang-jichu-2026-10-14.dict.yaml');
if (createHash('sha256').update(wanxiangRaw).digest('hex') !== '491a80628719f6eeabf7d1eb040a86c872175736a6a6c63f702f6f87e32230a8') throw new Error('万象词库数据来源校验失败');
const table = createReadStream('data/sources/wanxiang-jichu-2026-10-14.dict.yaml', {encoding: 'utf8'}).pipe(parseTable({from_line: 8, delimiter: '\t', quote: false, skip_empty_lines: true}));
for await (const row of table) {
  if (!supplementKeys.has(`${row[0]}:${row[1]}`)) continue;
  const approved = supplement.entries.find(entry => entry.word === row[0] && entry.pinyin === row[1])!;
  if (excluded.has(approved.word)) throw new Error(`万象补充词条在排除集合中：${approved.word}`);
  const parts = approved.pinyin.split(/\s+/).map(splitPinyin);
  if (parts.length !== [...approved.word].length || parts.some(part => !/^[a-zü]+$/u.test(part.syllable))) throw new Error(`万象补充读音无效：${approved.word}`);
  const reading: Reading = {syllables: parts.map(part => `${part.syllable}${part.tone}`), initials: parts.map(part => part.initial), finals: parts.map(part => part.final), tones: parts.map(part => part.tone)};
  const entry = entries.get(approved.word) ?? {word: approved.word, readings: [], idiom: approved.idiom, df: frequency.get(approved.word) ?? 0, frequency: everydayFrequency.get(approved.word) ?? 0, source: []};
  if (!entry.readings.some(value => value.syllables.join(' ') === reading.syllables.join(' '))) entry.readings.push(reading);
  if (!entry.source.includes('Wanxiang')) entry.source.push('Wanxiang');
  if (everydayFrequency.has(approved.word) && !entry.source.includes('jieba')) entry.source.push('jieba');
  entries.set(approved.word, entry);
  supplementKeys.delete(`${approved.word}:${approved.pinyin}`);
}
if (supplementKeys.size) throw new Error(`万象原始词库缺少已审核词条：${[...supplementKeys].join('、')}`);

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
  const review=strokeReviewMap.get(glyph.character);
  if(review){
    if(review.decomposition!==glyph.decomposition||review.strokeCount!==glyph.matches.length)throw new Error(`部件审核来源不符：${glyph.character}`);
    for(const replacement of review.replacements??[]){
      const occurrence=leaves.findIndex(item=>item.component===replacement.component&&JSON.stringify(item.indices)===JSON.stringify(replacement.indices));
      if(occurrence<0)throw new Error(`部件审核笔画不符：${glyph.character} ${replacement.component}`);
      for(const part of replacement.parts){
        if(new Set(part.indices).size!==part.indices.length||part.indices.some(index=>!replacement.indices.includes(index)))throw new Error(`部件审核索引无效：${glyph.character}`);
      }
      if(new Set(replacement.parts.flatMap(part=>part.indices)).size!==replacement.indices.length)throw new Error(`部件审核笔画覆盖不完整：${glyph.character}`);
      leaves.splice(occurrence,1,...replacement.parts);
    }
    for(const key of Object.keys(parts))delete parts[key];
    for(const {component,indices} of leaves)parts[component]=[...new Set([...(parts[component]??[]),...indices])].sort((first,second)=>first-second);
    componentMap.set(glyph.character,[...new Set(leaves.map(item=>item.component))]);
  }
  strokeParts.set(glyph.character, parts);
  occurrences.set(glyph.character, leaves);
}
for(const review of strokeReviews.records)if(!glyphRecords.has(review.character))throw new Error(`部件审核字符缺失：${review.character}`);
const expanded = new Set<string>();
function expandStrokeParts(character: string, visiting = new Set<string>()): Record<string, number[]> {
  const parts = strokeParts.get(character) ?? {};
  if (expanded.has(character) || visiting.has(character)) return parts;
  const next = new Set([...visiting, character]);
  for (const { component, indices } of occurrences.get(character) ?? []) {
    const record = glyphRecords.get(component);
    if (!record || component === character || indices.length !== record.matches.length) continue;
    for (const [nested, mapped] of Object.entries(expandStrokeParts(component, next))) {
      if (bonusRadicalCandidates.includes(nested) && mapped.length === record.matches.length) continue;
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
  info.strokeParts = {...expandStrokeParts(character)};
  const review=strokeReviewMap.get(character);
  for(const part of review?.excludedFinalParts??[]){
    if(!info.strokeParts[part]?.length)throw new Error(`部件审核目标缺失：${character} ${part}`);
    delete info.strokeParts[part];
  }
  for(const [part,indices] of Object.entries(review?.finalParts??{})){
    if(new Set(indices).size!==indices.length||indices.some(index=>index>=review!.strokeCount))throw new Error(`部件审核最终索引无效：${character}`);
    info.strokeParts[part]=indices;
    info.components=[...new Set([...info.components,part])].sort();
  }
  info.strokeCount = glyphRecords.get(character)?.matches.length;
}

const words = [...entries.values()].filter(entry => [...entry.word].every(character => glyphRecords.has(character))).sort((first, second) => first.word.localeCompare(second.word, 'zh-Hans'));
const usableCharacters = new Set(words.flatMap(entry => [...entry.word]));
const data: DictionaryData = { words, characters, metadata: { version: '2026-10-15', wordCount: words.length, idiomCount: words.filter(entry => entry.idiom).length, sources: provenance } };
await mkdir('data/sources', { recursive: true });
await writeFile('data/dictionary.json', `${JSON.stringify(data)}\n`);
await writeFile('data/components.json', `${JSON.stringify(Object.fromEntries([...componentMap]), null, 2)}\n`);
await copyFile('node_modules/cedict-json/LICENSE', 'licenses/CC-CEDICT.txt');
const coveredIdioms = words.filter(entry => frequency.has(entry.word)).length;
await writeFile('data/build-report.json', `${JSON.stringify({ ...data.metadata, thuoclCount: frequency.size, thuoclWithCompleteReadings: coveredIdioms, characterCount: Object.keys(characters).length, usableCharacterCount: usableCharacters.size, glyphExcludedWordCount: entries.size - words.length, uncoveredCharacterCount: Object.keys(characters).filter(character => !glyphRecords.has(character)).length, componentCharacterCount: componentMap.size, modifications: ['词语与长度筛选', '排除专名及指定释义', '完整读音去重', '万象审核补充', '排除字形未覆盖答案', 'Unihan 部首映射', 'IDS 字形部件递归整理'] }, null, 2)}\n`);
console.log(JSON.stringify({ wordCount: words.length, idiomCount: data.metadata.idiomCount, thuoclWithCompleteReadings: coveredIdioms, characterCount: Object.keys(characters).length }));
