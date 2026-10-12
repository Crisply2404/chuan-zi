# 面向中国大陆玩家的联机托管研究

核查日期：2026-10-13，Asia/Shanghai。只引用平台官方文档、浏览器 API 官方资料与当前项目源码。没有创建账户、购买服务器、部署公开服务或修改产品代码。抓取正文保存在 `.research/hosting-2026-10-13/`。

## 用户条件与证据范围

用户希望网页打开后自动联机，当前使用 GitHub Pages 发布 `dist/`，主要玩家来自中国大陆；此前提出免费托管要求，未来计划使用微信小程序。服务需要长期 WebSocket、大厅、唯一房间、权威计时和实时草稿广播。

GitHub Pages 只提供 HTML、CSS、JavaScript 等静态文件。[GitHub 官方文档][github-pages] 浏览器 HTTPS 页面应连接 `wss`，公开服务的有效 TLS 证书、WebSocket Upgrade 和网页来源检查均需要完成。[MDN WebSocket 客户端文档][mdn-ws] 项目已有 `VITE_WS_URL` 构建配置、`ALLOWED_ORIGINS` 和 `render.yaml`，玩家无需填写地址；有关步骤见 `docs/deployment.md`。

这次没有中国电信、中国联通、中国移动的真实客户端测量。因此各候选的中国大陆实际可达性、首次连接时间、消息往返延迟和断线频率均为**未核实**。不能把拥有亚洲区域等同于中国大陆网络质量保证，也不能把免费全球网络当作免费中国大陆节点。

## 适用方案

| 判断项目 | Cloudflare Workers + SQLite Durable Objects | Render Free Singapore | 阿里云中国大陆轻量应用服务器 |
| --- | --- | --- | --- |
| 费用 | 每日免费额度，超过对应额度操作失败 | 免费额度，超过月度资源可能暂停 | 购买订阅套餐，另有域名等费用 |
| 大陆部署依据 | China Network 是 Enterprise 的单独订阅；免费 Workers 没有中国大陆节点承诺 | 官方提供 Singapore，没有中国大陆区域 | 官方提供北京、上海、杭州、深圳、广州等中国大陆区域 |
| WebSocket | 官方 Hibernation API，空闲可保留连接 | 原生 Node.js `ws`，公网使用 WSS | 运行现有 Node.js 服务，通过 HTTPS 反向代理提供 WSS |
| 空闲后的行为 | Hibernation 后重建对象，连接可以继续保留 | 无入站流量 15 分钟暂停，新连接唤醒约一分钟 | 订阅服务器由部署者保持运行，无 Render Free 类型的空闲暂停机制 |
| 房间恢复 | 编写 SQLite 状态保存与恢复 | 当前内存房间在暂停、重启后清除；Free 不支持持久磁盘 | 当前内存房间在进程重启后清除；可以编写本机持久化 |
| 当前项目适配 | 新 WebSocket 入口、存储恢复、alarm 调度和词库查询 | 已有部署配置，直接运行 Node.js 22 | 直接运行 Node.js 22/Docker，配置证书、进程和系统更新 |
| 发布者管理 | 平台管理运行环境 | 平台管理运行环境 | 发布者管理服务器，现有 Docker/Caddy 配置可使用 |

平台事实来源：[Cloudflare DO 价格][cf-do-price]、[Cloudflare 中国网络][cf-china]、[Render Free][render-free]、[Render 地域][render-regions]、[Render WebSocket][render-ws]、[阿里云地域][aliyun-regions]、[阿里云产品说明][aliyun-sas]、[阿里云计费][aliyun-billing]。

## Cloudflare Workers + SQLite Durable Objects

免费 Workers 每日 100,000 次请求、每次 HTTP 请求 10ms CPU、每个 isolate 128MB；当前官方 Worker 大小限制为 64MiB。[Workers 限制][cf-limits] Durable Objects 免费计划只支持 SQLite 后端，每日 100,000 次请求、13,000 GB-s，每日读取 5,000,000 行、写入 100,000 行，账户总存储 5GB。超过任一免费限制，对应操作返回错误，每日 00:00 UTC 更新额度。[DO 价格][cf-do-price]

