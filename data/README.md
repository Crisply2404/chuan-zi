# 中文游戏数据

`dictionary.json` 提供词语、完整读音、成语标签、DF 与汉字属性，服务端和规则测试直接读取此文件。词库文件可以直接编辑；执行 `npm run data:build` 可以根据固定原始资料重新生成。持续收录调整写入 `policy.json`。

## 收录规则

词语来自 `cedict-json@1.3.20251213`，保留二至九个汉字的简体词条，每种读音的音节数量需要与汉字数量一致。一个词语保留其认可的完整读音集合；原始声调使用数字一至五保存，数字五表示轻声。

大写拼音和专名释义通过 `policy.json` 筛选，侮辱、粗俗和色情标签参与筛选；`excludedWords` 可以维护明确排除的词语。全部词条尚未经人工语言审核。

THUOCL 中有完整 CC-CEDICT 读音的词语进入成语集合；CC-CEDICT 释义标记 `(idiom)` 的词语同样进入成语集合。成语分类使用上述来源的标签。THUOCL 提供 DF，其他词语的 DF 为零。当前生成数据包含 88,613 个词语与 7,133 个成语分类词条，其中 THUOCL 完整读音交集为 5,042 个；统计见 `build-report.json`。

拼音条件采用拼写单位：`y`、`w` 可作为提示和奖励声母，韵母保存声母符号后面的拼写。`yin` 对应 `y` 与 `in`，`you` 对应 `y` 与 `ou`，`liu` 对应 `l` 与 `iu`。完整拼音使用标准声调符号。提示声调范围应用于显示的位置，隐藏位置继续保留 `*`。

## 汉字资料

部首来自 Unicode Unihan 18.0.0 的 `kRSUnicode`，使用 CJKRadicals 转为对应汉字；Make Me a Hanzi 的 `radical` 字段补充常用部首形式。字形部件通过 `parse-ids` 读取 IDS 并递归整理。原始资料、版本、摘要和许可证位于 `sources/`、`sources.json` 与 `licenses/`。

## 数据许可

词语和拼音按 CC BY-SA 4.0 发布，来源为 CC-CEDICT contributors，通过固定版本的 cedict-json 整理。修改包含词语长度筛选、收录筛选、读音去重、拼音字段与成语分类。全文见 `../licenses/CC-CEDICT.txt`。

THUOCL 原始资料和 DF 使用 MIT，版权为 THUNLP；全文见 `../licenses/THUOCL.txt`。Unicode 部首资料使用 Unicode License v3，全文见 `../licenses/Unicode.txt`。

Make Me a Hanzi 字形部件和常用部首形式使用 LGPL-3.0-or-later，保留完整原始 dictionary、固定版本、来源说明、修改说明与 LGPL/GPL 全文。文件见 `sources/makemeahanzi-dictionary.jsonl`、`../licenses/MakeMeAHanzi-*`、`../licenses/GPL-3.0.txt`。这些资料允许免费商业使用；发布派生资料时继续遵守各部分的许可。
