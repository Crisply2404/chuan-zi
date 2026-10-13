# 当前任务

日期：2026-10-13，Asia/Shanghai。

本文件持续保存任务、当前状态、验证结果与使用的 Matt skill。详细记录位于 `.scratch/chuan-zi/issues/`。中断后从本文件与对应任务继续。

| 任务 | 状态 | Skill | 记录 |
| --- | --- | --- | --- |
| 17：音量控制、连续补间、声调与空集提示 | resolved | diagnosing-bugs、tdd、code-review | 已通过 34 项服务端与 24 项浏览器检查 |
| 18：免费 WSS 托管候选 | resolved | research | 用户已选择 Cloudflare Workers + SQLite Durable Objects，相关开发见任务 32 |
| 19：词语质量与素材许可 | resolved | research | 用户指定两项已排除；五个 CC0 音效及素材许可已核查，真实输出通过 |
| 20：拼音位置、双指针传鼓、独立计时 | resolved | reverse-engineer-anything、diagnosing-bugs、tdd、code-review | 独立 10 秒计时、双指针与拼音边界检查通过 |
| 21：集成验证与参考资料 | resolved | tdd、code-review | 35 项服务端、25 项浏览器与五个录音输出通过；Standards 与 Spec 要求检查通过 |
| 22：现成游戏词库 | resolved | research | 用户确认范围为普通词语＋成语，排除口语组合与专业名称；本次没有核实符合全部条件的完整集合；报告见 `ready-game-lexicon-2026-10-12.md` |
| 23：重复答案与题目顺延 | resolved | diagnosing-bugs、tdd、code-review | 39 项规则与联机测试、29 项浏览器测试覆盖重复反馈、顺延和自动提交 |
| 24：汉字内部部首着色 | resolved | research、tdd、code-review | Make Me a Hanzi matches、SVG 路径和许可已接入；部首逐笔颜色与动画通过 |
| 25：圆周拓扑与玩家水墨色 | resolved | diagnosing-bugs、tdd、code-review | 双人水平、三人 120°、八人与十六人菜单及页面高度通过；每人稳定颜色 |
| 26：共享输入与提交动画 | resolved | tdd、code-review | 真实双端草稿与匹配同步、快速结合中间帧、头像答案及截止自动提交、字形延迟顺序和新回合焦点通过 |
| 27：词库入口与成语核查 | resolved | diagnosing-bugs、tdd、code-review | 预设保留词库、16px 复选框及空穴来风匹配宀通过；全套浏览器检查通过 |
| 28：电脑输入过程 | resolved | tdd、code-review | 真实 WebSocket 验证 700ms 后逐字广播、650ms 暂停与最终提交 |
| 29：大厅卡片与传鼓显示 | resolved | tdd、code-review | 卡片标签、隐藏房主名称、同宽双箭头、五个生命单行通过真实浏览器检查 |
| 30：提交运动与即时输入 | resolved | diagnosing-bugs、tdd、code-review | 已开始结合沿用原元素，新回合立即输入，连续过程浏览器检查通过 |
| 31：中国大陆联机托管 | resolved | research | 官方免费条件、跨境连接与区域已核查；用户选择 Cloudflare，报告见本轮研究 |
| 32：Cloudflare 持久联机 | resolved | implement-spec、tdd、code-review | 已发布 chuan-zi-online.tcoinsm.workers.dev，公网双人 WebSocket 和重连通过；46 项规则与联机测试通过 |
| 33：词库覆盖与中文游戏 | resolved | diagnosing-bugs、research、writing-for-agents | 更新官方 CC-CEDICT 快照，独享可匹配；报告记录中文游戏入口与许可 |
| 34：箭头、重复词与错误反馈 | resolved | diagnosing-bugs、tdd、code-review | 翻面变灰、输入时提示重复词、方格内部反馈通过专项检查 |
| 35：设备字体与部首数量 | resolved | research、tdd、code-review | 设备字体区域着色、部首一或二个等概率、研究边界记录 |
| 36：最后一名玩家与平局 | resolved | tdd、code-review | 最后玩家继续同题，双方零生命平局计入局数；多人累计胜局并列继续加赛 |
| 37：易误写词语提醒 | resolved | research、tdd、code-review | 用户指定词形、真实游戏截图、草稿与拒绝扣时通过 |
| 38：返回过程中更新提示 | resolved | diagnosing-bugs、tdd、code-review | 返回开始显示新提示，连续位置与即时输入通过 |
| 39：部件与拼音组合布局 | resolved | diagnosing-bugs、tdd、code-review | 电脑和手机的部件在上、拼音在下，结合与声调检查通过 |
| 40：用户维护易误写提醒 | resolved | tdd、writing-for-agents | 用户指定词形与两项字段，规则、联机、浏览器、workerd 与构建通过 |

## 用户已经确定的要求

- 拼音完整位于方格内，汉字在上，拼音在下。
- 鼓遮盖箭头的中心，双指针联系上一位与当前作答玩家，连续旋转。
- 独立回合计时默认为 10 秒，无效提交仍减少一秒。
- 播放 CC0 录音素材，打鼓使用独立鼓声音效。
- 平台减少动态效果设置不改变游戏动画。后台冻结、浏览器停用脚本等运行限制需要按实际能力说明。
- 词库继续调查日常词语范围，用户指出的示例保存收录检查依据。
- 同一提示超时后依次传递，全部仍在场参赛者未答出后换题；截止时先检查已确认草稿，合法则自动提交。
- 部首按实际常见部件形态匹配，判定采用真实笔画映射；显示保持设备字体，提示区域黑色、补全区域玩家水墨色，用户接受连笔和交叠处的颜色边界。
- 共享草稿、匹配和补全颜色；观看者保留方格与动画、颜色边线，隐藏光标，当前玩家拥有编辑权限。

## 后续步骤

Cloudflare 服务已经发布，网页产物通过 `npm run build:pages` 连接公开 WSS。现成游戏词库研究已完成，当前仍使用项目词库。个人网站未更新，中国大陆多运营商网络测量尚未完成。
