import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import AdmZip from 'adm-zip';

const allowed = /^(index\.html|licenses\.html|favicon\.svg|assets\/[^/]+\.(js|css)|audio\/[^/]+\.(wav|txt)|fonts\/chuan-zi-kai\.otf|licenses\/[^/]+\.(txt|TXT)|glyphs\/[a-z0-9]+\.json|glyphs-source\.zip)$/;
const source = /(^|\/)(src|server|shared|scripts|docs|reference-assets|\.git|node_modules)\/|\.(ts|tsx|map|md)$/i;

async function files(directory: string, prefix = ''): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const path = `${prefix}${entry.name}`;
    assert.ok(!entry.isSymbolicLink(), `发布产物包含符号链接：${path}`);
    if (entry.isDirectory()) result.push(...await files(join(directory, entry.name), `${path}/`));
    else result.push(path);
  }
  return result;
}

const paths = await files('dist');
assert.ok(paths.includes('index.html'), '发布产物缺少网页入口');
for (const path of paths) {
  assert.ok(allowed.test(path), `发布产物存在未允许的文件：${path}`);
  assert.ok(!source.test(path), `发布产物包含项目源码：${path}`);
  if (path.endsWith('.js')) assert.ok(!(await readFile(join('dist', path), 'utf8')).includes('sourceMappingURL='), `发布产物包含 source map 引用：${path}`);
  if (path.endsWith('.zip')) {
    const archive = new AdmZip(await readFile(join('dist', path)));
    for (const entry of archive.getEntries()) {
      assert.ok(!source.test(entry.entryName), `资料包包含项目源码：${entry.entryName}`);
      assert.ok(/^(data\/sources\/[^/]+\.jsonl|glyphs\/[a-z0-9]+\.json|licenses\/[^/]+\.(txt|TXT)|README\.txt)$/.test(entry.entryName), `资料包存在未允许的文件：${entry.entryName}`);
    }
  }
}
console.log(`网页发布检查通过：${paths.length} 个文件，字形资料包仅包含数据与许可。`);
