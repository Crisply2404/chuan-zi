# 中文游戏数据

`dictionary.json` 提供词语、完整读音、成语标签、DF、jieba 词频与汉字属性，服务端和规则测试直接读取此文件。词库文件可以直接编辑；执行 `npm run data:build` 可以根据固定原始资料重新生成。持续收录调整写入 `policy.json`。

搜索 `"word":"词语"` 可以核查当前是否收录，`idiom` 表示成语分类，`readings` 保存可接受的完整读音。收录词条仍需符合当前房间的词库、长度、提示及本局答案去重条件。西安当前因地名范围未收录；xī ān 的声母为 x 与零声母，读音本身可以匹配 x-∅。

## 收录规则

词语来自 CC-CEDICT / MDBG `2026-10-12T08:13:53Z` 固定快照，原始 gzip 和完整 JSON 保存在 `sources/`，SHA-256 见 `sources.json`。保留二至九个汉字的简体词条，每种读音的音节数量需要与汉字数量一致。一个词语保留其认可的完整读音集合；原始声调使用数字一至五保存，数字五表示轻声。

大写拼音和专名释义通过 `policy.json` 筛选，侮辱、粗俗和色情标签参与筛选；`excludedWords` 可以维护明确排除的词语。全部词条尚未经人工语言审核。

THUOCL 中有完整 CC-CEDICT 读音的词语进入成语集合；CC-CEDICT 释义标记 `(idiom)` 的词语同样进入成语集合。成语分类使用上述来源的标签。THUOCL 提供 DF，其他词语的 DF 为零。当前生成数据包含 89,098 个词语与 7,047 个成语分类词条，其中 THUOCL 完整读音交集为 5,142 个；统计见 `build-report.json`。

万象 RIME-LMDG 固定版本 `5da3670129a82aeb0b20c3081d48c4f05ebd794b` 作为审核后的补充。`wanxiang-supplement.json` 保存词形、完整读音、成语分类与审核依据，当前收录“寻路 / xún lù”。原始基础词库保存于 `sources/wanxiang-jichu-2026-10-14.dict.yaml`，构建检查 SHA-256，并使用 `csv-parse` 完整读取 TSV 数据部分；审核词条必须在固定来源中存在。

全部有效答案只使用 Make Me a Hanzi 覆盖的汉字。本次排除含未覆盖汉字的 334 个词语，保留 5,729 个有效答案汉字；原始来源、字符资料和未筛选原始词条文件继续保留。构建报告记录未覆盖字符、排除词数与有效字符数量。

`frequency` 来自固定版本 jieba 默认词典，未收录词语为零。电脑从全部合法且本局未使用的答案中，优先选择词频最高者，词频相同时参考 THUOCL DF，再参考词语长度。词频用于常见程度排序；玩家允许提交的答案集合由收录规则决定。专业词语筛选的研究与范围见 `docs/everyday-word-sources-2026-10-11.md`，明确排除项目保存在 `policy.json`。

`specialistDefinitionPatterns` 识别明确的专业领域释义；某条记录的全部主要释义都符合这些模式时，构建过程排除该记录。存在日常含义的记录继续参与其他收录检查。`retainedEverydayWords` 保存明确保留的日常名称，仅影响这项专业领域检查；`excludedWords` 始终具有优先级。当前筛选覆盖来源中能够识别的医学、化学与相关领域记录，全部词条尚未经人工专业领域审核。

拼音条件采用拼写单位：`y`、`w` 可作为提示和奖励声母，韵母保存声母符号后面的拼写。`yin` 对应 `y` 与 `in`，`you` 对应 `y` 与 `ou`，`liu` 对应 `l` 与 `iu`。完整拼音使用标准声调符号。题目声调条件使用第一至第四声，隐藏汉字位置显示 `*`，无声母或无韵母字段显示 `∅`。

## 汉字资料

