# 击鼓传字联机服务研究

研究日期：2026-10-11（Asia/Shanghai）

## 研究范围

本次研究核对 `cyj-hashtag/cyj-hashtag.github.io/partition-quiz` 的真实联机方式和当前项目的免费联机部署方案。研究阅读了用户提供的完整目录文字源码、当前项目的服务端实现、部署说明与微信官方网络文档。研究资料与抓取的官方正文保存在 `.research/multiplayer-2026-10-11/`。

用户提供的仓库在研究时的提交为 [`cd66b72073fbfad90709b605309a65f7ff943705`](https://github.com/cyj-hashtag/cyj-hashtag.github.io/tree/cd66b72073fbfad90709b605309a65f7ff943705/partition-quiz)。目录包含 `app.js`、`index.html`、`style.css`、`server-config.json`、`build-info.json`、`icon.svg`、`share-card.png` 和 `audio/` 目录。目录没有服务端源码、部署文件或数据库结构；二进制图片和音频只按照文件清单核对，没有用于产品实现。

## 朋友项目的真实联机方式

`server-config.json` 把服务地址设置为 `https://cyj-hashtag-github-io.onrender.com`。`app.js` 启动时读取这个文件，也允许在浏览器本地保存服务地址。连接流程如下：

1. 浏览器向 `${serverOrigin}/api/session` 发送昵称和本地会话令牌，取得新的会话令牌。
2. 浏览器使用 `wss://cyj-hashtag-github-io.onrender.com/socket?token=...` 建立 WebSocket；本地 HTTP 地址会转换为 `ws`。
3. 建立连接后，浏览器发送 JSON 动作，例如创建房间、加入房间、准备、提交答案和交棒；服务端返回快照、逐字揭示、进度、错误和通知消息。
4. 连接中断后，客户端重新请求会话：WebSocket 中断等待 1.5 秒，建立会话失败等待 2 秒，再重新连接；客户端还保存未确认的统计事件。
5. 房间邀请链接使用 `?room=六位数字`，由客户端读取后发送 `join` 动作。项目使用 Canvas 绘制全部界面，Canvas 与联机传输相互独立。

因此这个仓库展示了一个“GitHub Pages 静态文件 + Render Web Service WebSocket”方案，服务端的房间判定逻辑不在该仓库中。Render 地址返回的 `/health` 在研究时为 404，无法从公开地址继续审计后端实现；不能据此推断其后端是否保留房间状态。

## 方案一：Render Free 与当前 Node.js 服务

Render 官方文档确认 Web Service 可以接受公网 WebSocket 连接，公网连接使用 `wss`，不限制单条连接的固定时长；服务端和客户端需要实现 keepalive 与断线重连。Render 把同一个服务的 HTTP 和 WebSocket 流量转发到一个公开端口。来源：

- [WebSockets on Render](https://render.com/docs/websocket)
- [Web Services](https://render.com/docs/web-services)

Render Free 可以免费创建 Web Service。官方说明 Free Web Service 在连续 15 分钟没有任何入站 HTTP 请求或现有 WebSocket 消息时会休眠，收到下一次 HTTP 请求或新的 WebSocket 连接时唤醒，唤醒约需一分钟。休眠、重启和重新部署都会清除本地文件；Free 服务随时可能重启，每月每个工作区提供 750 个 Free 实例小时。当前 Free Web Service 提供 512 MB RAM；Hobby 工作区包含每月 5 GB 出站流量与 500 分钟标准构建时间。未添加付款方式时，流量超额会暂停 Free 服务，构建时间超额会禁止新的构建。来源：[Free instances](https://render.com/docs/free)、[Render Pricing](https://render.com/pricing)。

当前服务可以直接作为 Render Web Service 运行，所需设置如下：

```text
Build Command: npm ci --include=dev
Start Command: npm run server
Environment: PORT 由 Render 注入；HOST=0.0.0.0；NODE_VERSION=22；ALLOWED_ORIGINS=https://crisply2404.github.io
```

Render 官方 Blueprint 文件默认命名为仓库根目录的 `render.yaml`。本研究按照官方 JSON Schema 生成候选文件 `.research/multiplayer-2026-10-11/render-candidate.yaml`，并使用抓取的官方 Schema 与 `jsonschema` 完成校验。候选服务字段如下：

```yaml
services:
  - type: web
    name: chuan-zi-server
    runtime: node
    plan: free
    region: singapore
    buildCommand: npm ci --include=dev
    startCommand: npm run server
    healthCheckPath: /health
    envVars:
      - key: NODE_VERSION
        value: "22"
      - key: HOST
        value: 0.0.0.0
      - key: ALLOWED_ORIGINS
        value: https://crisply2404.github.io
```

官方字段含义与限制：`services` 是非 Postgres 服务列表；`type: web` 表示 Web Service；`runtime: node` 选择 Node.js 原生运行环境；`name` 必须在 Blueprint 内唯一；`plan: free` 选择免费计算方案；`region: singapore` 是官方支持的部署区域；非 Docker 服务必须提供 `buildCommand`，Web Service 通常需要 `startCommand`；`healthCheckPath` 只能用于 Web Service，必须以 `/` 开头；`envVars` 使用 `key` 与 `value` 设置环境变量。`PORT` 由 Render 直接注入，不需要写入 Blueprint。来源：[Blueprint YAML Reference](https://render.com/docs/blueprint-spec)、[Blueprint Schema](https://render.com/schema/render.yaml.json)。

服务仓库根目录的 `render.yaml` 由 Render Blueprint 读取。Render Dashboard 的 Blueprint 创建流程可以连接该仓库和指定分支，检查文件并显示将要创建的资源。未设置 `repo`、`branch` 或 `rootDir` 时，服务沿用 Blueprint 所在仓库、分支与仓库根目录。来源：[Render Blueprints](https://render.com/docs/infrastructure-as-code)。

`server/index.ts` 已读取 `PORT`、`HOST` 和 `ALLOWED_ORIGINS`；`server/game-server.ts` 使用 `ws` 接受升级请求、使用 `/health` 提供健康检查，并通过 `setTimeout`、`setInterval` 维护回合计时、电脑玩家和心跳。`tsx` 当前位于 `devDependencies`，安装命令需要包含这些依赖。Render 只需要一个公网 HTTP 端口，当前服务的 WebSocket 升级处理可以继续使用。Render 支持通过 `NODE_VERSION` 明确 Node.js 版本，也提供 Singapore 区域；当前项目使用 Node.js 22，可在部署时选择 Singapore 并实际测量手机网络延迟。发布网页时，把 `VITE_WS_URL` 设置为 Render 的 `wss` 地址，再生成 GitHub Pages 的 `dist`。来源：[Node.js Version](https://render.com/docs/node-version)、[Regions](https://render.com/docs/regions)。

这个方案满足当前测试的主要路径：多人 WebSocket、服务端计时、服务端答案判定、密码房间、大厅与分享链接。Render 的入站 WebSocket 消息会重置休眠计时，当前客户端每 20 秒发送业务心跳，服务端每 30 秒发送协议 ping；有玩家连接时通常能够保持服务运行。

需要明确的边界：当前 `Room`、大厅和 `WordRules` 全部保存在一个 Node.js 进程的内存中。Render 休眠、服务重启、部署和平台维护都会清除房间；服务恢复后，新连接可能需要等待约一分钟，已有连接也会断开。连续 15 分钟没有状态变化的房间在应用层可以隐藏，但 Render 的 WebSocket 心跳仍属于平台入站流量，因此应用层隐藏时间与平台休眠时间互相独立。Render Free 适合朋友联机测试，无法提供重启后继续保留房间的保证。

## 方案二：Cloudflare Workers Free 与 SQLite Durable Objects

Cloudflare 官方确认 Workers Free 支持 SQLite-backed Durable Objects。免费额度包括每天 100,000 个 Durable Object 请求、每天 13,000 GB-s 计算时间、每天 5,000,000 行读取、每天 100,000 行写入和总计 5 GB SQLite 存储；超出任一免费额度后，对应操作会报错。Durable Object WebSocket 入站消息按 20:1 计入请求，协议 ping 不收费。来源：[Durable Objects Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)、[Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)。

Durable Object WebSocket Hibernation 可以让连接保持在线，同时把重要状态写入 SQLite；对象休眠时内存会被清除，下一条消息会重新执行构造函数。使用 Hibernation 时不能依赖 `setTimeout` 或 `setInterval`，回合截止、断线保留和大厅隐藏需要写成持久事件并使用 `setAlarm()`。来源：[WebSocket Hibernation](https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/)、[Durable Object Lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/)、[Alarms](https://developers.cloudflare.com/durable-objects/api/alarms/)。

当前服务不能直接上传到 Cloudflare。它使用 `node:http` 的 `upgrade` 事件、`ws.WebSocketServer`、Node.js 文件读取、进程内 `Map`、`setTimeout` 与 `setInterval`。Cloudflare 官方 `node:http` 文档明确说明 `upgrade` 事件和直接访问底层 socket 不受支持。Cloudflare 的 WebSocket API、SQLite 持久化和 alarm 调度需要单独实现。来源：[Workers node:http](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/)。

当前 `WordRules` 在 Node.js 22.18.0 上读取 88,613 条词语后，研究脚本测得解析约 461 ms、建立索引约 2,271 ms，主动执行 GC 后 `heapUsed` 约 183 MB、RSS 约 322 MB；Workers 单个 isolate 的内存限制为 128 MB。测量脚本和结果位于 `.research/multiplayer-2026-10-11/measure-rules.ts` 与 `.research/multiplayer-2026-10-11/rules-memory.json`。这是本机 Node.js 的测量，Worker 的真实内存仍需测量。迁移设计需要减少当前词库表示和索引占用，可以采用构建期生成的轻量查询数据或 SQLite 查询，并核实 Worker 实际用量。

Cloudflare 提供 `workers.dev` 免费子域名，官方将其定位为个人或爱好项目使用，并建议业务关键服务使用自定义域名或路由。来源：[workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)。它更适合需要重启后保存房间、跨实例扩展和长期在线的版本，开发工作量与当前 Node 服务差异较大。

## 与微信小程序的关系

微信官方要求小程序使用 `wx.connectSocket` 连接开发者服务器的 `wss` 地址，并且在小程序后台预先配置通信域名。通信域名只支持 `https` 与 `wss`；服务器域名需要有效证书，域名还需要满足微信平台的备案与配置要求。`wx.connectSocket` 同时最多建立五条 WebSocket 连接。来源：

- [wx.connectSocket](https://developers.weixin.qq.com/miniprogram/dev/api/network/websocket/wx.connectSocket.html)
- [小程序网络使用说明](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)

Render 自动提供 HTTPS 与 WSS 域名，可以用于小程序开发阶段；正式小程序仍需在微信后台配置该域名并处理备案要求。Cloudflare Worker 的 `workers.dev` 同样提供 HTTPS/WSS，但小程序上线前仍需满足微信对域名和备案的要求。两种服务都可以继续使用 `shared/types.ts` 的 JSON 消息格式，当前网页和未来小程序可以共用服务端协议。

## 推荐方案

当前推荐使用 **Render Free 部署现有 Node.js 服务**，原因是它可以直接运行仓库已有的 `server/`、`shared/`、`data/` 和 `licenses/`，支持公网 WSS、服务端计时与判定，朋友项目也采用同样的静态网页加 Render 服务结构。它适合网页发布到个人 GitHub Pages 后的手机、电脑和朋友联机测试，玩家不需要填写联机服务地址。

部署时把 Render 的 `onrender.com` 地址写入 `VITE_WS_URL`，由网页自动连接；保留客户端重连与服务端心跳。Render Free 的休眠、重启会丢失内存房间，发布说明应把它标记为测试阶段限制。Durable Objects 对应需要在服务重启后保留房间和扩大规模的部署要求，适配范围包括持久房间、alarm 调度和构建期轻量词库索引。

服务代码可以继续保存在当前独立仓库或私有仓库，由 Render 读取构建；个人网站只发布带有 `VITE_WS_URL` 的 `dist`，范围限于该网站的 `chuan-zi/` 目录。

## 复核边界

- 朋友项目公开目录没有后端源码，Render 服务的身份验证、房间状态保存与实例配置无法从该仓库确认。
- Render 官方没有承诺 Free 实例长期不重启，也没有为内存状态提供持久保证；推荐仅覆盖小规模测试。
- Cloudflare 免费额度按账户每日 UTC 时间重置，超出额度后操作会失败；当前词库索引内存测量来自 Node.js 22.18.0，迁移前仍需重新测量构建产物。
- 微信通信域名、备案与证书配置属于微信后台和服务部署步骤，研究没有代替这些外部配置。

## 官方资料

- [Render Free instances](https://render.com/docs/free)
- [Render WebSockets](https://render.com/docs/websocket)
- [Render Web Services](https://render.com/docs/web-services)
- [Render Pricing](https://render.com/pricing)
- [Render Node.js Version](https://render.com/docs/node-version)
- [Render Regions](https://render.com/docs/regions)
- [Render Blueprint YAML Reference](https://render.com/docs/blueprint-spec)
- [Render Blueprint JSON Schema](https://render.com/schema/render.yaml.json)
- [Render Blueprints](https://render.com/docs/infrastructure-as-code)
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Durable Objects Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Cloudflare Durable Object Lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/)
- [Cloudflare WebSocket Hibernation](https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/)
- [Cloudflare workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [Cloudflare Workers node:http](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/)
- [微信 `wx.connectSocket`](https://developers.weixin.qq.com/miniprogram/dev/api/network/websocket/wx.connectSocket.html)
- [微信小程序网络使用说明](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)
- [朋友项目 `partition-quiz`](https://github.com/cyj-hashtag/cyj-hashtag.github.io/tree/main/partition-quiz)
