# 逐笔画字体与字形选择

研究日期：2026-10-13，Asia/Shanghai。使用 Skill：`research`。

## 用户已经确定的要求

- 部首提示需要按完整笔画着色。
- 希望查看接近当前游戏汉字格、允许商业使用、包含简体中文资料的选择。
- 可以让所有模式的汉字格统一使用最终选择的字形。
- 当前页面使用 `'Noto Serif SC', 'Songti SC', serif`；本报告不修改产品字体。

## 已经核查的字形资料

本次已经确认的逐笔着色资料按笔画提供 SVG 路径。当前项目使用的设备字体没有现成部首和笔画归属记录。采用本报告中的 SVG 方案时，汉字、每一笔和部首映射由同一份资料提供；全部模式采用同一份路径可以保持字形一致。

两个字形方案均提供免费商业使用的逐笔路径：

1. **AR PL KaitiM GB / Make Me a Hanzi**：简体楷体风格，资料结构与当前项目已经使用的 `graphics.txt`、`dictionary.txt` 相同。适合直接延续现有 `matches` 和部首笔画索引。
2. **AnimCJK `svgsZhHans`**：在 Arphic 楷体资料基础上维护的简体中文 SVG 集合，带有用于部首颜色的 `Special` 文件和 `acjk` 分解。适合把全部答案格统一为 SVG 汉字。

这两个方案都需要在页面中使用 SVG 字形。楷体保留汉字书写笔触；当前设备 `Songti SC` 属于宋体。字形的接近程度由用户通过相同汉字样本判断。本次没有确认与当前宋体风格完全一致、同时提供完整简体笔画标注的现成集合。

## 方案一：AR PL KaitiM GB 与 Make Me a Hanzi

### 字形与逐笔资料

Make Me a Hanzi 的官方 README 说明，项目提供九千多个常用简体和繁体汉字，`graphics.txt` 为每个汉字提供按笔顺排列的 SVG path，`dictionary.txt` 的 `matches` 把每一笔映射到 IDS 部件路径。项目示例展示了直接嵌入 SVG 的方式。[1]

上游工具的 `path.js` 明确提供两个字体导入选项：`AR PL KaitiM GB` 和 `AR PL UKai`。工具使用 `opentype.js` 读取所选 TTF 的完整字形轮廓，说明这两份字体是项目作者用于字形核对的来源。[2]

本次下载这两份固定版本 TTF，并用本机 `fc-scan` 读取完整字体 metadata。第一份 family 为 `AR PL KaitiM GB`，中文名称为“文鼎ＰＬ简中楷”；第二份 family 为 `AR PL UKai CN`。两份文件的 SHA-256 分别为 `61519fb9bdda4a1a3aa02a12cbb76c2ef897ce879775d7ea2265d0a65fe54d16` 和 `2c7c9b042c0cd687eb947a7bebdca58ebfde35642284ba84553ff5204d796708`。

本项目已固定使用 Make Me a Hanzi commit `bddc96d41bef78427ed0e034e9f7e31d71fd1b92`，包含 9,574 条字形记录。现有游戏词库的 5,945 个不同汉字中，5,751 个有对应记录，覆盖率约为 96.74%。当前已有的部首笔画生成器从同一份 `matches` 和 `strokes` 生成黑色提示笔画与玩家颜色笔画。[3]

### 字体文件与样本

固定版本的上游工具公开提供以下字体文件，可下载后本地查看：

