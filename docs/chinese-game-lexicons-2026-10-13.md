# 中文词库与词语游戏资料核查

研究日期：2026-10-13（Asia/Shanghai）。使用 `research` Skill。研究资料保存在 `.research/chinese-game-lexicons-2026-10-13/`，其中包含固定版本源码、网页全文、数据快照、运行页面记录与复核脚本。

## 本轮指定词语

### 旋转

当前 `data/dictionary.json` 收录“旋转”，来源字段为 `CC-CEDICT`、`jieba`，普通词语标签为 `idiom: false`，jieba 词频为 1307。完整读音为 `xuan2 zhuan3`，声母为 `x`、`zh`，韵母为 `uan`、`uan`，声调为二声、三声。当前数据摘要为 `53a9f486f54313b3264f080c71aa95fec269c40e6fe744cb8ed77e4a58520943`；完整结果见 `.research/chinese-game-lexicons-2026-10-13/audit.json`。

CC-CEDICT 的当前下载版本（MDBG 文件元数据日期 2026-10-12，125263 条）同样记录：`旋轉 旋转 [xuan2 zhuan3] /to rotate/to revolve/to spin/to whirl/`。该文件压缩摘要为 `a04c03deb9aab384df952d99194099a17d628ff57d11c8b132fe0519e691a247`，元数据与完整查询结果见 `.research/chinese-game-lexicons-2026-10-13/current-cedict-audit.json`。汉典“旋转”页面给出的拼音为 `xuán zhuǎn`，词语解释包括围绕中心运动、扭转和晕眩；这与二声、三声一致。

因此，截图中提示第二个字为第四声时，“旋转”没有通过是条件判定结果：当前词典读音第三声 `zhuǎn` 与提示第四声不相同。`旋转` 的词语本身已经有可靠的二声、三声证据，没有证据支持将它改成第四声。

### 独享

当前 `data/dictionary.json` 收录“独享”，来源字段为 `CC-CEDICT`、`jieba`，普通词语标签为 `idiom: false`，jieba 词频为 3。完整读音为 `du2 xiang3`，声母为 `d`、`x`，韵母为 `u`、`iang`，声调为二声、三声。

CC-CEDICT 当前下载版本已经收录：`獨享 独享 [du2 xiang3] /to have sth to oneself/`。CC-CEDICT Editor 的当前查询页面确认该条目，最近修订记录 97664（2026-09-13）将释义修改为 `to have sth to oneself`，并保留 `du2xiang3` 读音。汉典“独享”页面给出 `dú xiǎng`，释义为独自享有或享受；Wiktionary 页面给出 `dúxiǎng` 与“to keep for oneself without sharing”。

产品词库采用 MDBG `2026-10-12T08:13:53Z` 固定快照，已经重新执行长度、汉字、释义标签、专业领域与明确排除筛选。“独享”可以回答 `d-x` 提示；真实 `WordRules` 判定检查通过，来源、版本、原始文件、摘要与许可证保存于 `data/sources.json` 和 `licenses/`。

## 现有数据质量与适用范围

当前项目词语来自 CC-CEDICT / MDBG `2026-10-12T08:13:53Z` 固定快照，成语分类结合 THUOCL 与 CC-CEDICT `(idiom)` 标记，常见程度参考固定版 jieba；构建时另行执行明确排除和专业释义筛选。`data/dictionary.json` 当前包含 89,431 个词语，其中 7,050 个标记为成语，THUOCL 完整读音交集为 5,142 个。当前 `policy.json` 明确排除“到家”“亲亲”和用户此前指出的专业名称。

CC-CEDICT 官方资料说明其目标是可下载的中文—英文词典，编辑优先收录现代使用中的词语；提交规则说明仍会保留历史内容并承认存在错误、遗漏和需要审核的记录。格式说明要求数字声调，轻声使用数字 5，同时明确提醒数据库并非专门的机器处理资源，使用者需要自行核查词条。CC-CEDICT 使用 CC BY-SA 4.0，可免费商业使用；发布整理后的词语和读音数据需要保留署名、来源、许可证、修改说明，并遵守 ShareAlike。

