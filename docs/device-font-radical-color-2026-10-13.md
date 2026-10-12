# 设备字体中的部首着色

日期：2026-10-13。时区：Asia/Shanghai。Skill：`research`。

## 用户已经确定的要求

答案继续使用设备当前字体。输入和提示结合后，汉字形状保持一致；提示部首的笔画使用黑色，玩家补全的笔画使用玩家颜色。研究覆盖左侧部件 `亻`、`冫`、`氵`，上方部件 `宀`、`艹` 和包围部件 `囗`。

## 保持字形的方法

CSS `background-clip: text` 可以将颜色限制在原有文本内，SVG `clipPath` 可以限制绘制区域。两个方法都可以保留原有文字外形，着色区域由调用者提供。MDN 的完整定义分别说明背景限定在文本前景，以及裁剪仅改变绘制范围、保留元素固有几何形状。[1][2]

Canvas `fillText()` 按所选字体绘制完整文字，`getImageData()` 返回像素资料，`measureText()` 返回文字尺寸。它们提供文字绘制、像素和尺寸；接口中没有部首或笔画归属字段。[3][4][5]

如果已经知道当前字体中部首的准确区域，可以让原有文本保持相同 `font-family`、`font-size`、`font-weight`、位置和行高，通过颜色蒙版完成黑色和玩家颜色的分区。需要解决的资料是当前字形内部哪些区域属于提示部首。

## 当前设备的真实核查

研究使用正在运行的开发网页和本机 Chrome，没有修改产品代码。创建一个沿用 `.answer-character` 的 DOM 节点，通过 Chrome DevTools Protocol 读取该节点实际使用的字体。

- CSS 字体列表为 `"Noto Serif SC", "Songti SC", serif`。
- Chrome 返回实际字体 `Songti SC`，PostScript 名称为 `STSongti-SC-Regular`，`isCustomFont: false`。
- 对比设备另一种字体时使用 `"PingFang SC", sans-serif`。
- 六个汉字在两种字体、256px 和当前答案字号 25px 下进行像素计算，共 24 个样本。
- 实验对已经绘制的本机字体像素仅修改 RGB。24 个样本的透明度变化数量全部为零，证明这种着色操作可以保留该 Canvas 图像的原始文字轮廓。
- 原有 DOM 文本应用 `background-clip: text` 前后的几何尺寸相同。此检查验证 CSS 保留布局，未将 Canvas 和 DOM 的不同绘制过程声明为像素完全一致。

脚本和完整结果：

- `.research/device-font-radical-color/measure-native-glyphs.mjs`
- `.research/device-font-radical-color/native-glyph-measurements.json`

全过程读取 DOM、字体元数据和像素，没有主动视觉检查，也没有测试替代数据。

## 部首区域的准确性

将现有 Make Me a Hanzi 的同字轮廓按完整字形边界映射到本机字体后，原部首路径与本机笔画范围仍有区别。表中比例是“映射后的部首路径像素位于本机字形轮廓以外”的比例，按照 alpha 大于 32 的像素计算。此数字描述轮廓关系，不能直接当作部首识别错误率。

| 汉字与部首 | Songti SC，256px | PingFang SC，256px | Songti SC，25px |
| --- | ---: | ---: | ---: |
| 你 / 亻 | 52.70% | 66.55% | 39.02% |
| 冰 / 冫 | 42.02% | 52.59% | 29.73% |
| 清 / 氵 | 44.81% | 39.44% | 23.21% |
| 家 / 宀 | 47.55% | 56.12% | 34.43% |
| 草 / 艹 | 32.14% | 42.82% | 18.75% |
| 国 / 囗 | 32.03% | 35.85% | 25.50% |

Make Me a Hanzi 官方 README 确认图形来自 Arphic PL KaitiM GB 和 Arphic PL UKai；`matches` 标记这些路径的部件归属。这份资料没有提供 Songti SC、PingFang SC 或其他设备字体中相应笔画的轮廓。[6]

本机 Songti SC 的六个样本在 256px 下，部件边界范围内均找不到完整的空白横线或空白竖线。以“你”为例，亻的连通区域横向范围是 `49..134`，右侧上方另一个区域为 `122..286`；两者的横向范围相交。以“草”为例，上方区域的垂直范围是 `109..180`，下方区域为 `172..351`；两者的垂直范围相交。因此，固定比例的左侧矩形或上方矩形不能据此获得准确部首范围。