- [AR PL KaitiM GB TTF](https://raw.githubusercontent.com/skishore/makemeahanzi/5a7889405a5dcfb4bd74f289db1d9bc4fe59abb2/public/arphic/gkai00mp.ttf)
- [AR PL UKai CN TTF](https://raw.githubusercontent.com/skishore/makemeahanzi/5a7889405a5dcfb4bd74f289db1d9bc4fe59abb2/public/arphic/UKaiCN.ttf)
- [Make Me a Hanzi 官方说明与在线示例](https://www.skishore.me/makemeahanzi/)
- [Hanzi Writer 字形与部首颜色示例：冰](https://chanind.github.io/hanzi-writer-data/#20912)
- [项目固定版本 graphics.txt](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/graphics.txt)
- [项目固定版本 dictionary.txt](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/dictionary.txt)

“冰”可以作为部首着色样本：上游 `dictionary.txt` 的 `decomposition` 是 `⿰冫水`，前两笔 `matches` 属于 `冫`，后四笔属于 `水`。产品可以把前两笔绘制为黑色，把其余笔画绘制为玩家颜色。[4]

Hanzi Writer 官方 README 说明其资料来自 Make Me a Hanzi，并有少量调整。示例页提供 `Color radical` 开关和字符输入，适合查看这类字形；项目中的最终路径继续以所选固定版本为准。[11]

Make Me a Hanzi 工具允许逐字导入不同字体，且 `stroke_caps/fixStrokes.js` 修改部分笔画端点。因此来源 TTF 的任意字形与当前 SVG 的轮廓一致性需要另行核对；采用 SVG 在全部模式显示相同路径，可以直接保证显示一致。[2][12]

### 许可

AR PL KaitiM GB 和 AR PL UKai 采用 Arphic Public License。许可允许复制、修改、重新发布和收费分发，要求随字体保留完整许可；修改字体还需要说明修改内容与日期，并向第三方提供修改后的资料。[5]

Make Me a Hanzi 的 `dictionary.txt` 采用 LGPL-3.0-or-later，`graphics.txt` 采用 Arphic Public License。项目已经保存对应的完整许可文件：`licenses/MakeMeAHanzi-LGPL.txt`、`licenses/MakeMeAHanzi-APL.txt` 和 `licenses/MakeMeAHanzi-COPYING.txt`。[1][6]

## 方案二：AnimCJK `svgsZhHans`

### 字形与逐笔资料

AnimCJK 官方 README 说明，`svgsZhHans` 收录 8,188 个字形 SVG，用于简体中文，包含 HSK 2025、常用汉字、部分生僻字、传统字形、部件和基本笔画。每个 SVG 为每一笔提供独立 path，并通过 `clipPath` 和 median path 提供逐笔显示动画。[7]

AnimCJK 还提供 `svgsZhHansSpecial`。README 说明，这些特殊 SVG 用于一个笔画只部分属于部首的字形，适合部首颜色显示。其 `acjk` 分解记录部件顺序、部首标记和特殊分割情况。[7]

官方部首样本页面提供语言选择、汉字输入、SVG 源代码和部首颜色切换：[AnimCJK Radical sample](https://parsimonhi.github.io/animCJK/samples/radical.html)。简体中文目录可直接查看“冰”等字形：

- [冰 SVG](https://raw.githubusercontent.com/parsimonhi/animCJK/a603091f5b87036d1760cf226563f3276a3c4d6e/svgsZhHans/20912.svg)
- [清 SVG](https://raw.githubusercontent.com/parsimonhi/animCJK/a603091f5b87036d1760cf226563f3276a3c4d6e/svgsZhHans/28165.svg)
- [家 SVG](https://raw.githubusercontent.com/parsimonhi/animCJK/a603091f5b87036d1760cf226563f3276a3c4d6e/svgsZhHans/23478.svg)
- [草 SVG](https://raw.githubusercontent.com/parsimonhi/animCJK/a603091f5b87036d1760cf226563f3276a3c4d6e/svgsZhHans/33609.svg)
- [国 SVG](https://raw.githubusercontent.com/parsimonhi/animCJK/a603091f5b87036d1760cf226563f3276a3c4d6e/svgsZhHans/22269.svg)

固定版本为 `a603091f5b87036d1760cf226563f3276a3c4d6e`。该版本 README 的更新记录包含简体字形修订、笔顺修订、部件分解调整和 median 改进。[8]

本项目词库的 5,945 个不同汉字中，AnimCJK `svgsZhHans` 有 5,636 个记录，覆盖率约为 94.80%。其余词库字符没有这套固定版本的简体 SVG，产品需要在生成答案候选时继续使用已有覆盖检查。[9]

### 许可

AnimCJK README 与 `licenses/COPYING.txt` 说明，`graphics` 前缀文本和 SVG 文件采用 Arphic Public License；字典和其他源码采用 LGPL。SVG 文件内也保留来源和许可注释。商业网页可以使用这些文件，发布时需要随产品提供完整 Arphic Public License，并保留修改说明。[10]

## 方案一与方案二的关系

两套资料都追溯到 Arphic 楷体来源，字形路径来自同一类简体中文楷体资料。AnimCJK 明确说明，即使两个项目中的某些字形看起来相同，SVG 文件、路径、坐标和 median 也可能不同；AnimCJK 同时提供与 Make Me a Hanzi `graphics.txt` 格式相同的 `graphicsZhHans.txt`，方便重新生成另一种 SVG 文件。[7]

因此需要把选定资料的 SVG 路径作为唯一显示来源：汉字、部首黑色笔画、玩家颜色笔画和动画都从同一份路径生成。把系统 `Songti SC` 或其他设备字体的文字与另一套字体的笔画路径叠加，无法保证部首边界保持同一字形。

## 与当前项目的接入建议

- 统一答案格、提示格和头像答案中的汉字显示来源。
- 每个字格保留一个 SVG 元素，每一笔保留独立 `path`，使用 `matches` 或 `acjk` 记录选择提示笔画。
- 提示笔画使用黑色，玩家补全笔画使用玩家水墨颜色；部首附着动画只移动和改变这些 path 的位置与透明度。
- 继续保留当前拼音 DOM 元素，汉字 SVG 与拼音字段分开布局，输入法仍使用原生输入控件。
- 发布页提供 `public/licenses/MakeMeAHanzi-APL.txt`、`public/licenses/MakeMeAHanzi-LGPL.txt` 和对应来源链接；若采用 AnimCJK，还需要保存其 `COPYING.txt` 和版本号。
- 对没有 SVG 记录的汉字立即记录覆盖状态，避免显示未经核对的部首颜色。

## 用户查看顺序

可以先打开下面三个页面查看视觉差异和逐笔颜色效果：

1. [Hanzi Writer 字形与部首颜色示例：冰](https://chanind.github.io/hanzi-writer-data/#20912)
2. [AnimCJK 简体中文主页](https://parsimonhi.github.io/animCJK/)
3. [AnimCJK 部首颜色示例](https://parsimonhi.github.io/animCJK/samples/radical.html)

选择其中一套后，所有模式的汉字格统一采用该套 SVG 字形，产品再进行统一尺寸和颜色调整。

## 本地字形样本与验证

样本页面位于 `.scratch/stroke-font-samples.html`。开发网页运行时可打开 [逐笔字形样本](http://localhost:5173/.scratch/stroke-font-samples.html)，查看当前设备字体、Make Me a Hanzi 与 AnimCJK 的“冰清家草国打击报复”。点击任意 SVG 汉字后，可以通过笔画编号独立切换黑色与玩家颜色；“冰”默认前两笔黑色，其余四笔使用玩家橙色。

样本资料由 `.scratch/build-stroke-font-samples.mjs` 使用 `jsonlines` 完整读取两套真实资料，生成 `.scratch/stroke-font-samples.json`。每一笔保留原始 SVG `d`，Make Me a Hanzi 使用其官方坐标变换，AnimCJK 直接使用原坐标；没有重新绘制字形。此页面提供字形选择，产品字体尚待选择。

已运行 `.scratch/check-stroke-font-samples.mjs`，通过以下浏览器检查：

- 十八个字形的全部 `d` 与原始 JSON Lines 路径一致，每一笔的几何长度大于零。
- 两套资料的九个样本笔画数量均为 `6、11、10、9、8、5、5、7、9`。
- 切换字形后，放大字形与笔画编号数量一致。
- 单笔颜色、缩略字形同步、全部黑色、全部玩家色和“冰”的冫重置均正常。
- 页面在 1100px、700px、390px 和 320px 宽度下没有横向溢出，汉字格与按钮保持在视口内。
- 本机 Chrome 返回设备字形字体为 `Songti SC`，PostScript 名称为 `STSongti-SC-Regular`。
- 页面没有 JavaScript 错误。

完整结果保存在 `.scratch/stroke-font-verification.json`。验证读取 DOM、SVG 几何和字体 metadata，全程没有使用视觉功能。

## 来源

1. [Make Me a Hanzi 官方 README（固定版本）](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/README.md)
2. [Make Me a Hanzi `path.js`（导入字体并提取完整字形）](https://raw.githubusercontent.com/skishore/makemeahanzi/5a7889405a5dcfb4bd74f289db1d9bc4fe59abb2/client/lib/path.js)
3. [本项目逐笔资料研究](radical-stroke-data-2026-10-13.md)
4. [Make Me a Hanzi `dictionary.txt` 中“冰”的记录](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/dictionary.txt)
5. [Arphic Public License（Make Me a Hanzi 固定版本）](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/APL/english/ARPHICPL.TXT)
6. [Make Me a Hanzi `COPYING`](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/COPYING)
7. [AnimCJK 官方 README（固定版本）](https://raw.githubusercontent.com/parsimonhi/animCJK/a603091f5b87036d1760cf226563f3276a3c4d6e/README.md)
8. [AnimCJK 固定版本更新记录](https://raw.githubusercontent.com/parsimonhi/animCJK/a603091f5b87036d1760cf226563f3276a3c4d6e/README.md)
9. [本次覆盖统计依据的完整字形资料](https://raw.githubusercontent.com/parsimonhi/animCJK/a603091f5b87036d1760cf226563f3276a3c4d6e/graphicsZhHans.txt)
10. [AnimCJK `COPYING.txt`](https://raw.githubusercontent.com/parsimonhi/animCJK/a603091f5b87036d1760cf226563f3276a3c4d6e/licenses/COPYING.txt)
11. [Hanzi Writer 官方 README](https://raw.githubusercontent.com/chanind/hanzi-writer/master/README.md)，[字形示例页面](https://chanind.github.io/hanzi-writer-data/)，[示例脚本](https://chanind.github.io/hanzi-writer-data/explorer.js)
12. [Make Me a Hanzi 笔画端点处理源码](https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/stroke_caps/fixStrokes.js)
