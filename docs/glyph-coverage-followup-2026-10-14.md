# 汉字覆盖与逐笔部件资料核查

日期：2026-10-14，Asia/Shanghai。使用 Skill：`research`。本次只研究用户问题，产品字体继续采用用户已经选择的 Make Me a Hanzi 楷体。

## 194 个未覆盖汉字的使用范围

比较依据为字形筛选前的真实词库 `2ab5c89:data/dictionary.json` 和固定 Make Me a Hanzi graphics。前者包含 89,431 个词语、5,945 个不同汉字；后者有 9,574 个字形记录。两者差集为 194 个汉字，影响 334 个原有词语。[S1]

字形缺失只能说明该固定资料未收录对应字符。现有证据无法把全部 194 个字符划定为生僻字。本次差集中有下列日常事物或生活表达对应词语，原始 CC-CEDICT 保存其完整读音与释义：[S1][S2]

| 汉字 | 原有词语 | 来源释义的内容 |
| --- | --- | --- |
| 粿 | 粿条、菜头粿 | 米制食品，粿条为扁平米粉 |
| 獴 | 狐獴 | meerkat |
| 醂 | 味醂 | 日本料理中的 cooking wine |
| 捯 | 捯饬 | 打扮、整理，词典标为口语 |
| 牤 | 牤牛 | 公牛 |
| 瘆 | 瘆人 | 令人害怕 |

这些例子证明字形缺失会影响已有的可理解词语；各词语在不同地区与使用者中的熟悉程度有差异。本次没有把词典收录或字形覆盖作为全国日常使用频率的证明。

AnimCJK 固定 dictionary 的资料分类提供进一步依据：194 个字符与其频繁使用的 3,500 个简体汉字集合没有交集，与其另外 3,500 个常用汉字集合有 40 个交集，包括捯、獴、瘆、藠、馃、齁等。作者把后一集合标为 `commonNotFrequent3500`。这些标记来自该项目，不能代替全部 194 个字符的权威常用程度评级。[S3]

## 全部 5,945 个汉字的单一字形来源

