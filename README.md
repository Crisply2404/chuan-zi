# 击鼓传字

中文多人词语游戏，支持电脑与手机浏览器。声母、韵母、声调、部首、字形部件和连续汉字条件可以组合。

## 本地运行

要求 Node.js 22 与 npm。安装后在两个终端分别启动联机服务和网页：

```sh
npm ci
npm run server
```

```sh
npm run dev
```

网页地址为 `http://localhost:5173/`。开发网页使用同源 `/ws` 路径，由 Vite 代理到本机 `127.0.0.1:8787`；手机访问电脑网页时会沿用同一个网页地址。生产构建通过 `VITE_WS_URL` 设置 `wss` 联机地址。

```sh
npm run check
npm test
npm run build
npm run test:browser
```

## 发布

网页使用 GitHub Pages，联机服务独立运行。发布操作见 [部署说明](docs/deployment.md)。

## 数据与规则

词库文件可以直接编辑。来源、许可和重新生成方法见 [数据说明](data/README.md)。[开发规格](docs/spec.md) 记录当前规则，[BombParty 研究](docs/bombparty-rules.md) 保留官方资料及核实范围，[聊天记录](docs/conversation.md) 保存讨论原文。
