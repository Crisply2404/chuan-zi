# 验证记录

日期：2026-10-09（Asia/Shanghai）。

- `npm run data:build` 通过，使用项目内保存的固定原始资料。
- `npm test` 通过：15 项规则测试、13 项真实 WebSocket 测试，包含规则预设、公开词语编号的读音唯一、中文与拼音加入、隐藏房间和房间内电脑玩家回合。
- `npm run test:browser` 通过：6 项真实 Chrome 浏览器流程，覆盖电脑与手机、中文输入法、规则设置、规则模式、JSON 导出、公开拼音地址、房间内电脑对战、房间名称修改、隐藏房间、中文与拼音加入、密码、聊天、身份恢复、独立窗口、复制窗口、词库提示耗尽结果和公开许可页。
- `npm run check` 和 `npm run build` 通过；`npm audit --audit-level=moderate` 返回 0 个漏洞。
- `npm audit --audit-level=moderate` 未报告漏洞。
- 生产网页通过 `/chuan-zi/` 子目录访问；320、390、1440 像素宽度检查未发现横向溢出。
- 本地网页与服务端已经运行，网页为 `http://localhost:5173/`，联机服务为 `ws://localhost:8787`；服务健康检查正常。

浏览器验证使用 DOM、控件状态、布局尺寸和真实 WebSocket 消息。词库使用自动标签筛选，全部词条尚未经人工语言审核。公开 GitHub Pages 与 WSS 服务尚未发布。
