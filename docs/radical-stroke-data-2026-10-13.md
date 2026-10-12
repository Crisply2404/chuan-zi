# 汉字内的部首笔画着色

研究日期：2026-10-13，Asia/Shanghai。Skill：`research`。

## 使用数据与许可

使用 Make Me a Hanzi 固定版本 `bddc96d41bef78427ed0e034e9f7e31d71fd1b92` 的 `dictionary.txt` 与 `graphics.txt`。两份资料均包含 9,574 个记录，可以按 `character` 合并。此次逐条读取全部 JSON Lines，9,574 个汉字均满足 `matches.length === strokes.length === medians.length`。

- `dictionary.txt` 的 `decomposition` 与 `matches` 提供部件和笔画的联系；采用 LGPL-3.0-or-later。已有完整原始资料、COPYING、LGPL 与 GPL 文本。
- `graphics.txt` 的 `strokes` 是每一笔的 SVG 路径；来自 Arphic PL KaitiM GB 与 Arphic PL UKai 字体，采用 Arphic Public License。原始文件已保存为 `data/sources/makemeahanzi-graphics.jsonl`，SHA-256 为 `a28c478b5178e98f67f510b2d52fde08a69dc664654ef43498253b9b764d46ee`。完整英文许可保存为 `licenses/MakeMeAHanzi-APL.txt`，SHA-256 为 `3a5e90c0957524a89e48203febcd4492ca4393678abaa7e5b4d70f3ff32b386d`。

Arphic Public License 的定义允许收取分发服务费用，第一条允许保留完整许可后在任何介质复制和分发。第二条允许修改字形与转换格式，要求在每个修改文件中说明修改内容和日期，将全部修改结果依同一许可提供给第三方。第二条同时说明，独立且可分别识别的其他作品保留自身许可。因此网页游戏可以免费或商业使用这些路径，所发布的路径资料继续保持 Arphic Public License，保存版权、完整许可、来源及修改说明，并让玩家可以取得资料。

派生部件笔画索引继续保留上游 LGPL-3.0-or-later、完整可修改原始资料、COPYING、LGPL/GPL 文本、生成说明与修改日期。笔画路径和部件映射可以分别发布为可编辑 JSON 资料，通过许可页面提供下载。两类资料各自保持来源许可。

已完整阅读官方固定版本 README、COPYING、Arphic Public License，以及项目保存的 LGPL/GPL。数据已由现有 `jsonlines` 库完整解析。

来源：

- [Make Me a Hanzi 固定版本 README](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/README.md)
- [COPYING](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/COPYING)
- [dictionary.txt](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/dictionary.txt)
- [graphics.txt](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/graphics.txt)
- [Arphic Public License](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/APL/english/ARPHICPL.TXT)

## 笔画选择

`decomposition` 使用 IDS，构建过程使用已有 `parse-ids` 库读取。该库的 `children()` 返回节点的有序子节点，顺序符合上游 `matches` 的路径定义。`matches[index]` 保存第 `index` 笔所属部件在当前 IDS 中的路径；`null` 表示没有可用映射。索引从零开始。

构建过程针对每个部首或字形部件查找它在 IDS 中的位置。路径相同的 `matches` 对应提示笔画，保存这些 `strokes` 索引。匹配后的完整汉字以全部 SVG 路径绘制，提示索引使用黑色，其余笔画使用橙色。

SVG 使用上游坐标：`viewBox="0 0 1024 1024"`，内部 `<g transform="scale(1,-1) translate(0,-900)">`。每个 `<path>` 保留原始 `d`，通过 `fill` 指定颜色。此过程选择真实笔画，完整汉字可以同时显示两种颜色。

有些汉字的第一层 IDS 使用整个部件，例如“密”表示为 `⿱宓山`。需要继续读取“宓”的部件映射。父字中属于“宓”的笔画按原笔顺排列，当这些笔画数量与“宓”的笔画数量相等时，使用“宓”中“宀”的索引得到父字中对应笔画。数量不同或映射缺失时记录为未覆盖，禁止猜测位置。

已核对实例：

| 汉字 | 提示 | 上游 IDS | 黑色笔画索引 | 橙色笔画索引 |
| --- | --- | --- | --- | --- |
| 冰 | 冫 | `⿰冫水` | `0,1` | `2,3,4,5` |
| 清 | 氵 | `⿰氵青` | `0,1,2` | `3,4,5,6,7,8,9,10` |
| 凉 | 冫 | `⿰冫京` | `0,1` | `2,3,4,5,6,7,8,9` |
| 家 | 宀 | `⿱宀豕` | `0,1,2` | `3,4,5,6,7,8,9` |
| 密 | 宀 | `⿱宓山`，宓为 `⿱宀必` | `0,1,2` | `3,4,5,6,7,8,9,10` |
| 荒 | 艹 | `⿱芒川`，芒为 `⿱艹亡` | `0,1,2` | `3,4,5,6,7,8` |
| 渠 | 氵 | `⿱洰木`，洰为 `⿰氵巨` | `0,1,2` | `3,4,5,6,7,8,9,10` |
| 劄 | ⺮ | `⿰答刂`，答为 `⿱⺮合` | `0,1,2,3,4,5` | `6,7,8,9,10,11,12,13` |
| 清 | 月 | `⿰氵青`，青为 `⿱龶月` | `7,8,9,10` | `0,1,2,3,4,5,6` |

