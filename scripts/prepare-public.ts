import { copyFile, mkdir, readdir } from 'node:fs/promises';

await mkdir('public/licenses', { recursive: true });
for (const file of await readdir('licenses')) await copyFile(`licenses/${file}`, `public/licenses/${file}`);
await copyFile('node_modules/lucide-react/LICENSE', 'public/licenses/Lucide.txt');
await copyFile('node_modules/react/LICENSE', 'public/licenses/React.txt');
await copyFile('node_modules/pinyin-utils/LICENSE', 'public/licenses/PinyinUtils.txt');
