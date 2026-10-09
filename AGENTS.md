# 项目要求

## 用户要求

开始处理本项目的任务前，完整阅读 `docs/conversation.md` 中「用户消息 1」里的 `<INSTRUCTIONS>` 内容，并遵守其中的全部要求。用户在消息中提到 `AGENTS.md` 时，重新完整阅读本文件。

## 聊天记录

- 将本项目的双方聊天记录持续保存到 `docs/conversation.md`，按消息出现的顺序追加。
- 每条用户消息保存完整原文，包括标点、换行、代码、链接和提供的 skill 内容。保留原文，不使用摘要代替原文。
- 保存 assistant 的公开回复、进度更新和向用户提出的问题；工具调用、工具返回内容和内部推理无需记录。
- 为每条消息标记发送者和顺序；日期与时间使用 `Asia/Shanghai`。只在可以确认时间时记录具体时间。
- 回复用户前，将本次收到的消息和已经发送的公开内容写入记录，并将准备发送的最终回复写入记录。后续回复变化时同步修改尚未发送的对应内容。
- 用户补充或修改设计要求时，保存新的消息原文，并更新 `docs/project-discussion.md` 中的当前决定。用户编辑过的现有文件内容是后续编辑的依据。

## 项目资料

- 讨论 BombParty 规则时，阅读 `docs/bombparty-rules.md`；每项规则保留来源和核实状态。
- 讨论「击鼓传字」的玩法、平台或界面时，阅读 `docs/project-discussion.md`；明确区分用户已经确定的内容、待讨论的建议和待回答的问题。
- BombParty 的公开规则研究结果保存在 `docs/bombparty-rules.md`；引用规则时保留来源和核实状态，不把未核实的服务器行为写成确定规则。
- 中文词语、拼音和部首数据的来源研究保存在 `docs/chinese-word-sources.md`；使用外部数据前阅读来源和许可证记录。
- 使用或讨论 `THUOCL_chengyu.txt` 时，完整阅读 `docs/thuocl-audit.md`；随 THUOCL 数据保留 `licenses/THUOCL.txt` 中的版权声明和许可文本。
- 发布网页或联机服务时，阅读 `docs/deployment.md`；GitHub Pages 静态网页连接独立 WSS 服务。词库维护与授权以 `data/README.md` 和 `data/sources.json` 为依据。
- 产生中间文件时，使用本目录中被 `.gitignore` 忽略的 `.scratch/` 或 `.research/`。

## Agent skills

- 工程流程使用本地任务记录，配置见 `docs/agents/issue-tracker.md`。
- 任务状态见 `docs/agents/triage-labels.md`。
- 领域资料读取规则见 `docs/agents/domain.md`；开发规格见 `docs/spec.md`。
