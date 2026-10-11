# 音效来源研究

日期：2026-10-12。时区：Asia/Shanghai。

## Web Audio API

MDN 的 [Web Audio API 说明](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)说明，AudioContext 使用可连接的音频节点处理声音，声音来源可以是数学生成的 OscillatorNode，也可以是本地音频文件的 AudioBufferSourceNode。它既能播放项目内的录音，也适合生成短促的反馈音，并且可以在运行时控制频率、增益和效果。

局限：只用振荡器生成的音色较难表现自然鼓声的瞬态、共鸣和衰减。它解决的是声音生成与控制问题，不会提供第三方录音素材。

## 外部音频素材

音频文件适合提供自然鼓声，发布时应随网页构建产物和未来小程序资源一起发布。运行时加载第三方网址会增加网络、缓存和授权记录风险，因此产品不使用远程音频地址。

素材选择以单个文件的许可证为准：

- [Creative Commons CC0](https://creativecommons.org/publicdomain/zero/1.0/)允许作者在法律允许范围内放弃版权和相关权利，页面说明可复制、修改、分发和用于商业目的。项目仍保存来源链接作为内部记录。
- [Freesound Licensing](https://freesound.org/help/licensing/)是音频上传的许可证说明页。Freesound 上的文件许可证各自独立，不能因为来源网站相同就视为拥有相同使用权；只选择明确标记为 CC0 或经过逐项核验的兼容许可证文件。
- [OpenGameArt FAQ](https://opengameart.org/content/faq)说明商业项目可以使用其素材，但必须遵守每个文件的许可证与署名要求。带有署名、相同方式共享或禁止商业使用条件的文件需要单独评估。

## 项目决定

当前使用本地 CC0 鼓声与 Web Audio API 反馈音的混合方案。已加入 `public/audio/chuan-zi-drum.wav`，来源与处理记录保存在受版本控制的 `licenses/Bauchamp-130-combinaison-de-percussions-CC0.txt`，构建时复制到 `public/licenses/`。音频资源记录文件名称、来源地址、作者、许可证、处理方式和校验值。
