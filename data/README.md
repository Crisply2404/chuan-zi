# 中文游戏数据

`dictionary.json` 提供词语、完整读音、成语标签、DF、jieba 词频与汉字属性，服务端和规则测试直接读取此文件。词库文件可以直接编辑；执行 `npm run data:build` 可以根据固定原始资料重新生成。持续收录调整写入 `policy.json`。

## 收录规则

词语来自 CC-CEDICT / MDBG `2026-10-12T08:13:53Z` 固定快照，原始 gzip 和完整 JSON 保存在 `sources/`，SHA-256 见 `sources.json`。保留二至九个汉字的简体词条，每种读音的音节数量需要与汉字数量一致。一个词语保留其认可的完整读音集合；原始声调使用数字一至五保存，数字五表示轻声。

大写拼音和专名释义通过 `policy.json` 筛选，侮辱、粗俗和色情标签参与筛选；`excludedWords` 可以维护明确排除的词语。全部词条尚未经人工语言审核。

THUOCL 中有完整 CC-CEDICT 读音的词语进入成语集合；CC-CEDICT 释义标记 `(idiom)` 的词语同样进入成语集合。成语分类使用上述来源的标签。THUOCL 提供 DF，其他词语的 DF 为零。当前生成数据包含 89,431 个词语与 7,050 个成语分类词条，其中 THUOCL 完整读音交集为 5,142 个；统计见 `build-report.json`。

`frequency` 来自固定版本 jieba 默认词典，未收录词语为零。电脑从全部合法且本局未使用的答案中，优先选择词频最高者，词频相同时参考 THUOCL DF，再参考词语长度。词频用于常见程度排序；玩家允许提交的答案集合由收录规则决定。专业词语筛选的研究与范围见 `docs/everyday-word-sources-2026-10-11.md`，明确排除项目保存在 `policy.json`。

`specialistDefinitionPatterns` 识别明确的专业领域释义；某条记录的全部主要释义都符合这些模式时，构建过程排除该记录。存在日常含义的记录继续参与其他收录检查。`retainedEverydayWords` 保存明确保留的日常名称，仅影响这项专业领域检查；`excludedWords` 始终具有优先级。当前筛选覆盖来源中能够识别的医学、化学与相关领域记录，全部词条尚未经人工专业领域审核。

拼音条件采用拼写单位：`y`、`w` 可作为提示和奖励声母，韵母保存声母符号后面的拼写。`yin` 对应 `y` 与 `in`，`you` 对应 `y` 与 `ou`，`liu` 对应 `l` 与 `iu`。完整拼音使用标准声调符号。提示声调范围应用于显示的位置，隐藏位置显示 `∅`。

## 汉字资料

字典部首分类来自 Unicode Unihan 18.0.0 的 `kRSUnicode`，使用 CJKRadicals 转为对应汉字。部首模式按实际常见部件形态匹配，使用 Make Me a Hanzi 的 IDS、matches 和 `strokeParts`；对应汉字需要包含其他笔画。例如“空穴来风”包含可绘制的宀部件，可以回答宀提示。字形部件通过 `parse-ids` 读取 IDS 并递归整理；生成与判定都需要真实笔画映射。原始资料、版本、摘要和许可证位于 `sources/`、`sources.json` 与 `licenses/`。

## 数据许可

词语和拼音按 CC BY-SA 4.0 发布，来源为 CC-CEDICT contributors / MDBG，原文使用固定版本 CedictParser 转换为完整 JSON。修改包含词语长度筛选、收录筛选、读音去重、拼音字段与成语分类。全文见 `../licenses/CC-CEDICT.txt`。

THUOCL 原始资料和 DF 使用 MIT，版权为 THUNLP；全文见 `../licenses/THUOCL.txt`。Unicode 部首资料使用 Unicode License v3，全文见 `../licenses/Unicode.txt`。

jieba 原始默认词典与词频使用 MIT，版权为 `Copyright (c) 2013 Sun Junyi`。固定版本和 SHA-256 见 `sources.json`；完整许可见 `../licenses/Jieba.txt`。

Make Me a Hanzi 字形部件和常用部首形式使用 LGPL-3.0-or-later，保留完整原始 dictionary、固定版本、来源说明、修改说明与 LGPL/GPL 全文。文件见 `sources/makemeahanzi-dictionary.jsonl`、`../licenses/MakeMeAHanzi-*`、`../licenses/GPL-3.0.txt`。这些资料允许免费商业使用；发布派生资料时继续遵守各部分的许可。

逐笔 SVG 路径来自同一固定版本 graphics，采用 Arphic Public License，允许免费商业使用。`strokeParts` 从 dictionary 的 IDS 与 matches 生成；嵌套部件只有在完整笔画数量一致时转移索引。部首判定要求具有对应索引，绘制使用真实笔画。构建生成按汉字请求的 JSON 与 `glyphs-source.zip`，包含原始资料、修改资料、生成源文件和完整许可；许可页提供下载。

`strokeCount` 记录完整笔画数量；部首的提示笔画数量必须小于完整数量，保证汉字包含其它补全笔画。初始化检查笔画总数与索引范围，提示生成、草稿和最终提交使用相同规则。
