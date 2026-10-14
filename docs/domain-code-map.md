# 领域术语与代码位置

领域定义见 `GLOSSARY.md`，当前决定见 `project-discussion.md`，验证要求见 `spec.md`。

| 领域内容 | 代码与资料 | 验证 |
| --- | --- | --- |
| 房间、身份、大厅、准备、比赛结果 | `server/game-core.ts`、`server/game-server.ts`、`shared/types.ts`；Cloudflare 房间存储见 `cloudflare/worker.ts` | `tests/server.test.ts`、`tests/cloudflare.test.ts` |
| 提示片段、逐格条件、匹配窗口、完整读音 | `shared/rules.ts`、`shared/prompt-slots.ts`、`shared/pinyin.ts` | `tests/rules.test.ts`、`tests/idiom-prompts.test.ts` |
| 预设模式、词库范围、成语提示分布 | `shared/presets.ts`、`shared/idiom-prompts.ts` | `tests/idiom-prompts.test.ts`、`tests/browser/game.spec.ts` |
| 奖励类型、候选、目标、进度 | `shared/bonuses.ts`、`shared/bonus-candidates.ts`、`server/game-core.ts` | `tests/bonuses.test.ts`、`tests/server.test.ts` |
| 已确认草稿、组合输入、自动提交 | `src/App.tsx`、`server/game-core.ts`；协议见 `shared/types.ts` | `tests/browser/game.spec.ts`、`tests/server.test.ts` |
| 提示格、答案格、结合态、分开动画、头像答案 | `src/PromptView.tsx`、`src/App.tsx`、`src/styles.css` | `tests/browser/prompt.spec.ts`、`tests/browser/game.spec.ts` |
| 统一字形、提示笔画、补全笔画 | `scripts/prepare-glyph-font.ts`、`scripts/prepare-glyphs.ts`、`src/PromptView.tsx` | `tests/glyph-font.test.ts`、`tests/browser/prompt.spec.ts` |
| 词库、补充词条、成语分类 | `scripts/build-data.ts`、`data/README.md`、`data/wanxiang-supplement.json`、`data/sources.json` | `tests/rules.test.ts`、`tests/glyph-font.test.ts` |
| 易误写提醒 | `data/common-mistakes.json`、`shared/rules.ts`、`src/App.tsx` | `tests/rules.test.ts`、`tests/browser/game.spec.ts` |
| 发布产物 | `scripts/check-pages-artifact.ts`、`docs/deployment.md` | `npm run build:pages`、`npm run check:pages` |
| 玩法教学、电脑尝试 | `shared/tutorial.ts`、`shared/cpu-play.ts`、`server/game-core.ts`、`src/TutorialGuide.tsx` | `tests/cpu-play.test.ts`、`tests/browser/tutorial.spec.ts`、`tests/cloudflare.test.ts` |

更新领域含义时，同步修改术语与当前规格。维护数据时，完整阅读来源、许可和收录要求；生成、草稿、提交与电脑答案共同使用 `data/dictionary.json`。
