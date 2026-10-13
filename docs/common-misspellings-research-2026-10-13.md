# 易误写词语提醒

日期：2026-10-13，Asia/Shanghai。

## 维护规则

只收录用户亲自发现并明确要求添加、输入法未识别的易误写表达。当前收录“不可置否→不置可否”。用户后续提供词语时，按其指定对应关系更新 `data/common-mistakes.json`。

每项只保存 `incorrect` 和 `correct`。文件保留版本与 CC0 1.0 许可信息，网页、Node 服务和 Cloudflare 共用。

```json
{
  "version": "2026-10-13",
  "license": "CC0-1.0",
  "entries": [
    {"incorrect": "不可置否", "correct": "不置可否"}
  ]
}
```

## 提醒行为

已确认输入与 `incorrect` 完全相同时，答案格下方显示“这个词应写作「不置可否」”。编辑内容后重新判断，输入法组合期间继续使用已经确认的汉字。草稿和提交拒绝对应表达，提交时减少一秒；修改后的答案遵守当前题目、词库、长度和重复限制。

资料按 CC0 1.0 发布，完整许可位于 `licenses/CC0-1.0.txt`。提醒文案由 `shared/word-corrections.ts` 生成。