字典部首分类来自 Unicode Unihan 18.0.0 的 `kRSUnicode`，使用 CJKRadicals 转为对应汉字。部首模式按实际常见部件形态匹配，使用 Make Me a Hanzi 的 IDS、matches 和 `strokeParts`；对应汉字需要包含其他笔画。例如“空穴来风”包含可绘制的宀部件，可以回答宀提示。字形部件通过 `parse-ids` 读取 IDS 并递归整理；生成与判定都需要真实笔画映射。原始资料、版本、摘要和许可证位于 `sources/`、`sources.json` 与 `licenses/`。

全部汉字格使用 Chuan Zi Kai，`scripts/prepare-glyph-font.ts` 将相同原始笔画轮廓通过 `opentype.js` 生成为 OpenType 字体。字体坐标为 1,024 units/em，ascender 为 900，descender 为 -124；逐笔 SVG 使用相同坐标与字号。部首提示笔画保持黑色，其余笔画使用玩家色。字体内保留 Arphic 版权、APL 名称、修改日期与内容，许可页提供完整字体、原始路径和修改资料。

## 数据许可

万象补充词形与读音使用 CC BY 4.0，署名 amzxyz / RIME-LMDG，固定来源与摘要见 `sources.json`，完整许可见 `../licenses/Wanxiang.txt`。修改包含审核选择、拼音字段转换和字形覆盖筛选，公开资料无担保。

词语和拼音按 CC BY-SA 4.0 发布，来源为 CC-CEDICT contributors / MDBG，原文使用固定版本 CedictParser 转换为完整 JSON。修改包含词语长度筛选、收录筛选、读音去重、拼音字段与成语分类。全文见 `../licenses/CC-CEDICT.txt`。

THUOCL 原始资料和 DF 使用 MIT，版权为 THUNLP；全文见 `../licenses/THUOCL.txt`。Unicode 部首资料使用 Unicode License v3，全文见 `../licenses/Unicode.txt`。

jieba 原始默认词典与词频使用 MIT，版权为 `Copyright (c) 2013 Sun Junyi`。固定版本和 SHA-256 见 `sources.json`；完整许可见 `../licenses/Jieba.txt`。

Make Me a Hanzi 字形部件和常用部首形式使用 LGPL-3.0-or-later，保留完整原始 dictionary、固定版本、来源说明、修改说明与 LGPL/GPL 全文。文件见 `sources/makemeahanzi-dictionary.jsonl`、`../licenses/MakeMeAHanzi-*`、`../licenses/GPL-3.0.txt`。这些资料允许免费商业使用；发布派生资料时继续遵守各部分的许可。

逐笔 SVG 路径来自同一固定版本 graphics，采用 Arphic Public License，允许免费商业使用。`strokeParts` 从 dictionary 的 IDS 与 matches 生成；嵌套部件只有在完整笔画数量一致时转移索引。部首判定要求具有对应索引，绘制使用真实笔画。构建生成按汉字请求的 JSON 与 `glyphs-source.zip`，包含原始资料、可编辑的修改 JSON 和完整许可；许可页提供下载。

`strokeCount` 记录完整笔画数量；部首的提示笔画数量必须小于完整数量，保证汉字包含其它补全笔画。初始化检查笔画总数与索引范围，提示生成、草稿和最终提交使用相同规则。

## 易误写提醒

`common-mistakes.json` 只收录用户亲自发现并明确要求添加、输入法未识别的易误写表达。每项只保存 `incorrect` 和 `correct`，当前为“不可置否→不置可否”。用户可以直接维护这个文件；网页、Node 服务和 Cloudflare 共同读取。输入完整错误词形后，在答案格下方显示正确写法；错误表达继续拒绝提交，正确表达仍遵守当前提示、词库与长度条件。

对应集合按 CC0 1.0 发布，提醒文案由项目编写。维护说明见 `docs/common-misspellings-research-2026-10-13.md`。
