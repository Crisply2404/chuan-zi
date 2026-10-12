# 联机服务免费托管候选

核查日期：2026-10-12。资料来自平台官方网站。用户尚未选择平台，本次没有创建账户、部署服务或变更个人网站。

## 当前项目条件

网页继续发布到 GitHub Pages 的 `chuan-zi/` 目录，构建时配置公开 WSS 地址，玩家打开网页自动连接。服务端负责大厅、房间、计时、答案判定和电脑玩家。

当前服务使用 Node.js 22、`node:http` 与 `ws`，房间和会话保存在同一进程的 `Map` 中。房间计时、电脑回合和断线保留使用 `setTimeout`，连接检测使用 `setInterval`。重启进程后内存房间消失。相关文件为 `server/game-server.ts`、`server/index.ts` 与 `render.yaml`。

2026-10-11 的本机 Node.js 22 测量记录显示：88,613 条词语建立索引后，`heapUsed` 约 175 MiB，`rss` 约 307 MiB；解析与建立索引合计约 2.7 秒。记录在 `.research/multiplayer-2026-10-11/rules-memory.json`。这些数字用于判断资源要求，部署平台上的启动时间和内存仍需要实际测量。

## 候选比较

以下五项提供持续免费计划或每月更新的免费额度，支持公开 WSS；商业用途范围与运行条件分别记录。

| 候选 | 免费资源 | 空闲与连接 | 当前代码需要的工作 | 适合的使用目标 |
| --- | --- | --- | --- | --- |
| Cloudflare Workers + SQLite Durable Objects | 每日 10 万 Worker 请求；DO 每日 10 万请求与 13,000 GB-s；SQLite 每日读取 500 万行、写入 10 万行，账户共 5 GB | WebSocket Hibernation 保留连接；状态需要从存储恢复，通常没有 Render 约一分钟的唤醒等待 | 迁移 WebSocket、房间状态、计时与词库查询，适应 128 MB 内存 | 免费运行小规模游戏，房间持续保存与迅速连接 |
| Render Free | 每个实例 512 MB、0.1 CPU；每个 workspace 每月 750 实例小时、5 GB 出站 | 15 分钟没有入站流量后暂停；再次访问唤醒约一分钟；服务可能重启 | 已有 Node 入口与免费 Blueprint 配置；直接部署并配置网页 WSS 地址 | 尽快使用现有服务进行网页测试 |
| Oracle Cloud Always Free VM | A1 合计相当于 2 OCPU、12 GB；另有两台 1 GB AMD VM；200 GB 磁盘与每月 10 TB 出站 | 没有 Render 类型的自动休眠；长期空闲资源可能被收回 | 当前 Node 服务可以运行；需要维护系统、TLS、域名与进程 | 接受服务器管理和信用卡验证，保持现有 Node 结构 |
| Deno Deploy Free | 每月 100 万请求、20 GiB 出站、10 小时 active CPU、150 GiB-hour；每个实例最多 768 MB | 空闲实例自动停止；活跃 WS 消息可以维持实例；多个实例可能同时运行 | 验证 Deno 的 Node/NPM 兼容；房间需要共享状态与唯一计时调度 | 小规模服务，愿意适配共享状态与 Deno 运行环境 |
| Railway Free | 每月更新 $1 usage credit；每个服务最多 0.5 GB RAM、1 vCPU | 可以开启 Serverless 休眠；当前心跳会影响休眠；免费额度用完服务停止 | Node 服务可以部署；控制每月使用时间 | 短时间、少量联机测试 |

来源：[Cloudflare 价格][cf-pricing]、[DO 价格][cf-do-pricing]、[Render Free][render-free]、[Render 价格][render-pricing]、[Oracle Always Free][oracle-free]、[Deno 价格][deno-pricing]、[Railway 计划][railway-plans]。

## Cloudflare Workers + Durable Objects

