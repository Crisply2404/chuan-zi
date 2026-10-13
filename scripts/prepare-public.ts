import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';

await mkdir('public/licenses', { recursive: true });
for (const file of await readdir('public/licenses')) await rm(`public/licenses/${file}`);
for (const file of await readdir('licenses')) await copyFile(`licenses/${file}`, `public/licenses/${file}`);
await copyFile('licenses/MakeMeAHanzi-APL.txt', 'public/licenses/ARPHICPL.TXT');
await copyFile('node_modules/lucide-react/LICENSE', 'public/licenses/Lucide.txt');
await copyFile('node_modules/react/LICENSE', 'public/licenses/React.txt');
await copyFile('node_modules/pinyin-utils/LICENSE', 'public/licenses/PinyinUtils.txt');
