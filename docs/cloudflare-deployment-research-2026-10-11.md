# Cloudflare 联机服务研究

研究日期：2026-10-11（Asia/Shanghai）

## 推荐结论

推荐 `击鼓传字` 使用 Cloudflare Workers Free + SQLite Durable Objects 部署公开联机服务。它提供 `workers.dev` 公共域名，浏览器可以通过 `wss://<名称>.<账户子域>.workers.dev/ws` 连接；GitHub Pages 继续只发布静态网页。免费额度可以支持小规模测试与朋友联机，实际容量需要由游戏的计算时间、存储操作数量和并发连接测量结果确认。使用量超过免费额度时会返回错误，因此需要在 Cloudflare 控制台观察用量。

Cloudflare 官方将 `workers.dev` 定位为个人或爱好项目使用的免费站点，并建议业务关键的生产服务使用自定义域名或路由。测试阶段可以使用 `workers.dev`，公开长期运行时可以把独立服务绑定到自己的域名。

来源：

- [workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)（Cloudflare 官方文档，2026-09-22 更新）
- [Workers 计费](https://developers.cloudflare.com/workers/platform/pricing/)（Cloudflare 官方文档，2026-10-02 更新）
- [Durable Objects 计费](https://developers.cloudflare.com/durable-objects/platform/pricing/)（Cloudflare 官方文档，2026-09-30 更新）

## 当前免费额度与行为

Workers Free：

- 每日 Worker 请求 100,000 次，UTC 每日 00:00 重置。
- 每次请求 CPU 时间 10 毫秒，内存每个 isolate 128 MB。
- 每次请求最多 50 个外部 subrequest，每个账户最多创建 100 个 Worker；静态资源请求免费且不限量。
- 超过每日请求额度时返回 Cloudflare Error 1027；超过 CPU 或内存限制时返回资源限制错误。

Durable Objects Free：

- 只能使用 SQLite storage backend。
- 每日请求 100,000 次，包含 HTTP 请求、RPC session、WebSocket 消息和 alarm 调用。
- 每日计算时长 13,000 GB-s。
- 每日读取 5,000,000 行、写入 100,000 行；SQLite 数据总量 5 GB。
- 免费额度超出任意一项后，该类操作会失败；每日额度在 UTC 00:00 重置。

WebSocket 连接建立需要一次请求。Durable Objects 的 WebSocket 入站消息按照 20:1 计入计费请求，官方说明出站 WebSocket 消息和入站协议 ping 不收费。免费额度限制服务可用时间与操作数量，部署后需要设置用量监控并保留服务故障界面。

Workers Paid 的账户最低费用为每月 5 美元，此外按照超出包含额度的实际用量计费。免费账户超出额度会返回错误，不会自动增加付费使用量。本文提供免费部署建议，用户尚未决定购买付费计划。

来源：

- [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)（Cloudflare 官方文档，2026-10-08 更新）
- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/) 的 Durable Objects 与 Workers Free 表格
- [Durable Objects Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) 的 Free plan 表格与 WebSocket 计费说明

## WebSocket Hibernation 与定时器

Cloudflare 官方建议 Durable Objects WebSocket 服务使用 WebSocket Hibernation。`acceptWebSocket()` 允许对象在没有活动时退出内存，同时保持客户端连接；收到消息时运行时会重新执行构造函数并恢复连接附件。对象进入 hibernation 前不能存在 `setTimeout`、`setInterval`、未完成 I/O、出站连接或标准 WebSocket API。Hibernation 对象的连接仍保持，内存中的状态需要写入 SQLite。

Durable Object 每个对象一次只能设置一个 `setAlarm()`。alarm 至少执行一次，异常时使用指数退避自动重试，官方文档说明最多重试 6 次；`setAlarm()` 属于一次写入操作。房间对象把回合截止、电脑作答、重连过期等全部事件保存到 SQLite，只为最早事件设置 alarm；执行时处理已经到期的事件，继续为下一个事件设置 alarm。每个事件保存唯一编号与处理状态，重复 alarm 执行不会重复扣除生命或推进回合。

来源：

- [WebSocket Hibernation 示例](https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/)（Cloudflare 官方文档，2026-04-21 更新）
- [Durable Object 生命周期](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/)（Cloudflare 官方文档，2026-09-30 更新）
- [Durable Objects Alarms](https://developers.cloudflare.com/durable-objects/api/alarms/)（Cloudflare 官方文档，2026-04-21 更新）

## 与当前 Node.js 服务的关系

当前 [server/game-server.ts](../server/game-server.ts) 使用 Node.js `http`、`ws`、`node:crypto`、`node:fs/promises`、进程内 `Map` 保存大厅与房间，使用 `setTimeout`、`setInterval` 处理回合、电脑玩家、身份恢复和心跳。它依赖一个持续运行的 Node.js 进程，房间状态只在进程内保存。

Cloudflare Workers 的 WebSocket Hibernation 入口需要 `WebSocketPair` 和 Durable Object 的 `acceptWebSocket()`。官方 `node:http` 文档明确说明不支持 `upgrade` 事件与底层 socket 直接访问，所以当前 `httpServer.on('upgrade')` 和 `ws.WebSocketServer.handleUpgrade()` 需要使用 Workers WebSocket API 重新实现。现有 `setTimeout` 与 `setInterval` 会阻止 Durable Object 进入 hibernation。

Workers 的 `node:fs` 能读取构建中包含的只读 `/bundle` 文件；当前词库加载需要加入 Worker 构建配置并使用对应资源路径，也可以把词库放入 Cloudflare storage。当前 `data/dictionary.json` 文件为 16,179,055 字节，`WordRules` 加载后还会创建词语与条件索引，部署前需要测量总内存和重新初始化耗时。16 MB 文件大小本身不能证明能在 128 MB isolate 内完成索引构建。

迁移范围包括：

1. 将 Worker `fetch`、大厅索引 Durable Object 和一个房间一个 Durable Object 的 WebSocket Hibernation 入口加入独立的 Cloudflare 服务目录；明确大厅和房间连接切换及广播路径。
2. 将大厅索引、房间设置、玩家会话、比赛状态、答案记录与聊天写入 SQLite；把重连身份放入带过期时间的数据记录。
3. 使用持久事件表与最近事件 alarm 处理回合计时、电脑玩家回合、60 秒重连过期和 15 分钟大厅隐藏；收到消息时同样根据服务端时间处理已经到期的事件。
4. 保持 `shared/types.ts` 的 JSON 消息格式，使网页和未来微信小程序使用同一套消息；检查 Origin、房间分享链接和 `wss` 路径。
5. 将词库编译为 Worker 可加载的数据资源，并重新检查 Worker 64 MiB 未压缩大小、初始化 CPU 与 Durable Object SQLite 写入额度。
6. 在 GitHub Pages 构建时设置 `VITE_WS_URL=wss://<Worker 地址>/ws`。网页不显示联机服务地址输入框。

此迁移需要新增 Cloudflare Worker 项目文件，并且需要用户创建 Cloudflare 账户、选择 Worker 名称、接受 Cloudflare 当前服务条款后部署。研究交付为本文件与保存在 `.research/` 的官方正文资料。

## Node.js API 兼容性边界

Cloudflare Workers 在兼容日期达到 2026-08-04 后默认启用 Node.js 兼容能力；官方列表仍区分原生支持、部分支持和仅可导入但调用会抛出错误的模块。这个兼容层用于提升 npm 包兼容性，不能把持续运行的 Node.js 进程模型搬入 Workers。Durable Object 仍会因为部署、运行时更新或生命周期决定而重新启动，重要状态必须持续写入 SQLite。

来源：

- [Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)（Cloudflare 官方文档，2026-08-12 更新）
- [node:http](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/)（Cloudflare 官方文档，2026-04-23 更新）
- [node:fs](https://developers.cloudflare.com/workers/runtime-apis/nodejs/fs/)（Cloudflare 官方文档，2026-04-23 更新）

## 可执行的部署路径

1. 创建 Cloudflare 账户，在 Workers & Pages 中创建 Worker 项目。
2. 使用 SQLite Durable Object migration 创建房间对象，并通过 Wrangler 部署。
3. 确认 Worker 的 `/ws` 支持 WebSocket Upgrade，访问 `/health` 返回服务状态。
4. 在 GitHub Pages 构建命令中注入 Worker 的 `wss` 地址，发布到现有仓库的 `chuan-zi/` 目录。
5. 使用两个浏览器连接、创建房间、加入房间、开始一局、断线重连和分享链接进行验证。

Cloudflare 账号创建与部署属于外部服务操作；研究阶段只完成资料核查与迁移范围说明。