- **付款与商业用途**：官方 Workers 页面明确写明免费开始使用且无需信用卡。Free 计划默认提供，商业用途遵守平台条款；条款没有把 Free 限定为非商业应用。[产品页面][cf-product]、[价格][cf-pricing]、[条款][cf-terms]
- **资源与费用边界**：普通 Worker 免费请求最多使用 10 ms CPU；DO 每个请求或 WebSocket 消息默认可以使用 30 秒 CPU，两种限制需要分别处理。免费额度用完，对应操作返回错误，每日 00:00 UTC 更新额度。DO 入站 WebSocket 消息按 20:1 计入请求额度，出站消息和协议级 ping 不产生请求费用。DO 计算、存储额度由账户内各个对象共同使用。[Workers 限制][cf-workers-limits]、[DO 限制][cf-do-limits]、[DO 价格][cf-do-pricing]
- **WebSocket 与状态**：Hibernation 可以保持 WebSocket 连接，同时释放内存。下一次事件重新执行 constructor，需要恢复房间、玩家、比赛和连接身份。`setTimeout` 与 `setInterval` 会阻止 Hibernation，当前计时需要保存事件时间并使用 alarm。[生命周期][cf-lifecycle]、[alarms][cf-alarms]
- **Node 兼容**：Cloudflare 的 `node:http` 不提供当前服务使用的 `upgrade` 事件和底层 socket。需要使用平台 WebSocket API。当前词库内存超过 128 MB，词库索引需要改成紧凑数据或数据库查询；房间对应独立 DO，大厅维护房间列表。[HTTP API][cf-http]、[Workers 限制][cf-workers-limits]
- **地域与地址**：免费提供 `workers.dev` 地址，可以绑定自己的域名。DO 的 `apac`、`apac-ne`、`apac-se` 是地域提示，平台尽力满足；不能保证某个城市或中国大陆节点。`workers.dev` 官方面向个人和 hobby 用途，关键生产用途建议使用自有域名。[域名][cf-domain]、[地域][cf-location]

这个方案需要保留现有的规则判定和消息协议，实现独立的 Cloudflare 服务入口。房间数据持久保存，每次回合记录统一截止时间，alarm 负责超时和电脑动作；WebSocket 自动回复处理连接检测。词库查询在 128 MB 和实际 CPU 限制内验证，所有免费额度需要通过部署后的真实消息量核查。

## Render Free

- **付款与商业用途**：Free 服务可以在没有支付方式的账户运行。Terms 允许商业用途；官方明确免费实例用于测试与个人项目，并提醒不要用于 production applications。免费计划没有生产可靠性保证。[Free 文档][render-free]、[Terms][render-terms]
- **资源与费用边界**：每个免费实例 512 MB RAM、0.1 CPU；workspace 每月共有 750 免费实例小时。Hobby 包含每月 5 GB 出站和 500 分钟构建。没有付款方式时，超出出站额度会暂停服务，构建额度用完会停止新的构建。[Free 文档][render-free]、[价格][render-pricing]
- **休眠与状态**：连续 15 分钟没有入站 HTTP 或 WebSocket 流量后暂停。新请求唤醒通常约一分钟。平台可以重启免费服务，不能附加持久磁盘；当前内存房间会清除。空闲后的连接等待无法通过网页界面消除。[Free 文档][render-free]
- **连接与地域**：支持 WSS，没有固定的 WebSocket 最大连接时间；部署和维护仍会断开连接。可以选择 Singapore、Frankfurt、Oregon、Ohio、Virginia。[WebSocket][render-ws]、[地域][render-regions]
- **项目适配**：现有 `render.yaml` 已指定 Singapore、Node.js 22、Free Web Service、`/health` 与 GitHub Pages Origin。创建公开服务后，将真实地址写入构建变量 `VITE_WS_URL`，发布 `dist/`；玩家无需填写地址。

Render 满足当前代码直接上线和免费网页测试的条件，需要接受空闲后等待与进程重启清除房间的行为。

## Oracle Cloud Always Free

- **付款与商业用途**：开户需要信用卡或具备信用卡功能的借记卡验证，会出现临时授权金额；使用 Always Free 范围内资源无需付费。条款允许 business operations，没有仅非商业用途的限制。[Free FAQ][oracle-faq]、[服务条款][oracle-terms]
- **当前免费规格**：A1 每月 1,500 OCPU-hour、9,000 GB-hour，相当于持续使用 2 OCPU 和 12 GB RAM；AMD `VM.Standard.E2.1.Micro` 可以创建两台，每台 1 GB RAM、1/8 OCPU。账户提供 200 GB boot/block volume 与每月 10 TB 出站。当前官方数字需要按本次核查结果使用。[Always Free][oracle-free]
- **可用性**：免费实例可能遇到 `out of host capacity`。七天内 CPU、网络和 A1 内存使用达到官方空闲条件时，实例可能被收回。账户长期没有使用也可能被暂停，Free 没有 SLA。[Always Free][oracle-free]、[FAQ][oracle-faq]
- **地域与维护**：免费计算资源必须位于账户的 home region，Singapore、Tokyo、Seoul 等区域是否可以注册和创建实例取决于容量。VM 可以运行现有 Node.js 或 Docker 服务，TLS、域名、系统更新与进程管理需要自己维护。新购买的域名费用独立计算。当前程序仍需要增加存储，磁盘本身不会使内存房间自动恢复。[地域][oracle-regions]、[Always Free][oracle-free]