DO WebSocket 入站消息按 20:1 计入 compute 请求费用；建立连接、alarm、HTTP/RPC 请求也消耗额度。出站 WebSocket 消息和协议级入站 ping 没有请求费用。[DO 价格][cf-do-price] 128MB 分配按对象计算 duration：13,000 GB-s ÷ 0.125GB 约为 28.9 个对象小时/日。这是额度换算，实际用量需要记录活跃对象时间；不能据此承诺无限同时游戏。[DO 价格][cf-do-price]

Hibernation 能保留客户端连接、释放对象内存，下一条消息重新执行 constructor。游戏状态必须及时保存，连接身份可以使用 `serializeAttachment`/`deserializeAttachment` 保存。[DO WebSocket][cf-do-ws] `setTimeout`/`setInterval` 会阻止 Hibernation；回合截止与电脑动作需要使用保存的事件时间和 alarm。[DO 生命周期][cf-lifecycle] 持久化提供恢复能力，仍需处理平台维护、发布与网络造成的断线。[DO 生命周期][cf-lifecycle]

当前服务 `server/game-server.ts` 使用 `node:http`、`ws`、内存 Map 和计时器。Cloudflare `node:http` 不支持 `upgrade` 事件和底层 socket 访问，现有入口需要适配。[Cloudflare HTTP API][cf-http] 2026-10-11 本机记录中，词库索引 `heapUsed` 为约 175MiB、RSS 约 307MiB；记录为 `.research/multiplayer-2026-10-11/rules-memory.json`。这个旧测量只用于资源判断，当前字形资料变更后的完整内存尚未重新测量。Cloudflare 查询设计必须经过真实 128MB 限制验证。

`apac`、`apac-ne`、`apac-se` 是位置提示，平台尽力满足，不能指定香港城市，也不能保证某个中国大陆区域。对象位置在首次创建时决定，当前不会自动迁移。[DO 数据位置][cf-location]

Cloudflare 官方明确写明：外部地区访问中国大陆会遇到网络边界带来的延迟与可靠性问题。其 China Network 由京东云合作运营，属于 Enterprise 的单独订阅，每个加入的根域名需要 ICP 备案或许可。[China Network][cf-china] 因此免费 Workers + DO 的费用和运行特征成立，但中国大陆稳定低延迟这一条件仍然缺少实测证明。

平台免费提供 `workers.dev` 测试地址，官方将其定位为个人和 hobby 项目，关键生产用途建议使用自己的域名。[workers.dev][cf-domain] 自有域名可以更换服务地址和控制 TLS；它本身不保证消除跨境延迟。没有官方依据确认本项目的 `workers.dev` 地址是否在各个中国大陆运营商被限制，所以此项保持未核实。

## Render Free Singapore

现有服务可以直接运行，`render.yaml` 已设置 Singapore、Node.js 22、`npm ci --include=dev`、`npm run server`、`/health` 和 GitHub Pages 来源。Render 公网 WebSocket 使用 WSS，没有固定连接时长限制；维护、发布与实例更换仍会断开连接，需要 keepalive 和重连。公开出站 WebSocket 消息计入出站流量。[Render WebSocket][render-ws]

Free 为 512MB、0.1 CPU，每个 workspace 每月 750 小时。连续 15 分钟没有 HTTP 或 WebSocket 入站流量会暂停，新连接唤醒约一分钟。免费服务可能随时重启，不能使用持久磁盘；Free Postgres 30 日后到期，Free Key Value 重启清除状态。[Render Free][render-free]

官方明确要求 Free 实例用于测试、hobby 或预览，并提醒不要用于生产应用。[Render Free][render-free] 因此它适合现有 Node.js 服务的免费公开测试，需要接受首次访问可能等待与房间清除。出站流量和构建额度按 workspace 当前计划判断；本次动态价格页面未提供可独立读取的完整额度表，确定金额和额度应以账户 Billing 页面为准。

官方可选区域为 Oregon、Ohio、Virginia、Frankfurt、Singapore。Singapore 是已有配置选择，平台没有公开承诺其到中国大陆三大运营商的延迟、丢包率或成功连接率。[Render 地域][render-regions] 未核实是否存在 `onrender.com` 的中国大陆访问限制，不能把它表述为确定可以访问或确定无法访问。

## 中国大陆轻量服务器

