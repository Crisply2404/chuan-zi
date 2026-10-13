# 印刷体与逐笔字形资料核查

研究日期：2026-10-14，Asia/Shanghai。使用 Skill：`research`。

## 用户要求

- 部首颜色需要按完整笔画显示。
- 希望找到接近当前 `Songti SC`、`Noto Serif SC` 或印刷黑体的字形。
- 字体需要适合商业网页，最好有明确的免费许可。
- 如果选择新的字形，所有模式的汉字格可以统一使用它。
- 本报告只提供研究结果和查看入口，不改变产品字体。

## 印刷字形样本

[宋体与黑体风格样本](http://localhost:5173/.scratch/print-stroke-samples.html)已生成，展示“冰、清、家”的当前设备字形、KAGE Mincho 和 Gothic 字形，可以逐项切换颜色。样本使用官方 GlyphWiki 下载包的中国地区 u51b0-g、u6e05-g、u5bb6-g 记录，由 @kurgm/kage-engine 0.7.0 的 makeGlyph3 生成对应轮廓。

一个书写笔画可能由多个绘制片段表示。“冰”的八个绘制片段中，两点水来自 u51ab-01 的前三个片段，右侧水来自 u6c34-02 的五个片段。样本将两点水完整区域显示为黑色，水显示为玩家橙色。产品全模式采用同一套生成路径时字形保持一致；实际采用前仍需完整部件映射和覆盖检查。

六个字形的颜色切换、390px 与 1920px 的页面宽度检查通过。样本生成过程只在本机使用 GPL-3.0 引擎，产品资源没有包含该引擎。GlyphWiki 原始字形资料已确认允许免费商业使用。[12]

## 印刷宋体字形：Jigmo（字雲）

Jigmo 官方页面把它定义为明朝体（日本字体术语中接近中文宋体的衬线印刷体），提供一个字体字重。官方页面列出 `Jigmo.ttf`、`Jigmo2.ttf` 和 `Jigmo3.ttf` 的分工，覆盖 Unicode 统一汉字基本区、扩展区、兼容汉字以及 IVD 字形，共列出 102,998 个汉字和 29,635 个 IVD 字形。页面说明字形全部来自 GlyphWiki，字体生成使用 KAGE、Clipper、FontForge 和 TTX。[1]

Jigmo 的字体许可使用 CC0 1.0 Universal。该许可文本允许复制、修改、再发布、展示和商业使用；项目的 `documents/LICENSE.txt` 文件和官方页面均可核对。仓库根目录的 `LICENSE` 针对生成工具，使用 MIT License。[2][3]

查看入口：

- [Jigmo 官方页面与下载](https://kamichikoichi.github.io/jigmo/)
- [GlyphWiki 印刷体“冰”SVG](https://glyphwiki.org/glyph/u51b0.svg)
- [Jigmo 字体许可（CC0 1.0）](https://raw.githubusercontent.com/kamichikoichi/jigmo/main/documents/LICENSE.txt)

“冰”的 SVG 来自 GlyphWiki 当前字形，Jigmo 官方说明确认采用同一来源；该 SVG 可以查看印刷字形风格，当前修订版与 Jigmo 2025-09-12 发布字体是否逐点相同仍需核查。

### Jigmo 的逐笔资料关系

Jigmo 字体文件保存完整字形轮廓。字体文件自身没有“第几笔属于哪个部首”的语义字段，因此只加载字体文件无法完成逐笔部首着色。

Jigmo 使用 KAGE 生成字形。KAGE 的官方 JavaScript 引擎把一个字形表示为若干笔画记录或部件记录；`makeGlyph3` 会逐条生成笔画多边形，`getEachStrokesOfBuhin` 会展开部件并保留部件的坐标变换。[4] KAGE 的官方示例使用 `u6f22` 展开三点水和其他部件，并按多边形逐项绘制。[5]

GlyphWiki 的 JSON 接口可以返回部件结构。例如“冰”的 `u51b0-j` 数据记录了 `u51ab-01` 和 `u6c34-02` 两个部件；其中前一个是两点水，后一个是水。这个接口可以用于研究部件归属和逐笔构造。[6]

Jigmo 提供了“印刷宋体字形 + KAGE 笔画和部件数据”路线。若采用字体文件与独立路径共同显示，需要验证版本与字形一致；若全部模式采用同一套 KAGE 生成路径，字形由同一资料保持。当前项目仍等待用户选择，并需核查全部游戏汉字的部件映射与覆盖。

### Jigmo 的覆盖和许可边界

- Jigmo 字体文件：官方页面明确使用 CC0 1.0，可以用于商业网页，也可以修改和再发布。[1][2]
- KAGE 引擎：`kamichikoichi/kage-engine` 仓库标注 GPL-3.0。若产品只使用已经生成的 CC0 字体文件，需按字体许可发布；若把 KAGE 引擎或其代码打包进产品，需要单独遵守 GPL-3.0。[7]
- GlyphWiki 字形数据：官方完整 dump.tar.gz 的 LICENSE.txt 明确允许商业或非商业使用、复制、分发与修改；版权为 Copyright 2009 GlyphWiki Project。完整 LICENSE 和 README_en.txt 已读取。[12]
- Jigmo 的字形覆盖很大，项目页面明确列出基本区和扩展区的数量；游戏实际使用的汉字仍需逐字检查字体文件和逐笔数据是否同时存在。[1]

## 现有两套逐笔资料

### Make Me a Hanzi：AR PL KaitiM GB

Make Me a Hanzi 的 `graphics.txt` 按笔顺提供 SVG path，`dictionary.txt` 的 `matches` 将笔画映射到 IDS 部件。上游字形资料使用 AR PL KaitiM GB 与 AR PL UKai，字形许可为 Arphic Public License，字典许可为 LGPL。项目已有完整来源和许可文件；当前产品由这套资料计算设备文字的部件区域。[9]

查看入口：

- [Make Me a Hanzi 官方页面](https://www.skishore.me/makemeahanzi/)
- [AR PL KaitiM GB 字体文件](https://raw.githubusercontent.com/skishore/makemeahanzi/5a7889405a5dcfb4bd74f289db1d9bc4fe59abb2/public/arphic/gkai00mp.ttf)
- [Hanzi Writer 部首着色示例](https://chanind.github.io/hanzi-writer-data/#20912)

这套字形是楷体风格，路径、笔画和部件归属已经在当前项目中配套，适合保证逐笔颜色边界一致。视觉风格与 `Songti SC` 的印刷衬线风格不同。

### AnimCJK：`svgsZhHans`

AnimCJK 的本项目固定版本 `a603091f5b87036d1760cf226563f3276a3c4d6e` 列出 8,188 个简体中文 SVG，并提供 `svgsZhHansSpecial`，专门处理一笔只有部分区域属于部首的情况。每个 SVG 包含独立笔画 path 和动画样式。官方说明明确区分简体中文字形与日文、繁体中文字形。[10]

查看入口：

- [AnimCJK 官方说明](https://parsimonhi.github.io/animCJK/)
- [AnimCJK 部首示例](https://parsimonhi.github.io/animCJK/samples/radical.html)
- [简体中文“冰”SVG](https://raw.githubusercontent.com/parsimonhi/animCJK/a603091f5b87036d1760cf226563f3276a3c4d6e/svgsZhHans/20912.svg)

AnimCJK 与 Make Me a Hanzi 都属于楷体路线。它的逐笔路径和部首特殊 SVG 已经具备产品需要的资料形态；视觉上仍然与设备宋体有差异。

## KAGE 黑体生成方式

KAGE 的官方 API 提供 Gothic 样式，可以用同一份骨架生成黑体风格轮廓。本轮已经生成三个中国地区汉字的 Mincho 与 Gothic 字形。完整游戏字形资料和部件映射仍需统一整理，当前样本只供字体选择。

## 现成黑体资料的核查范围

本次核查没有找到同时满足以下条件、并且已有一套可直接核对的完整资料：

1. 简体中文黑体或印刷黑体字形；
2. 每个汉字有独立笔画轮廓；
3. 每笔具有部件或部首归属；
4. 字体和逐笔资料的许可都允许商业网页使用；
5. 覆盖当前游戏词库使用的全部汉字。

普通 OpenType 字体只提供字形轮廓。OpenType `glyf` 结构没有笔顺、笔画编号或部首归属字段；当前设备 `Songti SC` 的字体元数据也没有这些字段。[11] 仅使用字体文件无法推断每一笔的准确边界。

## 对产品选择的影响

此前推荐 Make Me a Hanzi 的依据是逐笔路径、部件标注和商业许可已经配套，并且项目已有相同资料。这个推荐没有建立宋体、黑体和楷体的审美排序；用户可以根据样本决定游戏采用的字形。

如果优先保证逐笔部首颜色的准确性，继续选择 Make Me a Hanzi 或 AnimCJK，并统一全部汉字格的 SVG 路径。

印刷宋体方向已经找到 Jigmo 的官方字形与 CC0 字体许可。采用它需要另外固定一套经过核对的 KAGE/GlyphWiki 笔画资料，并完成游戏词库汉字的逐字轮廓核对。当前可以让用户查看它的字形风格；产品采用仍需以上资料核查。

## 来源

以下内容已经完整阅读：Jigmo 官方页面、字体 README、CC0 字体许可、MIT 工具许可、KAGE `kage.js` 和官方示例、“冰”的 GlyphWiki JSON 与 SVG、Make Me a Hanzi 官方页面、Hanzi Writer 字形示例 HTML、项目保存的 OpenType `glyf` 规范，以及已有两份字体研究。证据文件保存在 `.research/print-stroke-fonts/`；设备字体和已有笔画资料的证据沿用项目原记录。

本研究没有使用视觉功能。字形风格描述采用官方字体分类，最终外观由用户在页面和字体文件中选择。

1. [Jigmo 官方页面（完整 HTML）](https://kamichikoichi.github.io/jigmo/)
2. [Jigmo 官方页面中的 CC0 许可说明](https://kamichikoichi.github.io/jigmo/)
3. [Jigmo 字体许可](https://raw.githubusercontent.com/kamichikoichi/jigmo/main/documents/LICENSE.txt)，[生成工具许可](https://raw.githubusercontent.com/kamichikoichi/jigmo/main/LICENSE)
4. [KAGE `kage.js`](https://raw.githubusercontent.com/kamichikoichi/kage-engine/master/kage.js)
5. [KAGE 官方 `sample.js`](https://raw.githubusercontent.com/kamichikoichi/kage-engine/master/sample.js)
6. [GlyphWiki JSON：冰的部件记录](https://glyphwiki.org/json?name=u51b0-j)
7. [KAGE 仓库许可信息](https://api.github.com/repos/kamichikoichi/kage-engine)
8. [GlyphWiki 印刷体“冰”的完整 SVG](https://glyphwiki.org/glyph/u51b0.svg)
9. [本项目已有逐笔字形研究](stroke-font-options-2026-10-13.md)
10. [AnimCJK 官方 README](https://raw.githubusercontent.com/parsimonhi/animCJK/a603091f5b87036d1760cf226563f3276a3c4d6e/README.md)
11. [Microsoft OpenType `glyf` 规范](https://learn.microsoft.com/en-us/typography/opentype/spec/glyf)
12. [GlyphWiki 官方完整字形下载包](https://glyphwiki.org/dump.tar.gz)，已完整下载，LICENSE.txt 与 README_en.txt 全文已读；副本位于 .research/print-stroke-fonts/。