## Deno Deploy Free

- **运行环境**：当前新平台使用标准 Deno、Linux，支持 NPM 和 Node.js 应用、文件系统、网络与 subprocess。当前项目尚未进行 Deno 真实运行测试，因此需要验证 Node 入口、`ws`、文件读取及 TypeScript 启动方式。[运行环境][deno-runtime]、[构建][deno-builds]
- **免费资源**：每月 100 万请求、20 GiB 出站、10 active CPU hours、150 GiB-hour memory；实例最多 768 MB。KV 每月 1 GiB 存储、100 万次读取、50 万次写入。按 768 MB 分配时，150 GiB-hour 相当于所有实例合计约 200 小时，每月持续运行受到额度限制。[价格][deno-pricing]
- **状态与停止**：平台可能同时运行多个实例，内存和本地磁盘互不共享。实例空闲后停止，WebSocket 活跃消息包含 ping/pong 可以维持运行。官方页面对空闲停止时间的描述不同，不能承诺固定时间。大厅、房间唯一性、广播和计时需要共享存储与协调。[运行环境][deno-runtime]、[KV][deno-kv]
- **账户与商业用途**：公开流程支持 GitHub 或 Google 登录，没有展示信用卡步骤；本次未找到明确免信用卡承诺。条款允许 internal business purposes，使用政策包含企业及 e-commerce。免费额度用完后的账户行为需要在开通时确认。[账户][deno-accounts]、[条款][deno-terms]、[使用政策][deno-aup]
- **地域与地址**：新平台 CLI 提供 `us`、`eu` 与 `global` 选择；公开资料当前描述美国和欧洲区域，不能保证亚洲实例。应用提供 `deno.net` 域名和 TLS。[CLI][deno-cli]、[域名][deno-domains]

## Railway Free

- **持续免费范围**：注册试用提供 $5、最多 30 天；之后 Free 每月更新 $1，不累计。Free 最多 0.5 GB RAM、1 vCPU、一个 replica。额度用完需要等待更新或升级，服务不能继续使用本月额度。[计划][railway-plans]、[试用][railway-trial]、[条款][railway-terms]
- **当前项目的资源消耗**：内存价格为每 GB 每月 $10。依据本机约 307 MiB RSS，全天在线仅内存就约 $3 每月，还需要计算 CPU 和出站；这只是资源量级估算，实际账单按平台测量。因此 $1 持续额度适合限制运行时间的测试。[计划][railway-plans]
- **连接与休眠**：支持自动 TLS 与 `railway.app` 地址，WebSocket 没有平台固定的持续时间或空闲时间限制。可以启用 Serverless，在 5 至 10 分钟没有出站流量后停止；现有心跳需要计入判断。唤醒时首个请求可能收到 502。[网络限制][railway-ws]、[Serverless][railway-serverless]
- **付款与商业用途**：可以免信用卡开始试用，试用结束进入 Free；GitHub 自动验证结果可能限制外部网络访问。Terms 允许 personal/business use，官方建议商业应用使用 Pro。Free 与商业使用限制分别判断。[试用][railway-trial]、[FAQ][railway-faq]、[条款][railway-terms]
- **地域**：可选择 Singapore、California、Virginia、Amsterdam。[地域][railway-regions]

## 选择依据

用户确认继续比较全部候选，平台尚未选择。依据当前服务和已经核查的官方条件：

| 判断项目 | Cloudflare | Render | Oracle | Deno Deploy | Railway |
| --- | --- | --- | --- | --- | --- |
| 当前 Node 服务适配 | 需要新的服务入口与词库表示 | 直接运行 | 直接运行 | 兼容性与多实例需要验证 | 直接运行 |
| 免费持续运行条件 | 按每天消息、计算和存储额度 | 每月 750 实例小时，空闲后暂停 | 在 Always Free 额度与实例可用范围内 | 内存时间额度限制全天运行 | 每月 $1 无法覆盖当前服务全天运行 |
| 房间重启后继续保留 | 实现 SQLite 保存与恢复 | 需要额外存储方案 | 实现磁盘保存与恢复 | 实现共享存储与调度 | 需要额外存储方案 |
| 开户条件 | 免费计划无需信用卡 | 可不添加付款方式 | 需要信用卡验证 | 官方未明确承诺免信用卡 | GitHub 验证影响免费权限 |
| 发布者日常管理 | 平台管理运行环境 | 平台管理运行环境 | 需要维护系统、TLS 与进程 | 平台管理运行环境 | 平台管理运行环境 |