阿里云官方按主要用户地区建议选择最近的区域，并明确说明香港及其它中国大陆以外区域的带宽面向当地用户，中国大陆访问可能出现高延迟和丢包。中国大陆区域适用于主要用户与业务都在中国大陆的应用。[阿里云地域][aliyun-regions] 这提供了选择中国大陆服务器的官方依据；本项目实际性能仍需要部署验证。

轻量应用服务器提供 CPU、内存、磁盘、流量套餐、公网 IP、防火墙与管理面板；当前 Node.js/Docker 服务可以直接运行。[阿里云产品说明][aliyun-sas] 采用 2GB 及以上内存是依据项目现有约 307MiB RSS、系统与 TLS 代理资源保留作出的部署建议，具体容量需真实压力检查。

订阅套餐需要购买，价格按地域和购买页面确定，超套餐流量可能另外计费。[阿里云计费][aliyun-billing] 本次没有核实适用于本游戏的长期免费中国大陆服务器，不把新用户优惠或短期试用视为长期免费。

中国大陆服务器对外提供域名服务前需要满足备案要求。阿里云官方明确：域名解析到中国大陆服务器且没有相应备案，会被平台限制；已有其它接入商备案也需要添加服务商。[阿里云备案说明][aliyun-icp] 网页仍可保留现有 GitHub Pages 测试入口，联机服务使用发布者管理的备案域名和 WSS；只更新个人网站的 `chuan-zi/` 构建产物。

服务器可以运行现有 `deploy/Caddyfile` 或其它支持 WebSocket Upgrade 的 HTTPS 代理。这里属于当前项目部署设计；平台提供磁盘本身不会自动保存当前内存房间，房间恢复需要编写和验证存储逻辑。

## 建议与发布验证

对于“主要玩家来自中国大陆、长期公开提供游戏”这一目标，推荐**中国大陆的轻量服务器和备案域名**，本次已核实阿里云方案。它保留现有 Node.js 实现、避免海外区域路径成为主要服务依赖，服务器与域名需要费用。免费托管要求继续保留时，**Cloudflare Workers + SQLite Durable Objects**具备长期免费额度、持久状态和空闲保留连接的能力，必须完成运行环境适配与中国大陆真实网络检查；官方资料支持这些运行能力，不能支持“大陆保证可用”的结论。**Render Free Singapore**可以直接使用现有代码开展免费公开测试，官方空闲唤醒与重启条件需要接受。

公开发布检查应使用真实服务与真实网络：

1. HTTPS `/health` 返回正常，WebSocket Upgrade 成功，GitHub Pages 页面自动连接。
2. 至少两台设备完成创建房间、分享加入、草稿同步、接受答案、传递回合、超时、断线重连。
3. 中国大陆主要运营商环境记录首次连接、消息往返时间、持续连接和恢复行为；同时记录 GitHub Pages 静态入口加载情况。
4. 平台重启或重新部署后核查房间状态是否按选定方案恢复。
5. 记录内存、CPU、出站字节、Cloudflare 请求/对象活跃时间/数据库行数，确认免费额度或套餐边界。

用户于 2026-10-13 选择 Cloudflare 免费方案，并确认已经拥有账户，可通过 Wrangler 登录。服务适配见任务 32；中国大陆真实网络检查仍需公开服务地址。

## 官方来源

[github-pages]: https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages
[mdn-ws]: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications
[cf-limits]: https://developers.cloudflare.com/workers/platform/limits/
[cf-do-price]: https://developers.cloudflare.com/durable-objects/platform/pricing/
[cf-do-ws]: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
[cf-lifecycle]: https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/
[cf-location]: https://developers.cloudflare.com/durable-objects/reference/data-location/
[cf-china]: https://developers.cloudflare.com/china-network/
[cf-domain]: https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
[cf-http]: https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/
[render-free]: https://render.com/docs/free
[render-regions]: https://render.com/docs/regions
[render-ws]: https://render.com/docs/websocket
[aliyun-sas]: https://www.alibabacloud.com/help/en/simple-application-server/product-overview/what-is-simple-application-server
[aliyun-regions]: https://www.alibabacloud.com/help/en/simple-application-server/product-overview/regions-and-network-connectivity
[aliyun-billing]: https://www.alibabacloud.com/help/en/simple-application-server/product-overview/overview
[aliyun-icp]: https://www.alibabacloud.com/help/en/icp-filing/basic-icp-service/user-guide/overview
