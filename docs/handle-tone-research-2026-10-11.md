# `antfu/handle` 声调、拼音布局与汉字格动画研究

研究日期：2026-10-11，时区 Asia/Shanghai。

## 研究范围与固定版本

用户提供的仓库为 [antfu/handle](https://github.com/antfu/handle)。本次完整克隆 `main` 分支并核对全部受 Git 跟踪的文件，完整阅读与声调、拼音、汉字格和动画有关的源码、数据说明、测试、README 与许可证。研究版本为提交 [`2003b777f507ed18c1c80304fd6894280c56ad58`](https://github.com/antfu/handle/tree/2003b777f507ed18c1c80304fd6894280c56ad58)，提交时间为 2025-02-12。完整克隆保存在 `.research/antfu-handle/`。

仓库是 Vue 3 + Vite 的四字汉字 Wordle 游戏。README 写明项目名称、站点、开发命令、成语资料维护方式、使用的主要依赖和 MIT 许可。[S1]

## 拼音数据流

### 词语到逐字读音

`packages/tools/src/pinyin/get.ts` 调用 `pinyin/lib/web-pinyin.js`，要求 `STYLE_TONE2`，然后把每个结果交给 `parsePinyin`。`packages/tools/src/types.ts` 定义的 `ParsedPinyin` 包含 `raw`、`base`、`tone` 和可选的 `phoneticPos`。[S2][S3]

`src/logic/idioms.ts` 先检查 `src/data/polyphones.json` 中的词语级特殊读音；没有特殊记录时，使用 `getPinyinRaw` 读取词语读音。词语级数据按空格分隔为逐字读音，之后把 `y/j/q/x` 后面的 `u` 规范为内部形式 `v`。[S4]

`src/logic/utils.ts` 的 `parseChar` 从末尾数字读取声调，把读音切分为声母 `_1`、韵母 `_2` 和可选的第三部分 `_3`，同时保留 `yin`、`parts` 与 `tone`。`parseWord` 为词语每个汉字建立 `ParsedChar`；答案词存在同字时，会尝试使用答案词对应位置的读音。[S5]

### 声调数字与带符号拼音

`parsePinyin` 能处理带声调数字的读音和预组合声调字符。`packages/tools/src/map/phonetics.json` 将 `ā`、`á`、`ǎ`、`à` 等字符映射为基础字母与声调数字，`toPhonetics.json` 保存反向的声调字符列表。[S2][S6]

`getPhoneticPosition` 使用普通拼音声调位置规则：优先处理 `iu` 的第二个元音，然后依次查找最后的 `a`、`e`、`o`、`i`、`u`、`v`、`ü`。找不到位置时直接抛出错误。[S7]

工具包提供两种字符串输出：`pinyinToNumberStyle` 返回基础拼音加数字，`pinyinToToneStyle` 将声调字符替换到目标元音位置。[S8] 游戏方格的实际显示使用 `CharBlock.vue` 中的独立字母和 SVG 覆盖层，工具包的字符串样式函数主要用于转换与测试。

源代码在 `parsePinyin` 中只把 `0` 至 `4` 识别为数字声调，`ToneSymbol.vue` 也只绘制第一声至第四声。仓库当前没有单独处理中性声 `5` 的显示路径；复用这套结构时，需要先确定中性声的内部值、显示符号和匹配方式。[S2][S9]

## `CharBlock` 的方格布局

### 方格尺寸与汉字位置

`src/components/CharBlock.vue` 使用固定的 `h-20 w-20 border-2` 方格，内容使用相对定位。拼音或双拼模式把汉字放在方格中部下方，普通显示使用 `top-8`，遮罩显示使用 `top-8.5`；拼音行使用绝对定位，普通显示从 `top-11px` 开始，遮罩从 `top-14px` 开始。[S10]

声母、韵母和声调在同一方格内独立渲染：声母是一个带 `mx-1px` 的 `div`，韵母按字母分别渲染，每个字母使用 `relative` 定位。这样可以把声调符号挂在具体元音上方，也能分别给声母、韵母、声调和汉字应用判定颜色。[S10]

### 声调符号定位

`toneCharLocation` 从 `char._2` 中查找声调元音索引，`iu` 特例选择第二个元音。每个韵母字母的容器都设置 `relative`，`ToneSymbol` 只在目标索引处渲染，并设置 `absolute`、`w="86%"`、`left="8%"`。符号下方位置根据遮罩状态和目标字母是否为内部 `v` 分别使用 `1.25rem`、`0.85rem` 或 `0.78rem`。[S10]

声调图形位于 `src/components/ToneSymbol.vue`。组件接收 `tone: number`，使用一个 `20 x 20` 的内嵌 SVG；第一声、第二声、第三声和第四声分别使用独立的 `path`，颜色继承 `currentColor`。[S9]

内部形式 `v` 在页面文字中显示为 `u`，再由 `VDots.vue` 在对应字母下方绘制两个点；遮罩状态会隐藏这两个点。声调定位仍使用内部 `v` 索引，所以显示字符与定位数据可以分开保存。[S10][S11]

### 注音模式

`CharBlock.vue` 在 `inputMode === 'zy'` 时，把汉字放在左侧，把声母、韵母和 `ToneSymbol` 放在右侧竖排容器。竖排使用 CSS `writing-mode: vertical-rl`；声调图形位于竖排拼音容器底部的独立位置。[S10]

`toZhuyin` 使用 `zhuyin.json` 将基础拼音转换为注音，并从 `toneSymbols.json` 追加声调符号。当前符号表为第一声 `¯`、第二声 `ˊ`、第三声 `ˇ`、第四声 `ˋ`，轻声和无声调都没有追加内容。[S12][S13]

### 双拼模式

`toShuangpin` 将基础拼音切分成声母和韵母，再按照 `sougou` 或 `xiaohe` 映射表转换为两个字母。`inputMode` 为双拼时，状态层强制使用数字声调显示；注音模式强制关闭数字声调显示。[S14][S15]

## 汉字格和输入动画

### 翻转揭示

`src/components/WordBlocks.vue` 为每个汉字创建一个 `w-20 h-20 m1` 的 `.tile`。揭示状态同时保留 `front` 和 `back` 两个 `CharBlock`，通过 CSS `backface-visibility: hidden`、`rotateY(180deg)` 和 `transition: transform 0.6s` 进行三维翻转。`front` 初始显示，`.tile.revealed` 后由 `back` 旋转到正面。[S16]

当 `revealed` 为真时，组件通过 `watchEffect` 设置 `flip`，延迟为 `Math.random() * 300` 毫秒。每个字格还按索引设置 `transitionDelay`，揭示结果设置 `animationDelay`。因此一行四格会依次翻转，延迟带有随机变化。[S16]

### 当前输入行与错误反馈

`src/components/Play.vue` 用原生 `input` 保存当前输入，同时将清理后的汉字传给当前 `WordBlocks`。`filterNonChineseChars` 过滤非汉字并截取四个字符；按下确认后检查长度和成语有效性，合法内容加入 `tries`，非法内容显示提示并把 `shake` 状态置为真。[S17][S18]

`src/styles/main.css` 中的 `.shake` 使用 `@keyframes` 在 0.4 秒内左右移动。输入区域的提示层使用 `transition-all duration-300`，全局 `.fade-in` 和 `.fade-out` 使用纵向位移与透明度变化。[S19][S17]

`WordBlocks` 可以关闭动画：分享图片使用 `:animate="false"`，直接渲染单个 `CharBlock`，避免截图时出现翻转状态。[S20]

### 动画范围

当前仓库的动画集中在单个字格的翻转、错误输入的抖动、提示层淡入淡出和通关后的礼花。方格之间没有共享提示元素的连续移动，也没有多字答案行随提示附着位置改变的补间逻辑；这与当前「击鼓传字」规格中的提示附着和答案行移动要求属于不同动画范围。[S16][S19][S21]

## 可复用的实现结论

1. 保存逐字 `ParsedChar`，至少包含汉字、声母、韵母、内部声调数字和声调元音索引。声调索引在解析阶段确定，渲染阶段只负责将图形放到对应字母上方。
2. 逐个渲染韵母字母并为每个元素设置 `relative`；声调图形使用独立的绝对定位元素。`iu` 特例、`a/e/o/i/u/v/ü` 优先级和遮罩状态需要放在同一套定位函数中。
3. 使用内部 `v` 表示 `ü` 可以简化双拼映射；显示层需要同时处理 `u` 字符与两个点，声调定位继续读取内部索引。
4. 第一声至第四声可以使用当前 SVG 图形方案。中性声需要增加明确的数据值、显示处理和测试；当前仓库没有提供可直接复用的 `5` 路径。
5. 3D 翻转适合展示已提交答案的逐格反馈。若要实现「提示和答案保持同一元素连续移动」，需要单独建立共享 DOM 元素与位置测量逻辑，不能只复制 `WordBlocks` 的翻转 CSS。
6. 当前 `Play.vue` 将输入清理为四个汉字，并且只监听普通 `input` 与 Enter 事件，没有处理 IME composition 状态。项目规格要求保留原生输入、支持可变长度和组合文本，因此只能参考它的输入与方格绑定关系，不能直接采用其长度和提交逻辑。[S17]
7. 当前方格固定为 80px 正方形，行布局使用水平 `flex`。电脑端四字布局清晰；移动端可复用内部元素结构，同时需要根据项目答案长度和屏幕宽度重新设置方格尺寸与行宽。[S10][S16]

## 测试覆盖与资料边界

`test/parse.test.ts` 对 `parseChar` 与 `testAnswer` 保存快照，覆盖虎、微、姜、寿、翁等读音；`packages/tools/src/pinyin/get.ts` 有 `getPinyin` 的内联测试，注音转换也有往返测试。[S22][S2][S12]

仓库没有专门的浏览器视觉测试来验证每个韵母的 SVG 对齐，也没有针对中性声、遮罩下声调位置和随机翻转延迟的测试。复用到当前项目时，应补充基于真实 DOM 的声调定位检查与不同屏幕宽度的方格布局验证。

## 许可证和数据来源

根目录 `LICENSE` 是 MIT License，版权声明为 `Copyright (c) 2021-PRESENT Anthony Fu`；许可允许使用、复制、修改、合并、发布、分发和销售，但发行副本需要保留版权声明与许可文本。[S23]

`packages/tools/package.json` 也声明 `@hankit/tools` 使用 MIT License，作者为 Anthony Fu，仓库目录为 `packages/tools`。[S24]

README 要求 Fork 或修改时注明原始仓库与作者。若从 `CharBlock.vue`、`ToneSymbol.vue`、拼音工具包或其他源码复制代码，应在项目许可资料中保留 MIT 版权声明和完整许可文本。[S1][S23]

仓库的 `src/data/README.md` 记录：`idioms.txt` 与 `polyphones.json` 由 `pwxcoo/chinese-xinhua` 的 `idiom.json` 整理，`t2s.json` 由 `mollykannn/translate-big5-gbk` 整理，另有用户输入资料；根目录只提供项目自己的 MIT 文本，没有为这些上游数据附带独立许可文件。[S25] 这些词语和读音资料不能仅凭 `antfu/handle` 的 MIT 文本判定为同一授权，产品继续使用当前已经核查的词库与许可记录即可。

## 来源

- [S1：README，项目说明、数据维护和许可证](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/README.md#L3-L41)
- [S2：拼音读取与数字声调测试](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/packages/tools/src/pinyin/get.ts#L1-L18)
- [S3：`ParsedPinyin` 类型](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/packages/tools/src/types.ts#L1-L6)
- [S4：词语级特殊读音与 `v` 规范化](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/src/logic/idioms.ts#L1-L29)
- [S5：逐字解析、声调和答案读音](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/src/logic/utils.ts#L7-L65)
- [S6：预组合拼音字符映射](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/packages/tools/src/map/phonetics.json#L1-L28)
- [S7：声调元音位置](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/packages/tools/src/pinyin/phonetic.ts#L1-L24)
- [S8：数字声调与预组合声调输出](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/packages/tools/src/pinyin/styles.ts#L1-L22)
- [S9：声调 SVG 图形](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/src/components/ToneSymbol.vue#L1-L14)
- [S10：汉字格和拼音行布局](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/src/components/CharBlock.vue#L46-L176)
- [S11：`v` 的双点显示](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/src/components/CharBlock.vue#L127-L161)
- [S12：拼音到注音和声调符号转换](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/packages/tools/src/zhuyin/convert.ts#L1-L17)
- [S13：注音声调符号表](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/packages/tools/src/map/toneSymbols.json#L1-L7)
- [S14：双拼转换](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/packages/tools/src/shuangpin/covert.ts#L1-L19)
- [S15：输入模式与声调显示状态](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/src/state.ts#L24-L30)
- [S16：字格翻转、随机延迟和方格尺寸](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/src/components/WordBlocks.vue#L17-L96)
- [S17：原生输入、汉字过滤和提交](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/src/components/Play.vue#L8-L128)
- [S18：汉字过滤与四字长度](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/src/logic/check.ts#L1-L15)
- [S19：抖动和淡入淡出 CSS](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/src/styles/main.css#L37-L75)
- [S20：分享图像关闭翻转](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/src/components/ShareImage.vue#L16-L29)
- [S21：通关礼花](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/src/components/Confetti.vue#L1-L46)
- [S22：解析与转换测试](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/test/parse.test.ts#L1-L15)
- [S23：MIT License](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/LICENSE#L1-L21)
- [S24：`@hankit/tools` 包信息](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/packages/tools/package.json#L1-L44)
- [S25：数据来源说明](https://github.com/antfu/handle/blob/2003b777f507ed18c1c80304fd6894280c56ad58/src/data/README.md#L1-L14)
