# 统一楷体与万象补充资料核查

日期：2026-10-14，Asia/Shanghai。使用 Skill：`research`。本报告依据完整上游资料、本地固定文件和生成结果；未使用视觉功能。

## Make Me a Hanzi 的来源与生成关系

Make Me a Hanzi 固定版本为 `bddc96d41bef78427ed0e034e9f7e31d71fd1b92`。官方 README 将 `dictionary.txt` 与 `graphics.txt` 分开发布：前者来自 Unihan 与 CJKlib，后者来自 Arphic PL KaitiM GB 与 Arphic PL UKai。`graphics.txt` 的 `strokes` 按笔顺保存 SVG 路径；`dictionary.txt` 的 `matches` 把各笔画映射到 IDS 部件。[S1][S2]

项目保存的原始资料与已核查摘要一致：[S3]

| 文件 | SHA-256 |
| --- | --- |
| `data/sources/makemeahanzi-graphics.jsonl` | `a28c478b5178e98f67f510b2d52fde08a69dc664654ef43498253b9b764d46ee` |
| `data/sources/makemeahanzi-dictionary.jsonl` | `744bb05d5b0742e9ee35c37791f94d56a173349b3367569e7ca11e510364d203` |
| `licenses/MakeMeAHanzi-APL.txt` | `3a5e90c0957524a89e48203febcd4492ca4393678abaa7e5b4d70f3ff32b386d` |

`scripts/prepare-glyph-font.ts` 使用 `opentype.js` 2.0.0 读取相同原始路径，逐个汉字组装 OpenType 字形，生成 `Chuan Zi Kai Regular`。生成结果包含 9,574 个汉字与 `.notdef`，`unitsPerEm` 为 1024，`ascender` 为 900，`descender` 为 -124，字宽为 1024。此坐标范围对应上游的 `(0, 900)` 至 `(1024, -124)`。[S1][S4]

逐笔 SVG 保留上游 `d`，使用 `viewBox="0 0 1024 1024"` 和 `scale(1,-1) translate(0,-900)`。部首提示笔画来自 `strokeParts` 的索引，其余笔画使用玩家颜色。例如“冰”的 `冫` 对应第 0、1 笔，另外四笔对应补全部分。字体与逐笔图形共用相同原始轮廓和 em 坐标。[S1][S5]

## 已完成的字形验证

生成 OTF 使用 CFF 轮廓。`opentype.js` 在写入 CFF 时将二次 Bézier 曲线转换为三次 Bézier 曲线，并把坐标取整。本次完整读取全部 9,574 个原始字形与生成字体，按相同曲线转换规则核对，指令数量和类型全部对应，最大坐标差为 1／1024 em。此证据支持相同字形来源与转换结构；字体和 SVG 的渲染需要继续保持相同显示尺寸与位置。[S4]

本机 HarfBuzz 能识别生成字体，“冰”和“寻路”均返回相应字符映射与 1024 字宽。本次有效词语集合中的 5,729 个不同汉字全部具有生成字体映射。原始资料覆盖项目 `characters` 属性表中的 5,751／5,945 个汉字；该属性表还保存已排除词语对应的汉字记录。[S4][S6]

当前数据生成结果包含 89,098 个有效词语与 7,047 个成语。相对于本轮开始前的 89,431 个词语，334 个词语因字形覆盖要求暂时排除，增加“寻路”一项。原始 CC-CEDICT、THUOCL 与万象资料继续保留。全部有效答案的每个汉字均存在 Make Me a Hanzi graphics 记录。[S6]

此核查完成资料和字体结构验证。字体加载状态、普通文字与 SVG 的页面几何位置、所有模式中的字形尺寸及手机显示，由本轮浏览器验证记录提供证据。

## Arphic Public License 的发行要求

APL 定义第 0 条明确包括修改字形、调整顺序、转换格式、改变字体名称及增删字符生成的派生字体。第 1 条允许在保留完整、未修改许可的条件下通过任何介质复制与分发。第 2 条允许上述修改，并要求每个修改文件保存明显的修改内容和日期、以相同许可向第三方提供全部修改结果。因此，生成 OpenType 字体和逐笔 SVG 的商业网页使用具有公开许可依据。[S7]

项目发行相应资料时保留：[S2][S7]

