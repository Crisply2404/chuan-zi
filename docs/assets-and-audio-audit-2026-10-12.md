# 页面素材与 CC0 音效核查

日期：2026-10-12。时区：Asia/Shanghai。

## 音效来源与商业使用

本轮选定的五种声音均采用本地 CC0 文件。CC0 [完整许可](../licenses/CC0-1.0.txt)第 2 条允许商业、广告和宣传用途；播放、修改和随游戏分发均无需支付素材使用费。原作者、来源页面、下载地址、转换方法和 SHA-256 记录在 [音效来源](../licenses/Game-Audio-Sources.txt)。

鼓声来自 [MrRentAPercussionist 的 Bata Low Dry.wav](https://freesound.org/people/MrRentAPercussionist/sounds/451230/)。作者说明这是使用 Zoom H5 和两支 Shure SM 81 录制的单次 Meinl Bata Drum 打击。该文件页面明确标记 Creative Commons 0，允许商业复制、修改、分发和播放。项目取得页面公开的高质量 MP3 预览，截取前 0.95 秒，并给最后 0.05 秒增加淡出；没有混合其他声音。

其余四种声音来自 [Kenney Interface Sounds 1.0](https://kenney.nl/assets/interface-sounds)。官方页面标明 100 个音效与 CC0。官方 ZIP 内的 [License.txt](../licenses/Kenney-Interface-Sounds-CC0.txt)明确允许个人、教育和商业项目使用，署名属于自愿行为。项目使用对应的包内文件，统一转换为单声道 44100 Hz 16-bit PCM WAV，供浏览器 AudioBufferSourceNode 播放。

| 游戏事件 | 项目音频 | 原始文件 | 时长 | 建议事件 gain |
| --- | --- | --- | --- | --- |
| 当前玩家开始作答 | `chuan-zi-drum.wav` | `Bata Low Dry.wav` | 0.950 秒 | 0.50 |
| 正确答案 | `chuan-zi-correct.wav` | `confirmation_001.ogg` | 0.290 秒 | 0.38 |
| 无效答案 | `chuan-zi-incorrect.wav` | `error_001.ogg` | 0.162 秒 | 0.32 |
| 倒计时 | `chuan-zi-countdown.wav` | `tick_001.ogg` | 0.045 秒 | 0.24 |
| 超时 | `chuan-zi-timeout.wav` | `error_006.ogg` | 0.500 秒 | 0.40 |

建议 master gain 为 0.60。音量只由这些内部播放参数和设备音量共同控制，界面保留静音开关。每个事件只播放对应的一个录音文件；鼓声事件只播放鼓声。

五个 WAV 总大小为 172,074 字节。`ffprobe` 确认文件格式、采样率、声道、时长；FFmpeg 解码成功。鼓声源文件的峰值为 -0.4 dBFS、平均电平为 -16.8 dBFS，没有开头静音。这些检查确认资源能够解码且包含声音，听感由录音本身决定。

## 字体

代码没有 `@font-face`、远程字体 CSS 或字体文件请求。`src/styles.css` 通过 `font-family` 选择设备已安装字体：

- 中文正文：`Noto Sans SC`、`PingFang SC`、`Microsoft YaHei`、`sans-serif`。
- 中文标题与汉字：`Noto Serif SC`、`Songti SC`、`SimSun`、`serif`。
- 部首附着的完整汉字：本地 Make Me a Hanzi SVG 路径，采用 Arphic Public License，详见 `radical-stroke-data-2026-10-13.md`。
- 拼音：`ui-monospace`、`SFMono-Regular`、`Menlo`、`Consolas`、`monospace`。
- 许可页面：`system-ui`、`sans-serif`。

对产品目录的 `.woff`、`.woff2`、`.ttf`、`.otf` 搜索没有结果。项目没有打包或分发这些字体，也没有购买字体的接口和外部字体服务。浏览器使用玩家设备的字体进行显示，网页发布与加入广告均不增加字体素材使用费。设备内字体文件的再分发权不属于项目当前使用范围。

[Microsoft 字体 FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq)的 Web 部分明确允许网页在 CSS 中写入 Windows 提供的字体名称，并说明字体使用发生在玩家设备上。文档同时区分字体文件托管与 CSS 指定名称。Noto CJK 的官方 [Sans 许可](https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/LICENSE)和 [Serif 许可](https://raw.githubusercontent.com/notofonts/noto-cjk/main/Serif/LICENSE)均为 SIL Open Font License 1.1，允许免费使用、嵌入与随软件分发。项目当前只指定它们的字体名称。

## 其他页面素材

| 页面内容 | 来源证据 | 商业使用与发布条件 |
| --- | --- | --- |
| 鼓、玩家、电脑、生命及操作图标 | `src/App.tsx` 导入 `lucide-react`；`node_modules/lucide-react/LICENSE` | ISC 允许免费商业使用；构建复制完整许可 |
| favicon 鼓图形 | `public/favicon.svg` 使用与 Lucide Drum 一致的路径 | 随 Lucide 保留 ISC 许可 |
| 声调显示参考 | [HanDou.txt](../licenses/HanDou.txt) | MIT 允许免费商业使用，保留版权与许可 |
| 普通词语与拼音 | [CC-CEDICT.txt](../licenses/CC-CEDICT.txt) | CC BY-SA 4.0 允许商业使用；保留署名，公开分发修改后的资料时使用相同许可 |
| 成语与文档频次 | [THUOCL.txt](../licenses/THUOCL.txt) | MIT 允许免费商业使用，保留版权与许可 |
| 电脑词频参考 | [Jieba.txt](../licenses/Jieba.txt) | MIT 允许免费商业使用，保留版权与许可 |
| Unicode 部首资料 | [Unicode.txt](../licenses/Unicode.txt) | Unicode License v3 允许免费商业使用，保留版权与许可 |
| 字形部件资料 | [MakeMeAHanzi-COPYING.txt](../licenses/MakeMeAHanzi-COPYING.txt)、[MakeMeAHanzi-LGPL.txt](../licenses/MakeMeAHanzi-LGPL.txt) | LGPL-3.0-or-later 允许商业使用；分发相关资料时保留许可并提供对应资料与修改 |
| 汉字逐笔路径 | [MakeMeAHanzi-APL.txt](../licenses/MakeMeAHanzi-APL.txt)、[逐笔资料研究](radical-stroke-data-2026-10-13.md) | Arphic Public License 允许免费商业使用；保留版权、完整许可与修改说明，提供原始资料、可编辑修改数据和完整许可下载 |

`scripts/prepare-public.ts` 在构建时将 `licenses/` 全部复制到 `public/licenses/`，另复制 React、Lucide 和 pinyin-utils 的许可。页面当前使用的素材和资料均有允许免费商业使用的许可；发布时需要保留上表的署名和资料许可条件。

`reference-assets/` 中的 BombParty、Han Dou 页面资料与用户附件用于研究。Vite 只将 `public/` 作为静态发布资源目录，参考资料没有进入页面产品资源。

## 检查边界

本次核查范围包括 `public/`、`src/` 的字体与图形资源引用、许可复制脚本、受版本控制的数据来源记录和本轮下载的原作者素材。没有使用声音播放器进行主观听感评价，也没有检查玩家自行安装字体的授权。真实浏览器的音频解锁与事件播放由产品测试核验。
