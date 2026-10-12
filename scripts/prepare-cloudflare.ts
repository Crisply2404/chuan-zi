import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { gzipSync, strToU8 } from 'fflate';
import { compactDictionary } from '../shared/compact-dictionary';
import type { DictionaryData } from '../shared/types';

const directory = '.scratch/cloudflare/bundle';
await mkdir(directory, {recursive: true});
const original = await readFile('data/dictionary.json', 'utf8');
const data = JSON.parse(original) as DictionaryData;
const compact = JSON.stringify(compactDictionary(data));
await writeFile(`${directory}/dictionary.gz`, gzipSync(strToU8(compact), {level: 9}));
await build({
  entryPoints: ['cloudflare/worker.ts'], outfile: `${directory}/worker.js`, bundle: true, format: 'esm', target: 'es2022',
  platform: 'neutral', mainFields: ['module', 'main'], conditions: ['workerd', 'worker', 'browser'], external: ['node:*'], sourcemap: true,
  plugins: [{name: 'dictionary-data', setup(build) { build.onResolve({filter: /dictionary\.gz$/}, () => ({path: './dictionary.gz', external: true})); }}],
});
console.log(JSON.stringify({words: data.words.length, originalBytes: Buffer.byteLength(original), compactBytes: Buffer.byteLength(compact), gzipBytes: (await readFile(`${directory}/dictionary.gz`)).length}));
