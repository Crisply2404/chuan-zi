# 网页与联机服务部署

## GitHub Pages

Vite 使用相对资源路径。将 `dist/` 的全部内容放到现有 GitHub Pages 仓库的 `chuan-zi/` 目录，可以从该子目录访问游戏。房间分享链接使用 `?room=<opaque-token>` 查询参数，直接打开分享地址可以加载静态入口。

先为联机服务准备公开的 HTTPS/WSS 地址，在本地使用该地址生成网页：

```sh
VITE_WS_URL=wss://game.example.com npm run build
```

构建输出位于 `dist/`。把输出内容发布到 GitHub Pages 的对应目录。网页根据构建时的 `VITE_WS_URL` 自动连接 WSS 地址；本地开发网页使用同源 `/ws`，Vite 将它代理到电脑上的 `127.0.0.1:8787`。

GitHub Pages 提供静态文件，持续运行的房间、共享计时和 WebSocket 连接由独立 Node.js 服务处理。HTTPS 网页连接 WSS 服务；`localhost` 开发页面可以连接本地 WS 服务。

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

本项目提供网页构建与可运行的服务端。公开 WSS 地址尚未配置；GitHub Pages 上的联机需要填写已经部署的服务地址。
