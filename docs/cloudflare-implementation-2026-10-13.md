# Cloudflare 联机实现记录

日期：2026-10-13，Asia/Shanghai。

Worker 入口位于 `cloudflare/worker.ts`，使用单个 `GameHub` SQLite Durable Object 管理大厅和全部房间。`/health` 返回服务状态，`/ws` 检查 WebSocket Upgrade 与 `ALLOWED_ORIGINS`，网页继续使用既有 JSON 消息格式。连接使用 `acceptWebSocket()` 和 hibernation 回调；玩家身份使用 WebSocket attachment 恢复。

房间、玩家身份、比赛状态、草稿、聊天、答案历史和事件表全部写入 Durable Object SQLite。事件包含回合截止、电脑逐字输入、重连身份期限与大厅隐藏时间，Durable Object 只设置最早事件的 `alarm`。事件执行前检查时间和当前提示，重复 alarm 不会重复推进比赛。

`server/game-core.ts` 是 Node 入口和 Worker 入口共用的比赛核心，保留现有 `Request` 与 `ServerMessage` 协议。Node `server/game-server.ts` 继续使用 `ws` 和进程计时器作为宿主适配；Cloudflare 宿主使用 Hibernation WebSocket 与 SQLite。核心不读取文件、不创建 Node socket，规则实例由宿主提供。

词库构建脚本 `scripts/prepare-cloudflare.ts` 将当前 89,431 条完整真实词语压缩为共享音节表、读音序列、来源表和紧凑词语元组。构建结果：原始 `data/dictionary.json` 19,056,875 bytes，紧凑 JSON 5,249,733 bytes，gzip 1,450,901 bytes。`WordRules` 的条件索引使用 `Uint32Array` 序号和二分查询。

## 本地验证

使用 `npm run test:cloudflare` 通过七项真实 workerd/Miniflare 测试：健康检查与 Origin 拒绝、大厅密码和 Hibernation 后身份恢复、真实词库草稿截止自动提交、alarm 电脑逐字输入、15 分钟隐藏与重连期限、身份切换连接后的 Hibernation 授权、runtime 重启后的 SQLite 房间恢复。测试使用 `.scratch/cloudflare/` 持久目录和当前 `data/dictionary.json`。

`npm test` 通过全部 50 项，包含规则、Node WebSocket 与七项 Cloudflare 真实 workerd 检查。完整浏览器流程通过 31 项。

`npm run check` 通过，包括普通 Node TypeScript 与 Cloudflare Worker TypeScript。`npx wrangler deploy --dry-run --outdir .scratch/cloudflare-upload-final` 通过，确认 `GAME_HUB` SQLite Durable Object、`ALLOWED_ORIGINS` 与紧凑词库附加资源均进入构建。发布 bundle 独立存放在 `.scratch/cloudflare/bundle/`，验证输出与 SQLite 目录位于其它位置。

Miniflare workerd Inspector 在完成词库加载、创建房间和真实提示预览后读取到 `usedSize=71,780,848`、`backingStorageSize=16,108,951`，两者合计 87,889,799 bytes（约 83.8 MiB），低于 128 MiB Worker 内存限制。本机首次词库加载记录为 2,228 ms；昵称、创建房间和提示预览的总耗时为 213.7 ms，Profiler 采样 CPU 为 60,455 microseconds。这些数字属于本机 workerd 测量，Cloudflare 生产 CPU 尚未测量。内存报告覆盖本机单个房间流程；房间数量、玩家数量、聊天与答案历史增长仍会增加使用量，当前没有完成大规模压力测量。

测量脚本位于 `scripts/measure-cloudflare.ts`，可以在重新构建后运行并生成 `.scratch/cloudflare/memory-report.json`。

## 公开服务

用户已经完成 Wrangler 登录授权。服务于 2026-10-13 发布到 `https://chuan-zi-online.tcoinsm.workers.dev`，当前版本为 `e9e685c1-bc81-4e5b-8297-bda199ff17f3`。公开 `/health` 返回正常，完整词库为 89,431 条。部首提示要求笔画数量严格小于完整汉字数量，生成、草稿与提交共用此规则。易误写词形只按用户明确提供的表达添加，当前为不可置否→不置可否，草稿和提交均拒绝对应表达。

公网 WSS 地址为 `wss://chuan-zi-online.tcoinsm.workers.dev/ws`。真实两个 WebSocket 连接验证了创建隐藏房间、密码加入、草稿同步、答案提交、下一回合与身份重连；确认只有一条答案历史。验证启用 TLS 证书检查。本机完成这些步骤总耗时约 31.5 秒，这个数字包含多次请求与重连，中国大陆运营商网络质量仍需测量。

`npm run build:pages` 生成自动连接公开 WSS 的静态网页。两个真实 Chrome 会话加载本地产物、创建房间并通过分享链接加入成功。个人网站的现有文件未修改。