- `Copyright (C) 1999 Arphic Technology Co., Ltd.`。
- 完整 Arphic Public License。
- Make Me a Hanzi 项目来源与固定版本。
- 日期及修改内容：按汉字提取 SVG 路径、加入部件笔画索引、将全部笔画组装为 `Chuan Zi Kai` OpenType 字体。
- 生成字体、原始路径和可编辑修改资料的公开下载入口，允许取得者按 APL 再次分发与修改。

当前 OTF 的 `name` 表在 Unicode、Macintosh 与 Windows 平台均包含 Arphic 版权和 `Modified 2026-10-14` 的修改说明；当前逐字 JSON 保存 `provenance`，包括版权、APL、LGPL 和修改日期。许可页面提供完整许可、字体及 `glyphs-source.zip` 下载。[S4][S5][S8]

`glyphs-source.zip` 当前包含两份完整原始 JSON Lines、COPYING、APL、LGPL、GPL、修改说明以及 5,751 份可编辑逐字 JSON。资料可按原许可取得并修改；原始路径也包含全部 9,574 个字形。单独下载字体时，许可页面的完整许可入口应继续与字体保持关联。下载包可以保留 `ARPHICPL.TXT` 原始文件名，使许可原文所述文件名与分发内容一致。[S5][S7]

字体生成使用 `opentype.js` 的 MIT 构建工具许可；字体字形继续采用 APL。APL 第 2 条说明可独立识别和分别发行的其他作品按各自许可处理。相应数据与字体的公开下载可以独立提供；个人网站仍只发布构建产物和应公开的资料文件。[S7][S9]

## 字形部件映射的许可

Make Me a Hanzi 的 COPYING 将 `dictionary.txt` 标为 LGPL-3.0-or-later。项目由 IDS、matches 生成的部件笔画索引继续保留该资料的许可、来源、修改说明及可编辑原始记录；LGPL 与 GPL 全文随资料包保存。[S2][S5][S10]

`graphics.txt` 的路径采用 APL；部件索引采用 LGPL-3.0-or-later。逐字 JSON 的 `provenance` 分别记录两类许可。完整许可页面、原始资料与可编辑 JSON 的下载入口需要保持有效。[S5][S8]

## 万象补充的来源与许可

采用 `amzxyz/RIME-LMDG` 固定版本 `5da3670129a82aeb0b20c3081d48c4f05ebd794b` 的 `dicts/jichu.dict.yaml`。本地原始文件为 44,565,641 bytes，SHA-256 为 `491a80628719f6eeabf7d1eb040a86c872175736a6a6c63f702f6f87e32230a8`；固定版本 README、完整 LICENSE 和文件清单已经保存。[S11][S12][S13]

完整基础文件共 1,410,769 条记录、1,410,767 个唯一词形，字段提供词语、带声调拼音及输入法词频权重。官方 README 说明采用 AI 辅助筛选和人工校对，另行提供医学、化学、药品与各类名称文件。基础文件未提供释义、普通词语或成语身份标签及逐条词典引证。现有游戏依赖的成语分类和释义筛选继续保留，万象通过审核文件提供新增词形与完整读音。[S11][S12]

`data/wanxiang-supplement.json` 当前只保存用户提出并选择收录的“寻路”。固定基础文件第 136,855 行为 `寻路\txún lù\t471`。生成结果保存 `xun2 lu4`，声母为 `x l`，韵母为 `un u`，声调为 `2 4`，来源为 `Wanxiang`。`scripts/build-data.ts` 验证来源 SHA、审核文件版本、词形与读音的原始记录存在性、重复项、排除集合和字形覆盖。[S6][S12][S14]

万象固定 LICENSE 为 CC BY 4.0。第 2 条允许免费复制、分发及改编；第 3 条要求保存作者或项目署名、来源、许可及无担保说明，并表明修改；第 4 条允许提取和再使用数据库内容。项目可以将审核词条用于商业网页与有广告的微信小程序。[S13]

发布说明保存 `万象词库 / amzxyz RIME-LMDG`、固定版本、来源链接、CC BY 4.0 全文或链接、无担保说明，以及词条选择、拼音转换和字形覆盖筛选的修改说明。`licenses/Wanxiang.txt` 与固定上游 LICENSE 全文逐字节一致。[S8][S13]