THUOCL 成语文件有 8,519 条唯一候选，MIT License 允许商业使用；它提供新闻文档频次，却没有逐条释义、拼音或部首证据。已有研究已确认 `AllanChain/chinese-wordle` 的 `reviewed.txt` 有 1,421 条人工筛选成语，来源主要为 THUOCL，BSD-3-Clause 允许商业使用；它只有成语名称。`cheeaun/chengyu-wordle` 的 `game-idioms.csv` 有 7,209 条成语候选，生成脚本说明主要从 THUOCL 的四字词筛选，并与 `pwxcoo/chinese-xinhua` 及汉典拼音数据交叉处理；项目代码使用 MIT。两份名单都没有“普通词语＋成语＋排除口语组合与专业名称”的完整承诺，适合作为成语模式候选或人工筛选参考。

当前没有核实到一份已经同时满足以下全部条件的现成词库：独立普通词语与成语、明确排除口语组合与专业名称、完整词语级读音、明确免费商业授权和逐条收录证据。继续使用项目的可追溯组合，并通过 `data/policy.json` 维护排除项，仍然是当前具有完整证据的安排。

## 可用于补充调查的中文词语游戏

### 拼成语（AllanChain）

运行页面：<https://allanchain.github.io/chinese-wordle/>。2026-10-13 使用 Chrome 真实打开，页面标题为“拼成语”，存在可输入答案的文本框，页面说明其玩法为按照声母和韵母猜成语。网页声明待猜成语主要来自 THUOCL 成语词频表并经过人工简单筛选，验证输入成语数量更大，选取和注音主要来自汉典，并使用 `pypinyin` 自动校对。固定仓库版本 `6838dde35e795ed8b81fa705d240c7f570d9d1a1` 的 `data/reviewed.txt` 共 1,421 条唯一成语，`process_idioms.py` 公开了从 THUOCL、新华词典资料和汉典数据生成拼音的处理过程。仓库许可证为 BSD-3-Clause，允许商业使用并要求保留版权、许可和免责声明。

适合 REA 研究：页面加载 `assets/index.25a26867.js`，仓库源码、数据和生成脚本公开；可以用 REA 分析拼音字段、提示生成和成语筛选。该项目覆盖成语玩法。

### Chengyu Wordle（Chee Aun）

运行页面：<https://cheeaun.github.io/chengyu-wordle/>。真实 Chrome 页面可交互显示四字成语输入键盘、拼音、颜色判定与游戏规则。固定仓库版本 `5ec647179054dd334bc8490d53bf75b6cf058ffa` 的 `scripts/gen-data.mjs` 说明：从 THUOCL 的四字成语频次列表筛选游戏成语，并使用 `data/idioms.json` 与拼音资料生成游戏数据；项目 `package.json` 和在线 MIT 页面确认代码采用 MIT License。仓库数据 README 明确标出数据来源为 `pwxcoo/chinese-xinhua`、THUOCL，并提醒数据属于游戏资料。

适合 REA 研究：页面加载 `all-idioms`、`game-idioms` 和 `pinyin-data` 脚本；可以研究成语筛选、输入状态、重复反馈、格子翻转和拼音显示。项目只覆盖成语 Wordle，数据许可需要将代码许可与上游词语资料许可分别记录。

### 汉兜

运行页面：<https://handle.antfu.me/>。真实 Chrome 页面显示汉字、声母、韵母和声调独立判定的四字词语游戏，并公开 Source Code 链接。项目源码与数据处理已在 `docs/handle-tone-research-2026-10-11.md` 完整核查；可用 REA 研究声调定位、拼音字段、动画和词语数据加载。汉兜代码使用 MIT，仓库资料同时声明部分词语和读音数据来自其他项目，不能将汉兜代码许可证直接当作其全部数据许可证。

## 许可与数据来源链接