房间持久化需要产品读写存储的实现；平台提供磁盘或数据库本身不会恢复当前内存房间。当前服务约 307 MiB RSS 的记录来自本机，云端内存和手机连接速度仍需在实际平台验证。

用户希望网页打开后即可联机，而且准备长期维护游戏。以这个目标选择，我建议 **Cloudflare Workers + SQLite Durable Objects**：可以在免费额度内保存房间，WebSocket Hibernation 可以同时保留连接和控制资源消耗。需要完成服务入口、持久化、调度和词库适配，并在用户实际网络中测量连接时间。

如果当前选择重点是使用已有 Node.js 服务立即进行免费公开测试，**Render Free** 的部署步骤最少。空闲后约一分钟的唤醒和内存房间消失是选择时需要接受的条件。

Oracle 适合愿意管理服务器且能够通过信用卡验证的情况。Deno 提供更多单实例内存，需要处理多实例状态。Railway 适合限制每月使用时间的少量测试。

## 微信小程序

微信正式发布要求提前配置 socket 合法域名，使用 `wss`、有效 TLS 证书和完整信任链；域名需要 ICP 备案，不能使用 IP 或 `localhost`。上述平台的免费子域名不会自动满足备案条件。开发工具跳过域名验证只适用于开发调试。[微信网络官方文档][weixin-network]

网页阶段可以使用平台 WSS 地址；小程序阶段需要结合备案域名和可用的服务区域确定正式服务地址。当前没有从用户实际运营商网络测试这些候选，不能承诺中国大陆连接速度和可达性。选择免费平台也不代表小程序域名及备案条件自动满足。

## 官方来源

[cf-product]: https://www.cloudflare.com/developer-platform/products/workers/
[cf-pricing]: https://developers.cloudflare.com/workers/platform/pricing/
[cf-do-pricing]: https://developers.cloudflare.com/durable-objects/platform/pricing/
[cf-workers-limits]: https://developers.cloudflare.com/workers/platform/limits/
[cf-do-limits]: https://developers.cloudflare.com/durable-objects/platform/limits/
[cf-lifecycle]: https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/
[cf-alarms]: https://developers.cloudflare.com/durable-objects/api/alarms/
[cf-http]: https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/
[cf-domain]: https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
[cf-location]: https://developers.cloudflare.com/durable-objects/reference/data-location/
[cf-terms]: https://www.cloudflare.com/terms/
[render-free]: https://render.com/docs/free
[render-pricing]: https://render.com/pricing
[render-ws]: https://render.com/docs/websocket
[render-regions]: https://render.com/docs/regions
[render-terms]: https://render.com/terms
[oracle-free]: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
[oracle-faq]: https://www.oracle.com/cloud/free/faq/
[oracle-terms]: https://www.oracle.com/contracts/docs/cloud_csa_online_v062223_us_eng.pdf
[oracle-regions]: https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm
[deno-pricing]: https://deno.com/deploy/pricing
[deno-runtime]: https://docs.deno.com/deploy/reference/runtime/
[deno-builds]: https://docs.deno.com/deploy/reference/builds/
[deno-kv]: https://docs.deno.com/deploy/reference/deno_kv/
[deno-accounts]: https://docs.deno.com/deploy/reference/accounts/
[deno-terms]: https://docs.deno.com/deploy/terms_and_conditions/
[deno-aup]: https://docs.deno.com/deploy/acceptable_use_policy/
[deno-cli]: https://docs.deno.com/runtime/reference/cli/deploy/
[deno-domains]: https://docs.deno.com/deploy/reference/domains/
[railway-plans]: https://docs.railway.com/pricing/plans
[railway-trial]: https://docs.railway.com/pricing/free-trial
[railway-faq]: https://docs.railway.com/pricing/faqs
[railway-terms]: https://railway.com/legal/terms
[railway-ws]: https://docs.railway.com/networking/public-networking/specs-and-limits
[railway-serverless]: https://docs.railway.com/deployments/serverless
[railway-regions]: https://docs.railway.com/deployments/regions
[weixin-network]: https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html