“冰”原始 `matches` 为 `[[0],[0],[1],[1],[1],[1]]`，六个路径的前两笔形成左侧冫。“清”原始 `matches` 的前三项均为 `[0]`，其余八项为 `[1]`。上述索引依据原始数据计算。

## 覆盖范围

当前游戏资料包含 5,937 个不同汉字。现有 `commonRadicals` 对应 2,116 个“汉字、部首”组合，通过直接 IDS 或有完整笔顺对应的嵌套部件可映射 2,099 个，覆盖约 99.20%。此数字只描述数据映射覆盖；本次未逐个核查笔顺在复合字中是否存在地方书写差异。

| 部首 | 当前候选组合 | 已取得笔画映射 |
| --- | ---: | ---: |
| 氵 | 250 | 250 |
| 扌 | 242 | 242 |
| 忄 | 118 | 118 |
| 艹 | 278 | 277 |
| 宀 | 56 | 56 |
| 讠 | 121 | 121 |
| 纟 | 113 | 112 |
| 钅 | 134 | 131 |
| 灬 | 19 | 19 |
| 辶 | 93 | 93 |
| 阝 | 64 | 64 |
| 犭 | 58 | 58 |
| 饣 | 46 | 40 |
| 衤 | 46 | 46 |
| 礻 | 23 | 23 |
| 冫 | 22 | 21 |
| 疒 | 85 | 83 |
| 亻 | 183 | 181 |
| 刂 | 46 | 46 |
| 囗 | 28 | 27 |
| ⺮ | 91 | 91 |

未覆盖的十七个组合：`冬/冫`、`修/亻`、`倏/亻`、`兹/艹`、`䌽/纟`、`圐/囗`、`𨰿/钅`、`痎/疒`、`瘆/疒`、`𫓴/钅`、`𬭁/钅`、`𫗦/饣`、`馃/饣`、`馉/饣`、`饳/饣`、`馎/饣`、`饦/饣`。

“冬”的实际部件形式为 `⺀`，Unihan 分类与提示 `冫` 的字形存在区别。“修”和“倏”的 IDS 使用“攸”，父字中的该部件包含六笔，独立“攸”包含七笔，因此不能根据独立笔顺直接转移全部索引。“兹”的 IDS 为 `⿳八一⿰幺幺`，缺少表示 `艹` 的部件路径。其余十三个字符缺少该固定版本图形资料。

规则生成与答案草稿应共同采用已确认的笔画映射，只有能绘制原有提示笔画的组合进入部首条件匹配。未覆盖字符可以继续参与其余条件。构建统计保留覆盖数量和未覆盖组合，缺少需要发布的数据时立即报告错误。

研究脚本与完整统计位于 `.research/analyze-radical-stroke-data.mjs`、`.research/radical-stroke-data-analysis.json`，均使用真实原始资料，无测试替代数据。

## Hanzi Writer 的 `radStrokes`

Hanzi Writer Data 的官方 README 明确说明数据来自 Make Me a Hanzi，并采用 Arphic Public License。当前固定版本 `68d10a4b21150cae5e1ebbd223eed289cf32d90c` 的 `stroke_data_parser.py` 通过 `radical` 在本字 IDS 中的第一条相同路径计算 `radStrokes`，只接受与该路径完全相等的 `matches`。

已取得“冰”的 `radStrokes: [0,1]` 和“清”的 `radStrokes: [0,1,2]`，与上述原始映射一致。这个字段适合已具有直接部首路径的汉字；该生成脚本没有继续读取嵌套部件，且只保存一个主要部首。因此构建全部字形部件提示需要原始 `matches`；当前项目已有原始 dictionary，可以合并固定版本 graphics 生成所需索引。

已完整阅读官方 README 与固定版本生成脚本。

来源：

- [Hanzi Writer Data README](https://raw.githubusercontent.com/chanind/hanzi-writer-data/68d10a4b21150cae5e1ebbd223eed289cf32d90c/README.md)
- [数据生成脚本](https://raw.githubusercontent.com/chanind/hanzi-writer-data/68d10a4b21150cae5e1ebbd223eed289cf32d90c/stroke_data_parser.py)
- [冰的资料](https://raw.githubusercontent.com/chanind/hanzi-writer-data/68d10a4b21150cae5e1ebbd223eed289cf32d90c/data/%E5%86%B0.json)
- [清的资料](https://raw.githubusercontent.com/chanind/hanzi-writer-data/68d10a4b21150cae5e1ebbd223eed289cf32d90c/data/%E6%B8%85.json)