25px 下，Songti SC 的六个样本在本次 alpha 阈值下都只形成一个连通区域。直接按像素连通性选择提示笔画也需要处理字号和字体绘制产生的连通情况。

## 读取字体轮廓的资料

OpenType `glyf` 标准规定字形可以采用 Bézier 轮廓，或者引用其他 glyph ID 的组合字形。其标准字段提供轮廓点、边界和组合变换，没有汉字部首、笔顺或“这条轮廓属于氵”等语义标签。轮廓数量和汉字笔画数量也没有一一对应要求。[7]

使用已有 `fontTools 4.60.1` 读取本机 `/System/Library/Fonts/Supplemental/Songti.ttc` 的元数据，六个样本全部是普通 `glyf` 字形，均没有组合 glyph ID：

| 汉字 | 字体轮廓数量 | 组合 glyph ID |
| --- | ---: | --- |
| 你 | 5 | 空数组 |
| 冰 | 3 | 空数组 |
| 清 | 7 | 空数组 |
| 家 | 3 | 空数组 |
| 草 | 4 | 空数组 |
| 国 | 4 | 空数组 |

脚本使用 `TTCollection` 和 `TTFont` 的已有解析能力，没有编写字体文件格式解析器。只读取本机字体，未复制或发布字体文件。[8]

对应资料：

- `.research/device-font-radical-color/inspect-system-font.py`
- `.research/device-font-radical-color/songti-outline-metadata.json`

网页的 Local Font Access API 可以在用户授权后取得本机字体 SFNT 资料。MDN 文档要求安全来源和用户交互；官方兼容性资料显示桌面 Chrome 自 103 支持，Safari、Firefox 和 Android Chrome 当前均未支持。因此，此接口不能作为电脑和手机都能直接游戏的统一基础。[9][10]

## 当前可确认的实现范围

保留同一文本元素并分区着色可以维持设备字形。对于所有设备字体、所有游戏汉字都准确识别部首笔画，本次没有取得已经核实可直接使用的资料或方法。

按 IDS 推断左侧、顶部或包围区域可以得到位置信息；准确着色还需要当前字体的部件轮廓标注，或者经过逐字、逐字体核实的部首蒙版。使用另一套字体的路径、固定比例区域或像素连通性，都缺少满足全部样本的证据，不能将这些范围声明为准确笔画。

产品应继续保持用户指定的设备字体。任何部首着色实现必须明确使用当前字体的区域依据，并验证补全前后的文字轮廓与部首归属；本研究未授权变更设备字体或降低准确性要求。

## 来源与全文资料

以下网页或源码已取得完整内容，保存在 `.research/device-font-radical-color/`；Make Me a Hanzi 使用项目已有完整固定版本资料。

1. [MDN：background-clip](https://developer.mozilla.org/en-US/docs/Web/CSS/background-clip)，全文文件 `mdn-background-clip.md`。
2. [MDN：SVG clipPath](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/clipPath)，全文文件 `mdn-svg-clipPath.md`。
3. [MDN：fillText](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText)，全文文件 `mdn-fillText.md`。
4. [MDN：getImageData](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData)，全文文件 `mdn-getImageData.md`。
5. [MDN：measureText](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText)，全文文件 `mdn-measureText.md`。
6. [Make Me a Hanzi README，固定版本](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/README.md)，全文文件 `data/sources/makemeahanzi-README.md`，逐笔资料与许可见 `docs/radical-stroke-data-2026-10-13.md`。
7. [Microsoft：OpenType glyf 标准](https://learn.microsoft.com/en-us/typography/opentype/spec/glyf)，全文文件 `opentype-glyf.md`。
8. [fontTools 4.60.1：TTCollection 源码](https://raw.githubusercontent.com/fonttools/fonttools/4.60.1/Lib/fontTools/ttLib/ttCollection.py)，全文文件 `fonttools-ttCollection.py`。
9. [MDN：queryLocalFonts](https://developer.mozilla.org/en-US/docs/Web/API/Window/queryLocalFonts)，全文文件 `mdn-queryLocalFonts.md`。
10. [MDN 官方兼容性资料](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Window.json)，全文文件 `window-compat.json`，本研究使用其中完整 `queryLocalFonts.__compat.support` 项。
