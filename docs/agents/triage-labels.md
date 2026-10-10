# 任务状态

任务状态使用 `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。本地开发记录另使用 `in-progress` 和 `resolved` 表示执行过程。

任务完成后记录真实规则、联机、浏览器和构建验证结果。发布前部署独立 WSS 服务，使用 `VITE_WS_URL` 构建 GitHub Pages 网页。
