# 网页与联机服务部署

## GitHub Pages

Vite 使用相对资源路径。将 `dist/` 的全部内容放到现有 GitHub Pages 仓库的 `chuan-zi/` 目录，可以从该子目录访问游戏。房间分享链接使用词语拼音查询参数，例如 `?room=chou-si-bo-jian`，直接打开分享地址可以加载静态入口。连续拼音同样可以加入，网页进入后将地址规范化为带连字符的拼音。

先为联机服务准备公开的 HTTPS/WSS 地址，在本地使用该地址生成网页：

```sh
VITE_WS_URL=wss://game.example.com npm run build
```

构建输出位于 `dist/`。把输出内容发布到 GitHub Pages 的对应目录。网页根据构建时的 `VITE_WS_URL` 自动连接 WSS 地址；本地开发网页使用同源 `/ws`，Vite 将它代理到电脑上的 `127.0.0.1:8787`。

GitHub Pages 提供静态文件，持续运行的房间、回合计时和 WebSocket 连接由独立 Node.js 服务处理。HTTPS 网页连接 WSS 服务；`localhost` 开发页面可以连接本地 WS 服务。

## 联机服务

服务器要求 Node.js 22。部署项目的 `package.json`、`package-lock.json`、`server/`、`shared/`、`data/` 与 `licenses/`，运行：

```sh
npm ci
PORT=8787 HOST=0.0.0.0 ALLOWED_ORIGINS=https://crisply2404.github.io npm run server
```

`ALLOWED_ORIGINS` 使用逗号分隔多个网页来源，来源包含协议与域名。项目子目录属于同一个来源。生产服务需要加入 GitHub Pages 来源；本地开发服务通过 Vite 代理把 WebSocket 来源统一为本地开发来源，因此手机使用局域网或 tailnet 地址访问网页时无需修改来源列表。直接访问服务端端口进行调试时，才需要把对应网页来源加入 `ALLOWED_ORIGINS`。

`/health` 提供 JSON 健康检查。部署平台需要允许 WebSocket upgrade 并提供 HTTPS。使用自有服务器时，`deploy/Caddyfile` 可以配置证书与反向代理，`GAME_HOST` 设置为自己的服务域名。

Docker 部署：

```sh
docker build -t chuan-zi .
docker run --name chuan-zi -p 8787:8787 -e ALLOWED_ORIGINS=https://crisply2404.github.io chuan-zi
```

部署服务需要保持运行；平台暂停实例后，内存中的房间会消失。当前大厅与比赛状态保存在单个服务进程的内存中，同一大厅由同一个服务实例维护。进程重新启动后，玩家重新进入大厅。

## 微信小程序

小程序可以使用 `wx.connectSocket` 连接同一服务，按照 `shared/types.ts` 中的 JSON 请求与状态消息操作。未来提供小程序页面时，需要在微信后台配置 socket 合法域名，并使用 HTTPS/WSS 证书。当前网页的 React 页面由浏览器运行。

服务端 Origin 允许列表需要包含小程序实际发送的 Origin。

## 发布状态

main 的每次更新触发私有仓库的 `.github/workflows/publish-personal-site.yml`。类型、规则与真实联机测试以及发布产物检查通过后，workflow 使用 `PERSONAL_SITE_TOKEN` 调用个人网站已有的 `deploy.yml`，将本次 commit 作为 `chuan_zi_ref`。个人网站在 GitHub Actions 中读取私有项目并构建，仅将 dist 复制到网页的 chuan-zi 子目录。CHUAN_ZI_REF 设置为 main，个人网站常规发布同样读取当前主分支。

`scripts/check-pages-artifact.ts` 在每次构建结束时检查全部产物与字形 ZIP，允许网页 JS/CSS、音频、字形资料与许可文本。项目源目录、TypeScript、source map、配置与文档均禁止进入产物。字形资料下载包保存完整原始 JSON Lines、可编辑的派生 JSON 和完整许可。

2026-10-13：Cloudflare 免费服务已发布。健康地址为 `https://chuan-zi-online.tcoinsm.workers.dev/health`，WebSocket 地址为 `wss://chuan-zi-online.tcoinsm.workers.dev/ws`。`npm run build:pages` 生成自动连接这个服务的 `dist/`；普通 `npm run build` 继续供本地 `/ws` 验证使用。大陆访问条件见 [本轮托管研究](multiplayer-hosting-research-2026-10-13.md)。

公开 `/health` 与真实双人 WebSocket 已通过创建、密码加入、草稿同步、答案提交、回合传递和身份重连验证。Cloudflare 部署版本为 `d55e5ea0-7d5b-438e-8eb8-4a07f6a8b063`，使用 2026-10-12 CC-CEDICT 快照，完整词库 89,431 条；逐格规则、电脑额外席位、个人随机奖励、默认奖励韵母与两秒自动提交已通过公网验证。本机网络验证已经完成，中国大陆多运营商网络测量尚未完成。

自动发布验证：私有仓库 run 38407455127 的 65 项测试、类型检查与产物检查成功；个人网站 run 38407931232 的构建与 Pages 部署成功，发布代码版本为 802ee28。公开网页资源与本机最新构建一致，创建、分享加入、准备、默认五个奖励韵母通过；公开字形 ZIP 仅包含原始数据、修改 JSON 与许可。

2026-10-14：Cloudflare 版本 d2dd3088-90b9-4b5a-b01c-575bff35ed6b；main 95ec830 触发私有仓库 run 38435856553，68 项规则与联机测试及发布检查成功。个人网站 run 38436254370 部署成功，公开网页最新资源、分享联机、两个词库入口和成语部首提示均通过。

2026-10-14：统一楷体与万象补充使用 Cloudflare 版本 c160f3c8-6e2d-4fe2-9b35-f7d1b64b6dcf，健康检查返回 89,098 个词语；公网密码加入、个人奖励、草稿同步、自动提交、回合交接与身份重连通过。本轮 71 项规则与联机测试、50 项浏览器测试通过。main f82accc 触发私有仓库 run 38457380528，全部检查通过并触发个人网站 run 38457929256。Pages 产物共 5,781 个文件，字体只发布一份，字形 ZIP 保存完整原始资料、修改数据及许可，包含原名 ARPHICPL.TXT。

## 托管配置

用户选择 Cloudflare 免费联机服务。网页通过构建时的 `VITE_WS_URL` 自动连接，玩家无需填写服务地址。部署参数、免费条件和中国大陆网络研究见 [本轮联机研究](multiplayer-hosting-research-2026-10-13.md)。

Cloudflare Workers 与 SQLite Durable Objects 提供持久化房间，WebSocket Hibernation 保留连接，alarm 处理回合与电脑动作；词库索引适应 Workers 的 128 MB 内存。五项候选的研究仍保存在 [免费托管研究](multiplayer-hosting-options-2026-10-12.md)。

`render.yaml` 提供免费 Web Service 的 Blueprint 配置。用户登录 Render 后连接保存服务源码的仓库并创建 Blueprint，平台读取该文件部署；等待 `/health` 返回 `ok: true` 后，使用公开服务地址生成网页，例如 `VITE_WS_URL=wss://chuan-zi-server.onrender.com npm run build`。实际子域名以 Render 为准。

发布到个人网站时，只更新 `chuan-zi/` 目录中的构建产物。公开页面所需的服务地址由发布者配置，账户凭据保留在发布环境。