审核后的万象补充与原始万象文件继续保存 CC BY 4.0 来源说明；现有 CC-CEDICT 改编词语和读音资料继续遵循 CC BY-SA 4.0。公开许可依据针对各上游发布的资料，基础文件的词语独立身份与日常使用范围仍由项目审核文件决定。[S13][S14][S15]

## 文档与发行资料的对应内容

本轮数据说明和验证记录应反映当前有效词语数量、字形覆盖筛选、万象审核文件入口、统一字体生成方式及逐笔颜色来源。字体资料说明保留修改日期和 APL；词语许可说明保留万象的 CC BY 4.0 及 CC-CEDICT 的 CC BY-SA 4.0。`characters` 属性表数量与有效答案使用的不同汉字数量应分别说明。[S6][S8][S14]

生成 OTF 的 `license` 和 `licenseURL` 元数据可以记录完整 APL 说明与项目许可地址；字体的 `description` 可以保存源版本、修改日期和转换内容。现有 `copyright` 已保存版权与修改说明，公开许可页面继续提供完整条文。[S4][S7][S8]

## 来源

- [S1：Make Me a Hanzi 固定版本 README](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/README.md)。已全文读取本地固定副本 `data/sources/makemeahanzi-README.md`。
- [S2：Make Me a Hanzi 固定版本 COPYING](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/COPYING)。已全文读取本地副本 `licenses/MakeMeAHanzi-COPYING.txt`。
- S3：[来源记录](../data/sources.json)，原始文件全字节 SHA-256 校验；既有 [逐笔资料核查](radical-stroke-data-2026-10-13.md)。
- S4：[字体生成代码](../scripts/prepare-glyph-font.ts)、`opentype.js` 2.0.0 完整 README 与发行代码 `glyphToOps`、生成字体 metadata、全部路径指令核查和 HarfBuzz 字符映射结果。
- S5：[逐字资料生成代码](../scripts/prepare-glyphs.ts)、[提示组件](../src/PromptView.tsx)、`public/glyphs/51b0.json` 与 `public/glyphs-source.zip` 完整文件列表。
- S6：[词库构建代码](../scripts/build-data.ts)、[构建统计](../data/build-report.json) 与完整生成词库；本轮开始前 `HEAD` 数据只用于数量核对。
- [S7：完整 Arphic Public License](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/APL/english/ARPHICPL.TXT)。已全文读取本地 `licenses/MakeMeAHanzi-APL.txt`，与既有固定副本逐字节一致。
- S8：[公开许可页面](../public/licenses.html)、[许可发布代码](../scripts/prepare-public.ts)。
- S9：`node_modules/opentype.js/LICENSE`，已全文读取，MIT License，`Copyright (c) 2020 Frederik De Bleser`。
- S10：[Make Me a Hanzi LGPL](../licenses/MakeMeAHanzi-LGPL.txt) 与 [GPL](../licenses/GPL-3.0.txt)，项目已保存完整资料；本次全文读取 LGPL。
- [S11：万象固定版本 README](https://raw.githubusercontent.com/amzxyz/RIME-LMDG/5da3670129a82aeb0b20c3081d48c4f05ebd794b/README.md)。已全文读取 `.research/xunlu-supplement-2026-10-14/lmdg-fixed-README.md`。
- [S12：万象固定基础词库](https://raw.githubusercontent.com/amzxyz/RIME-LMDG/5da3670129a82aeb0b20c3081d48c4f05ebd794b/dicts/jichu.dict.yaml)。项目固定原始文件与完整 TSV 核查见 [寻路研究](xunlu-supplement-lexicons-2026-10-14.md)。
- [S13：万象固定版本完整 LICENSE](https://raw.githubusercontent.com/amzxyz/RIME-LMDG/5da3670129a82aeb0b20c3081d48c4f05ebd794b/LICENSE)。已全文读取 `licenses/Wanxiang.txt`，与既有完整固定副本逐字节一致。
- S14：[万象审核补充入口](../data/wanxiang-supplement.json)、[项目当前决定](project-discussion.md)与[数据说明](../data/README.md)。
- S15：[中文数据来源](chinese-word-sources.md)、[CC-CEDICT 完整许可](../licenses/CC-CEDICT.txt)。
