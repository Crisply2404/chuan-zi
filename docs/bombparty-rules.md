# JKLM.FUN BombParty 规则研究

研究日期：2026-10-08（Asia/Shanghai）  
研究范围：`https://jklm.fun` 当前公开页面、官方 FAQ、官方前端资源和 BombParty 客户端代码。本文记录可复核事实，不能替代服务器端源代码或一次实际 `setup` 消息。

## 证据等级

- **官方说明**：JKLM.FUN 自己发布的 FAQ 或页面文字。
- **客户端可以验证**：官方公开 JavaScript、HTML 或翻译资源明确体现的行为、字段和界面。
- **服务器行为尚未验证**：客户端会读取或发送某个字段，但公开静态资源不能证明服务器实际采用的默认值、上下限或全部判定细节。

## 核心玩法

客户端教学文字写着：`Type a word that contains the prompt. Be quick! If the bomb explodes during your turn, you lose a life.`；另一句写着：`Use all the bonus letters to earn a life back.`（**客户端可以验证**，见 [BombParty HTML](https://phoenix.jklm.fun/games/bombparty)）。

每个回合由当前玩家提交一个包含提示片段（客户端字段名为 `syllable`）的单词。客户端向服务器发送 `setWord(word, false)` 进行实时输入同步，在提交表单时发送 `setWord(word, true)`（**客户端可以验证**，见 [bombparty.js](https://phoenix.jklm.fun/games/bombparty/bombparty.js)）。

服务器事件名称表明以下状态会广播给全部客户端：`nextTurn(playerPeerId, syllable, promptAge)`、`setPlayerWord`、`failWord(playerPeerId, reason)`、`correctWord({ playerPeerId, bonusLetters })`、`livesLost(playerPeerId, lives)`、`bonusAlphabetCompleted(playerPeerId, lives)`（**客户端可以验证**，见 [bombparty.js](https://phoenix.jklm.fun/games/bombparty/bombparty.js)）。

公开代码处理的失败原因包括 `mustContainSyllable`、`notInDictionary` 和 `alreadyUsed`。这证明客户端区分“未包含提示片段”“不在词典中”“已经使用过”三种失败反馈；服务器是否还会执行其他判定没有从静态资源确认（**客户端可以验证；完整服务器行为尚未验证**）。

## 炸弹计时

官方 FAQ 原文：`The timer is initialized at a random value between 10 and 30 seconds, and decreases. Each time that a player validates a word, if the remaining time is below the Minimum turn duration (5 seconds by default), the timer is reset to this minimum time. If the bomb explodes, we come back to the initial situation with a new random value.`（**官方说明**，见 [FAQ](https://jklm.fun/faq)，问题 `How does the timer of BombParty work? When does the bomb explode?`）。

由这段官方文字可以确认：初始值随机范围为 10 至 30 秒；单词验证后，如果剩余时间低于 `Minimum turn duration`，计时器补回该下限；FAQ 给出的默认下限是 5 秒；炸弹爆炸后回到初始状态并重新随机计时。每个玩家实际回合的精确服务端计时、网络延迟处理和边界时刻判定未在公开资源中确认。

客户端界面提供 `Minimum turn duration (seconds)`，说明文字为 `Bomb lasts at least this long for each player.`，并通过 `setRules({ minTurnDuration })` 修改（**客户端可以验证**，见 [BombParty HTML](https://phoenix.jklm.fun/games/bombparty) 与 [bombparty.js](https://phoenix.jklm.fun/games/bombparty/bombparty.js)）。当前服务器允许的最小值、最大值和初始值尚未从 `setup` 数据核实。

## 生命、淘汰和胜者

官方 FAQ 原文：`You need to use all the letters on the right side. The minimum and the maximum number of lives per player is set by the Party leader of the room.`（**官方说明**，见 [FAQ](https://jklm.fun/faq)，问题 `How can I gain a life on BombParty?`）。

客户端显示每名玩家的生命，收到 `livesLost` 后更新生命数；收到 `bonusAlphabetCompleted` 后更新生命数并播放奖励动画（**客户端可以验证**，见 [bombparty.js](https://phoenix.jklm.fun/games/bombparty/bombparty.js)）。客户端绘制中，生命大于零时显示心形，生命为零时显示骷髅；具体淘汰时机、零生命玩家是否立即退出当前回合、最后胜者判定由服务器控制，静态资源没有完整说明（**客户端可以验证；服务器行为尚未验证**）。

客户端座位状态有 `lastRound.winner`，界面文字为 `won the last round!`；这证明客户端会接收上一局赢家并展示。最后胜者的精确判定条件（例如剩余一人、同回合同时爆炸、平局处理）尚未从公开资源核实。

## 玩家人数和参与状态

官方 FAQ 原文：`A BombParty room can accommodate up to 16 players, with a minimum of 2 players.`（**官方说明**，见 [FAQ](https://jklm.fun/faq)，问题 `How many players can join each game ...?`）。

客户端规则中另有 `Maximum players`，说明文字为 `The amount of players that can join the game.`，并允许房主在座位阶段通过 `setRules({ maxPlayers })` 修改（**客户端可以验证**，见 [BombParty HTML](https://phoenix.jklm.fun/games/bombparty) 与 [bombparty.js](https://phoenix.jklm.fun/games/bombparty/bombparty.js)）。因此 FAQ 的 16 人是官方 FAQ 的房间容量说法，当前服务器是否仍固定为 16，以及该规则是否允许房主设置到其他值，尚未由一次服务器 `setup` 响应确认。

公开 `/api/rooms` 返回的 BombParty 房间列表在研究时出现过 `playerCount` 大于 16 的房间。该字段来自房间层人数，不能证明同一局 BombParty 的参赛人数上限，也不能推翻 FAQ；它只说明公开列表中的房间人数统计需要与游戏内参赛人数区分（**官方 API 可观察；规则含义尚未完全核实**，见 [rooms API](https://jklm.fun/api/rooms)）。

客户端提供 `join game`、`leave game`，并以 `players.length < rules.maxPlayers.value` 控制加入按钮；这说明玩家可以在座位阶段加入或退出当前局（**客户端可以验证**）。回合进行中加入、观战资格、断线后保留参赛状态和重连后的生命处理没有在公开资源中完整说明（**服务器行为尚未验证**）。房间层客户端会接收 `addPlayer`、`updatePlayer`、`removePlayer`，并将掉线玩家标记为 `isOnline`，但这不等同于游戏内参赛资格规则（**客户端可以验证；服务器行为尚未验证**）。

FAQ 说明 BombParty 房间至少需要 2 名玩家。座位状态客户端会读取服务器下发的 `constants.minPlayers`，并显示 `Waiting for {missingPlayers} more players…`；该字段实际值没有从公开静态请求取得（**官方说明确认最小值为 2；客户端字段可验证；其他服务器约束尚未验证**）。

## 词典、提示难度和重复单词

官方 FAQ 原文：`BombParty dictionaries are kept private and are only known by the Game Content Editors. Please don't ask for or give/share word lists, as some people will use them to cheat. You are free to look up words in a regular dictionary of course.`（**官方说明**，见 [FAQ](https://jklm.fun/faq)，问题 `Can I get a list of all the words that are allowed?`）。因此官方词库不公开，不能从该站得出完整允许单词表。

客户端从服务器读取 `dictionaryId.items` 和 `milestone.dictionaryManifest`，界面有 `Dictionary` 选择项。公开翻译资源列出可见词典名称：`German`、`Pokémon (German)`、`English`、`Pokémon (English)`、`Spanish`、`French`、`French with proper nouns`、`Pokémon`（法语 Pokémon 词典）和 `Brazilian Portuguese`；具体项目是否因服务器、地区或版本变化，仍以 `setup` 返回为准（**客户端可以验证；当前可选完整清单和默认项尚未由服务器消息核实**，见 [English BombParty text](https://phoenix.jklm.fun/games/bombparty/text/en.json) 与 [French BombParty text](https://phoenix.jklm.fun/games/bombparty/text/fr.json)）。

客户端提示难度界面包含 `Beginner`、`Medium`、`Hard` 和 `Custom`。文字分别采用 `at least {words} words per prompt`；自定义模式支持 `At least` 或 `At most`，并向服务器发送 `customPromptDifficulty`（**客户端可以验证**，见 [BombParty HTML](https://phoenix.jklm.fun/games/bombparty) 与 [bombparty.js](https://phoenix.jklm.fun/games/bombparty/bombparty.js)）。每个难度对应的词数、默认难度和服务器上下限来自 `dictionaryManifest.promptDifficulties`，公开静态代码没有固定数值。

`Maximum prompt age (turns)` 的界面说明为 `If this many players fail, the prompt changes.`；客户端通过 `nextTurn` 接收 `promptAge`，并允许房主修改 `maxPromptAge`（**客户端可以验证**）。该数值的默认值、上下限和“失败”是否只计算超时或也计算非法提交，尚未核实。

`alreadyUsed` 是客户端明确处理的失败原因，说明重复单词会被拒绝（**客户端可以验证**）。重复判定的范围（单局、回合、房间或词典语言）没有在公开资源中说明。

## 奖励字母

官方 FAQ 称 `use all the letters on the right side` 可以获得生命。客户端将该配置命名为 `customBonusAlphabet`，逐字母显示数量；完成后收到 `bonusAlphabetCompleted(playerPeerId, lives)`（**官方说明 + 客户端可以验证**）。

客户端提供 `Reset Bonus Alphabet`、`Save` 和 `Set all to:`。默认奖励字母表从 `milestone.dictionaryManifest.bonusAlphabet` 读取，房主可以提交自定义表（**客户端可以验证**）。每个字母的默认数量、可编辑上下限、完成奖励是否将生命限制在 `maxLives` 内，以及新一局是否清空收集进度，尚未由服务器行为核实。客户端在新回合收到新的玩家状态并读取 `bonusLetters`，但静态代码没有写出服务端重置规则。

## 房间和局面设置

客户端 BombParty 设置界面名称及代码字段如下：

| 设置名称 | 客户端字段 | 可确认内容 | 默认值和限制 |
| --- | --- | --- | --- |
| Dictionary | `dictionaryId` | 由服务器提供词典项目 | 未核实 |
| Prompt difficulty | `promptDifficulty`、`customPromptDifficulty` | Beginner、Medium、Hard、Custom；Custom 支持 At least/At most | 未核实 |
| Minimum turn duration (seconds) | `minTurnDuration` | 每名玩家至少保留该时长；FAQ 默认 5 秒 | 上下限未核实 |
| Maximum prompt age (turns) | `maxPromptAge` | 达到该失败次数后提示片段变化 | 默认值和上下限未核实 |
| Lives: Starting | `startingLives` | 初始生命数 | 默认值和上下限未核实 |
| Lives: Max | `maxLives` | 生命上限；FAQ确认由房主设置最小和最大生命 | 默认值和上下限未核实 |
| Maximum players | `maxPlayers` | 座位阶段加入人数上限 | FAQ 写最多 16；当前服务器值未核实 |
| Bonus Alphabet | `customBonusAlphabet` | 每个字母数量，可恢复默认或保存 | 默认表和上下限未核实 |

这些控件只在座位阶段由房主或工作人员编辑；房主关闭规则后才开始游戏。客户端状态名称为 `seating` 和 `round`，房主可以发送 `setRulesLocked`（**客户端可以验证**，见 [bombparty.js](https://phoenix.jklm.fun/games/bombparty/bombparty.js)）。座位倒计时是否固定、房主提前开始条件和服务器拒绝非法设置的错误码均未核实。

房间层另外提供 `public` / `private`、聊天模式 `enabled` / `disabled` / `noGuests`，这些是房间设置，BombParty 局内规则之外（**客户端可以验证**，见 [room.js](https://jklm.fun/room/room.js)）。

## 断线、重连和中途加入

房间客户端建立 WebSocket 连接；连接断开时显示 `Disconnected` 并尝试重连，游戏 iframe 断开会通知父页面（**客户端可以验证**，见 [room.js](https://jklm.fun/room/room.js) 与 [game.js](https://phoenix.jklm.fun/games/game.js)）。公开代码没有给出断线玩家在 BombParty 回合内的服务器处理、是否自动跳过、生命是否扣除、重连后是否恢复原座位，以及中途加入者能否观战或参加下一局（**服务器行为尚未验证**）。

## 可复核资源

- [官方 FAQ](https://jklm.fun/faq)：人数、计时、生命奖励和词典隐私的官方文字。
- [主站首页 HTML](https://jklm.fun/)：房间创建、公开/私人房间和 BombParty 入口。
- [BombParty HTML](https://phoenix.jklm.fun/games/bombparty)：教学文字、所有规则控件名称和界面说明。
- [BombParty 客户端 JavaScript](https://phoenix.jklm.fun/games/bombparty/bombparty.js)：客户端事件、字段、失败原因和状态转换。
- [房间客户端 JavaScript](https://jklm.fun/room/room.js)：房间人数、加入、断线和重连界面行为。
- [BombParty 英文翻译资源](https://phoenix.jklm.fun/games/bombparty/text/en.json)：当前资源没有返回内容，英文回退文本直接写在 HTML/JavaScript 中。
- [BombParty 法文翻译资源](https://phoenix.jklm.fun/games/bombparty/text/fr.json)：规则名称、说明、词典名称和回退文案的公开翻译。
- [公开房间 API](https://jklm.fun/api/rooms)：房间层人数统计和语言详情；不等同于游戏内参赛人数上限。

## 尚未核实的关键项

以下项目需要服务器端源码、一次授权的只读 `setup` 消息，或产品方明确答复：当前默认词典；各词典的实际可选名称和语言内容；提示难度数值；`minTurnDuration`、`maxPromptAge`、`startingLives`、`maxLives`、`maxPlayers` 的默认值和上下限；奖励字母表及其重置时机；非法单词提交后的计时处理；超时与手动提交的精确边界；生命为零后的淘汰和最后胜者判定；断线、重连、中途加入和观战规则；同一单词重复判定的范围。