[Jigmo 官方字体](https://kamichikoichi.github.io/jigmo/)的 2025-09-12 版本已完整下载，并通过 `opentype.js` 读取三份官方 TTF 的字符映射。全部 5,945 个汉字都有字形映射，包含上述 194 个字符。下载 ZIP 为 35,559,738 bytes，SHA-256 为 `5744c7386d129475d87607ca66d043c8793c65448adeaedc921b6931890e5d0b`。完整 ZIP 中的 `LICENSE.txt` 与既有研究保存的 CC0 1.0 全文逐字节一致。[S4]

Jigmo 是同一项目和同一生成体系，官方按 Unicode 区域提供 `Jigmo.ttf`、`Jigmo2.ttf` 与 `Jigmo3.ttf`。官方说明全部字形来自 GlyphWiki，由 KAGE、Clipper、FontForge 与 TTX 生成。它的字体许可允许免费商业使用和修改。[S4][S5]

[GlyphWiki 完整资料包](https://glyphwiki.org/dump.tar.gz)也已经按全部词库字符核查。完整最新记录共 2,127,039 条；5,945／5,945 个字符具有 `u<Unicode>` 基础字形，5,893／5,945 个字符还具有 `-g` 中国地区字形记录。全部资料可由同一 KAGE 系统产生字形。[S6]

## 逐笔轮廓与部件归属

游戏逐笔颜色需要三项资料：完整汉字轮廓、各笔画的轮廓、每个部首或提示部件对应的笔画索引。单独字体文件的字符映射只能证明完整字形存在。[S7]

GlyphWiki 原始数据保存 KAGE 笔画骨架和部件引用。现有 KAGE 库的 `makeGlyph3()` 可以逐项生成轮廓；`getEachStrokesOfBuhin()` 展开部件并应用位置变换。以“冰”为例，资料引用 `u51ab-01` 和 `u6c34-02`，能够识别两点水与水两部分并分别绘制。[S6][S8]

一个书写笔画可以由多个绘制片段组成。本次“冰”的 KAGE 图形包含八个绘制片段，两点水由三个片段组成，右侧水由五个片段组成；正常书写笔顺为六笔。因此这些片段可以用于部件颜色，但还需要记录它们与完整笔画的联系，才能满足游戏当前的逐笔索引含义。[S8]

完整 GlyphWiki 资料的目录覆盖已经确认。全量 KAGE 绘制还需要解析资料中的固定历史版本引用，例如 `u5df4-02@2`；官方资料包通过 `dump_all_versions.txt` 保存这些版本。现有核查只完成目录覆盖、部件结构和代表字符的真实绘制，未把完整字形目录当作全部 5,945 个汉字已经具有审核后部首归属的证据。[S6][S8]

Jigmo TTF 包没有逐笔部首与任意提示部件索引。GlyphWiki 的部件引用能够帮助生成这些索引，但本次尚未核实一套覆盖全部 5,945 个汉字、并直接适用本项目全部部首和字形部件条件的现成归属文件。保留同一字形系统可以完成全覆盖显示；游戏所需的逐笔语义映射需要另外完成逐字核查。[S6][S7][S8]

AnimCJK 的 `acjk` 资料明确标记部件和主要部首，`Special` SVG 能处理只有部分区域属于部首的笔画。固定版本 `a603091f5b87036d1760cf226563f3276a3c4d6e` 的完整文件清单已核对：简体 SVG 覆盖本词库 5,636 个汉字，简体和繁体 SVG 的并集覆盖 5,637 个汉字。其资料可以直接表示逐笔部件颜色，这组固定资料没有覆盖全部目标字符。[S3]

## 商业许可

Jigmo 字体采用 CC0 1.0，允许免费商业使用、修改与再发布。GlyphWiki 数据许可明确允许商业或非商业使用、复制、分发和修改，版权为 `Copyright 2009 GlyphWiki Project`。[S4][S6]

KAGE 生成工具采用 GPL-3.0，其生成字体和字形资料按相应资料许可处理。把 KAGE 引擎代码纳入产品时，需遵守引擎许可；使用已生成字体时，按照字体及数据许可保存资料。[S5][S8]

## 未覆盖字符完整清单

以下为原词库与 Make Me a Hanzi 固定 graphics 的真实差集，共 194 个字符：[S1]

```text
𪢌哰㞎㹴㺢㹢狓鹀𫫇𠈌鹟祐偲𩠌䌽㓥勠𩉜鞚吽醂𫛭嗞圐𱇏𬷕坋𡒄炁垝鵙鳽𥻗嬎䴙䴘萮澨𫶕䴓帡幪帹怐愗騃𢙐㤽旛捯揘揦揾㧑鱾𨰿昽珓䳭𬂩榠槵蒱罍殜汫𣸨鳈渟燚獴粿牤牻獙玦𬍛珣琤𪻐瑢痎瘆鹲𬶨𥆧䁖蜐礌礜狝篖簕䎃絍睺羱耲肏肸蚃腘膙鲏萰䓖芣苢䓬茓莙荙萹葇葎𫓴蓇葖藠𮐨薁𬟁虸蚄蝛蜙蝑蝃蝲䗥䗖𬟽䴕裋褯丼㑊皀豞豨跩𫐖𮝺𫐘迍邅邷𬭁皌𭎂叆叇猺靿韂斝𫗦馃馉饳馎饦𫘝𫘨𫘦𬳿𬴊槑䠷𫚉塭魣𫚒𩽾𩾌䲠𱉝𫛡𱉵𬸩鶗鴃鸼㶉𫛶𬸚𬸦黇黐厾齁𱌶𱌹𰻝
```

## 来源

- S1：本项目 `2ab5c89:data/dictionary.json` 与 `data/sources/makemeahanzi-graphics.jsonl`；JSON Lines 通过现有 `jsonlines` 库读取，全部字符按 Unicode code point 比较。
- S2：[固定原始 CC-CEDICT JSON](../data/sources/cc-cedict-2026-10-12.json)，完整读取词形、拼音与释义。
- [S3：AnimCJK 固定版本 README](https://raw.githubusercontent.com/parsimonhi/animCJK/a603091f5b87036d1760cf226563f3276a3c4d6e/README.md)、[完整文件清单](https://api.github.com/repos/parsimonhi/animCJK/git/trees/a603091f5b87036d1760cf226563f3276a3c4d6e?recursive=1)。清单含 17,881 条记录，`truncated: false`；本地固定 `dictionaryZhHans` 和 `graphicsZhHans` 资料已经读取。
- [S4：Jigmo 官方页面](https://kamichikoichi.github.io/jigmo/)、[2025-09-12 完整字体 ZIP](https://kamichikoichi.github.io/jigmo/Jigmo-20250912.zip)。ZIP 通过现有 `adm-zip` 读取；三份 TTF 的全部目标字符映射通过 `opentype.js` 核查；完整 README 和 CC0 全文已读。
- [S5：Jigmo 官方字体 README](https://raw.githubusercontent.com/kamichikoichi/jigmo/main/documents/README.txt)，既有完整研究副本及本轮发布 ZIP 内 README；[字体和工具资料研究](print-stroke-fonts-2026-10-14.md)。
- [S6：GlyphWiki 官方完整下载包](https://glyphwiki.org/dump.tar.gz)。完整 LICENSE、README_en 和最新字形记录已读；全部最新记录通过现有 `csv-parse` 读取，未自行编写文件格式解析器。
- S7：[既有 OpenType 和逐笔资料研究](print-stroke-fonts-2026-10-14.md)、[统一字形核查](unified-glyph-and-wanxiang-audit.md)。
- [S8：KAGE 引擎](https://github.com/kurgm/kage-engine)，本机固定 `@kurgm/kage-engine` 0.7.0 的完整 README、`kage.js` 和官方示例；本轮使用同一引擎真实生成“冰”的逐项轮廓，未使用视觉功能。
