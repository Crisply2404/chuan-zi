import {createReadStream} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import jsonlines from 'jsonlines';
import opentype, {type Path} from 'opentype.js';

const glyphs = [new opentype.Glyph({name: '.notdef', advanceWidth: 1024, path: new opentype.Path()})];
const parser = createReadStream('data/sources/makemeahanzi-graphics.jsonl', {encoding: 'utf8'}).pipe(jsonlines.parse());
const parsePath = (opentype.Path as unknown as {fromSVG(data: string, options: {flipY: boolean; optimize: boolean}): Path}).fromSVG;
for await (const record of parser) {
  const character = record.character as string;
  const path = new opentype.Path();
  for (const stroke of record.strokes as string[]) path.extend(parsePath(stroke, {flipY: false, optimize: false}));
  if (!path.commands.length) throw new Error(`字体轮廓缺失：${character}`);
  glyphs.push(new opentype.Glyph({name: `uni${character.codePointAt(0)!.toString(16)}`, unicode: character.codePointAt(0), advanceWidth: 1024, path}));
}
const font = new opentype.Font({familyName: 'Chuan Zi Kai', styleName: 'Regular', unitsPerEm: 1024, ascender: 900, descender: -124, glyphs,
  license: 'Arphic Public License. Complete terms: licenses/MakeMeAHanzi-APL.txt.',
  description: 'Make Me a Hanzi bddc96d41bef78427ed0e034e9f7e31d71fd1b92. Modified 2026-10-14: stroke outlines assembled into OpenType glyphs.',
  copyright: 'Copyright (C) 1999 Arphic Technology Co., Ltd. Modified 2026-10-14: Make Me a Hanzi stroke paths assembled as Chuan Zi Kai. Arphic Public License.'});
await mkdir('public/fonts', {recursive: true});
await writeFile('public/fonts/chuan-zi-kai.otf', Buffer.from(font.toArrayBuffer()));
console.log(`统一楷体生成：${glyphs.length - 1} 个汉字。`);
