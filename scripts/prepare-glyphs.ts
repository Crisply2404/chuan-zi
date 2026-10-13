import { createReadStream } from 'node:fs';
import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import jsonlines from 'jsonlines';
import AdmZip from 'adm-zip';
import type { DictionaryData } from '../shared/types';

const dictionary = JSON.parse(await readFile('data/dictionary.json', 'utf8')) as DictionaryData;
const raw = await readFile('data/sources/makemeahanzi-graphics.jsonl');
const sources = JSON.parse(await readFile('data/sources.json', 'utf8')) as { sources: { file: string; sha256?: string }[] };
const provenance = sources.sources.find(source => source.file === 'data/sources/makemeahanzi-graphics.jsonl');
if (!provenance?.sha256 || createHash('sha256').update(raw).digest('hex') !== provenance.sha256) throw new Error('字形数据来源校验失败');
await rm('public/glyphs', { force: true, recursive: true });
await mkdir('public/glyphs', { recursive: true });
const filenames: string[] = [];
const parser = createReadStream('data/sources/makemeahanzi-graphics.jsonl', { encoding: 'utf8' }).pipe(jsonlines.parse());
for await (const rawGlyph of parser) {
  const glyph = rawGlyph as { character: string; strokes: string[] };
  if (!dictionary.characters[glyph.character]) continue;
  if (!glyph.strokes.length || glyph.strokes.some(stroke => typeof stroke !== 'string' || !stroke)) throw new Error(`字形路径无效：${glyph.character}`);
  const filename = `${glyph.character.codePointAt(0)!.toString(16)}.json`;
  filenames.push(filename);
  await writeFile(`public/glyphs/${filename}`, JSON.stringify({ character: glyph.character, strokes: glyph.strokes, parts: dictionary.characters[glyph.character].strokeParts ?? {},
    provenance: { copyright: 'Copyright (C) 1999 Arphic Technology Co., Ltd.', license: 'Arphic Public License', mappingLicense: 'LGPL-3.0-or-later', modified: '2026-10-13：按汉字提取原始路径，加入逐笔部件索引。' } }));
}
await writeFile('public/glyphs/index.json', JSON.stringify({ files: filenames, license: '../licenses/MakeMeAHanzi-APL.txt', mappingLicense: '../licenses/MakeMeAHanzi-LGPL.txt' }));
const archive = new AdmZip();
for (const file of ['data/sources/makemeahanzi-graphics.jsonl', 'data/sources/makemeahanzi-dictionary.jsonl', 'licenses/MakeMeAHanzi-APL.txt', 'licenses/MakeMeAHanzi-COPYING.txt', 'licenses/MakeMeAHanzi-LGPL.txt', 'licenses/GPL-3.0.txt']) archive.addLocalFile(file, file.slice(0, file.lastIndexOf('/')));
archive.addFile('licenses/ARPHICPL.TXT', await readFile('licenses/MakeMeAHanzi-APL.txt'));
for (const filename of filenames) archive.addLocalFile(`public/glyphs/${filename}`, 'glyphs');
archive.addFile('README.txt', Buffer.from('汉字笔画与部件资料。2026-10-13。路径采用 Arphic Public License，部件映射采用 LGPL-3.0-or-later。修改：按汉字提取路径，加入 IDS 与逐笔部件索引；完整原始数据、可编辑的修改 JSON 与许可均在此文件中。glyphs 中每份 JSON 保存完整笔画路径和部件对应的笔画索引，可以直接修改并按原许可发布。'));
await writeFile('public/glyphs-source.zip', archive.toBuffer());