- CC-CEDICT 主页：<https://cc-cedict.org/wiki/>；格式：<https://cc-cedict.org/wiki/syntax_v2>；提交规则：<https://cc-cedict.org/wiki/guidelines>；当前条目查询：<https://cc-cedict.org/editor/editor.php?handler=QueryDictionary&querydictionary_search=%E7%8D%A8%E4%BA%AB&querydictionary_searchmode=trad>；修订记录：<https://cc-cedict.org/editor/editor.php?log_id=97664&popup=1&handler=ViewLogEntry>。
- CC-CEDICT 2026-10-12 完整下载快照：<https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz>。本轮使用第三方 `matt-tingen/cedict-json` 的 `CedictParser` 完整读取原始文件，固定提供者版本为 `b9d9f9da3bc5e307e43de91b2189c047b2cbce8b`；生成 JSON 摘要为 `fcf2d8875620d949854d18b091ac8dd8b7c38c18c0ce32c03cdf5ece00fee478`。
- CC BY-SA 4.0 完整许可：<https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt>。
- 汉典“旋转”：<https://www.zdic.net/hans/%E6%97%8B%E8%BD%AC>；汉典“独享”：<https://www.zdic.net/hans/%E7%8B%AC%E4%BA%AB>。
- Wiktionary“独享”：<https://en.wiktionary.org/wiki/%E7%8D%A8%E4%BA%AB>；页面内容采用 CC BY-SA 4.0，页面版本为 2023-06-23。
- `mozillazg/phrase-pinyin-data`：<https://github.com/mozillazg/phrase-pinyin-data>。README 说明其 `zdic_cibs.txt`、`zdic_cybs.txt`、`cc_cedict.txt` 和合并数据，仓库 MIT；数据文件中记录 `独享: dú xiǎng`、`旋转: xuán zhuǎn`。它适合拼音交叉核查，缺少完整收录筛选与普通词语质量保证。
- 拼成语固定版本 README：<https://raw.githubusercontent.com/AllanChain/chinese-wordle/6838dde35e795ed8b81fa705d240c7f570d9d1a1/README.md>；处理代码：<https://raw.githubusercontent.com/AllanChain/chinese-wordle/6838dde35e795ed8b81fa705d240c7f570d9d1a1/data/process_idioms.py>；人工名单：<https://raw.githubusercontent.com/AllanChain/chinese-wordle/6838dde35e795ed8b81fa705d240c7f570d9d1a1/data/reviewed.txt>；完整 BSD-3-Clause：<https://raw.githubusercontent.com/AllanChain/chinese-wordle/6838dde35e795ed8b81fa705d240c7f570d9d1a1/LICENSE>。
- Chengyu Wordle 固定版本 README：<https://raw.githubusercontent.com/cheeaun/chengyu-wordle/5ec647179054dd334bc8490d53bf75b6cf058ffa/README.md>；生成代码：<https://raw.githubusercontent.com/cheeaun/chengyu-wordle/5ec647179054dd334bc8490d53bf75b6cf058ffa/scripts/gen-data.mjs>；在线 MIT：<https://cheeaun.mit-license.org/>。

## 可复核资料

- `.research/chinese-game-lexicons-2026-10-13/audit.json`：当前产品词库、jieba、AllanChain 和 Chee Aun 数据统计，另含 `cedict-json@1.3.20251213` 的查询记录。
- `.research/chinese-game-lexicons-2026-10-13/current-cedict-audit.json`：MDBG 2026-10-12 CC-CEDICT 下载元数据、摘要和“旋转”“独享”记录。
- `.research/chinese-game-lexicons-2026-10-13/sites-runtime.json`：三个网页真实运行读取结果。
- `.research/chinese-game-lexicons-2026-10-13/audit.mjs`、`audit-current-cedict.ts`、`check-sites.mjs`：复核脚本。
- `.research/chinese-game-lexicons-2026-10-13/phrase-pinyin-data/`、`allan-chinese-wordle/`、`cheeaun-chengyu-wordle/`、`complete-hsk-vocabulary/`、`chinese-xinhua/`、`cedict-json-provider/`：完整研究资料和固定版本源码。

