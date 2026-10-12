# BombParty 箭头与音效证据

日期：2026-10-12，Asia/Shanghai。

## 目标与证据

用户指定房间 `https://jklm.fun/TAJH`。REA 浏览器发现记录 `ev_8a94516984fec03ec7fd3bc35ff20b100b3d5f0ac0e16eed0c925e092c0b29f5` 确认目标页面。REA `analyze_web_bundle` 记录 `ev_c1c2ac24d5db349c3056f8e114395e7aceec71b91ed512cde87b33bc9170f63d` 解析九个脚本；页面停在昵称输入，未进入比赛，运行中的箭头行为没有直接采样。

公开 BombParty 客户端从 `https://phoenix.jklm.fun/games/bombparty/bombparty.js` 获取，SHA-256 为 `000c78768a44210eef8af78bb7ef428ef5156e6d237414d1901693d81748987e`。REA 静态分析父记录 `ev_0e7318f2301f0e79878c9348e080997ebfb69f182989732c197158edf5450acc` 与概要 `ev_1a3c632bbd8201b1733be22dfd33755d6627fc8f9518ae53261f5733c1981d87` 覆盖该完整脚本，无语法解析失败；动态语义有未确定关系，静态分析没有执行脚本。

完整 Evidence 导出至 `.research/bombparty-rea-evidence-2026-10-12.json`。脚本保存在 `.research/bombparty-client-2026-10-12.js`。

## 客户端代码可以确认的行为

- 第 593 行加载 `arrow.png`。第 842 行按当前玩家座位索引计算目标角度。
- `animate()` 每次调用 `requestAnimationFrame`；第 918 行通过 `jklmMath.lerpAngle(..., 0.15)` 接近目标角度，第 919 行旋转 Canvas，第 920 行绘制箭头。
- 第 925 行之后绘制中央炸弹，因此炸弹覆盖箭头中心。玩家与炸弹共享 Canvas 中心和布局缩放。
- 代码加载七个 WAV：ignite、selfTurn、failWord、failWord_alreadyUsed、correctWord、explosion、tick。当前玩家开始作答播放 selfTurn，tick 用于当前玩家的循环计时。

这些结论来自公开客户端代码。服务器规则、素材版权及房间当前比赛状态没有由此确定。

## 击鼓传字设计

采用独立绘制的 SVG 双指针，以鼓为旋转中心。当前玩家指针使用橙色，上一位玩家指针使用中性灰；服务端广播 `previousPlayerId`，重连和页面切换后仍显示正确来源。指针通过 Web Animations 连续旋转，中央鼓在上层遮盖指针。方格与输入继续使用 DOM。

## 参考资料

- 用户图三原文保存在 `reference-assets/user-attachments/2026-10-12/3.png`，同时保存到 `reference-assets/bombparty/2026-10-12-player-arrow.png`。
- 原箭头图片与声音保存到 `reference-assets/bombparty/`。这组资源的商业许可没有确认，只用于研究，不进入 `public/` 或网页构建。
- 产品音效来自另行核验的 CC0 来源，见 `assets-and-audio-audit-2026-10-12.md`。
