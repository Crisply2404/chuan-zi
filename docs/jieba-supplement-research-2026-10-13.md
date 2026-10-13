# jieba 补充词库研究

日期：2026-10-13，Asia/Shanghai。使用 Skill：research。

## 收录建议

建议把 jieba 默认词典纳入补充候选来源。经过独立词语审核、普通词语范围审核和完整读音核查的条目，可以补充当前 CC-CEDICT 的覆盖。最终有效答案保存为可以直接维护、重新构建后持续生效的补充词语文件，并逐项记录词形来源、完整读音来源和审核依据。

全量直接并入与“普通词语＋成语，排除口语组合与专业名称”的既定要求不符。jieba 的分词词典缺少释义和拼音字段，词性标签与词频也不能完成这些审核。本轮建议属于资料研究，补充词语来源和审核规则尚待用户决定；产品词库保持当前内容。[S1][S3][S7][S8][S10]

## 当前接入情况

项目已经保存固定版本 jieba 默认词典、MIT License 和来源摘要。`scripts/build-data.ts` 读取 `data/sources/jieba-dict.txt`，为通过现有 CC-CEDICT 收录检查的条目添加 `frequency`，并在 `source` 中添加 `jieba` 来源标记。`shared/rules.ts` 的 `cpuAnswer` 在合法候选中按这个词频排序。构建循环的词形与读音均来自 CC-CEDICT，jieba 当前承担常见程度参考。[S8]

当前生成词库包含 89,431 个词语，其中 65,346 个与 jieba 默认词典精确相交；24,085 个当前有效词语没有 jieba 记录。原始 CC-CEDICT 使用 `2026-10-12T08:13:53Z` 快照。本轮全文件统计采用当前项目文件，结果保存在 `.research/jieba-supplement-2026-10-13/audit.json`。[S7][S8]

## 官方资料与覆盖范围

核查版本为 `67fa2e36e72f69d9134b8a1037b83fbb070b9775`。本轮 GitHub API 返回的官方 `master` 同为这个版本，提交时间为 `2020-02-15T08:33:35Z`。本次官方原始文件与项目保存文件的 SHA-256 均为 `7197c3211ddd98962b036cdf40324d1ea2bfaa12bd028e68faa70111a88e12a8`。[S3][S6][S7]

默认词典完整文件为 5,071,852 bytes，包含 349,046 条记录、349,045 个唯一词形。每条记录提供词语、整数词频和词性；二至九个汉字的唯一词形共有 337,081 个。该范围仅检查 Unicode Han 字符与长度，尚未审核简体词形、普通词语身份、专名或专业领域。[S1][S3][S7]

与当前有效答案比较，jieba 有 271,735 个未收录候选。其中 13,576 个在原始 CC-CEDICT 中存在同形记录，258,159 个在原始 CC-CEDICT 中没有同形记录。前一部分需要查明现有规则未收录的原因，后一部分需要取得额外的词语级完整读音。271,735 表示候选差集数量，最终符合游戏规则的新增数量仍需审核。[S7][S8]

词频下限可以调整审核队列的数量。本轮统计中，下限为 5 时有 75,964 个当前未收录候选，下限为 10 时有 49,776 个，下限为 50 时有 15,784 个，下限为 100 时有 9,207 个。“寻路”的词频为 9；提高下限会直接影响这个用户已关注的词语。上述下限均为研究统计，用户尚未确定相关收录条件。[S7]

## “寻路”的补充价值

固定 jieba 默认词典存在记录 `寻路 9 v`；当前原始 CC-CEDICT 和生成词库均没有“寻路”。因此 jieba 能够提供这个词形作为补充候选。[S3][S7]

jieba 记录没有“寻路”的普通话读音、释义、专业领域标签或独立词语审核依据。允许它成为正式答案，需要同时保存可信的完整读音与符合本项目收录范围的依据。当前 `WordRules` 要求每个 `WordEntry` 至少包含一套完整 `Reading`，且 `syllables`、`initials`、`finals`、`tones` 的数量分别与汉字数量一致。[S7][S8]

## 词语质量的核实边界

jieba 官方 README 将默认词典用于 DAG 和基于词频的分词路径选择，并允许通过 `add_word`、`del_word` 和 `suggest_freq` 改变分词结果。`gen_pfdict` 和 `calc` 的实现同样使用词频计算分词概率。因此词频适合用于排序参考，不能直接代表当前中文使用次数、语言规范等级或游戏收录资格。[S1][S4]

官方 README 以 `今天天气 3 i` 对应的表达说明如何调整或删除分词记录；作者 `fxsjy` 在官方 issue 的 2013-04-26 评论中说明，默认词典包含不符合正常词语标准的记录。这些是官方说明与当前固定资料中可核查的质量边界。[S1][S3][S5][S7]

当前未收录候选中，104,901 个使用 `nr`、`nrfg`、`nrt`、`ns`、`nt` 或 `nz` 标签。这些标签可以提示审核方向，但不能单独判定游戏资格。原始词典中“冰淇淋”的标签为 `nr`，“知识”的标签为 `v`；当前 CC-CEDICT 释义分别为 `ice cream` 与 `knowledge`，两者已经进入游戏词库。[S7]

普通名词标签与一定词频同样不足以排除专业名称。原始记录“精神分裂症”具有词频 44、标签 `n`，“乙酰胆碱”具有词频 51、标签 `l`；两者的 CC-CEDICT 释义对应医学与化学名称，当前产品词库已经依照收录规则排除。因此补充条目应继续遵守现有明确排除设置，并保存可核查的词义依据。[S7][S8]

补充候选还涉及 1,447 个当前 `dictionary.characters` 没有记录的汉字。这个数量来自全部候选差集，正式新增条目涉及的数量需按最终审核集合计算。词语扩充必须重新生成所用汉字资料，并检查提示生成、部首与字形部件匹配需要的真实笔画映射。[S7][S8]

## 许可条件

jieba 官方 README、`setup.py` 与完整 LICENSE 均声明 MIT License；`setup.py` 将默认词典随软件包发布。MIT 允许免费使用、复制、修改、发布、分发及销售，因此公开授权允许网页游戏和微信小程序商业使用。相应资料发行时需要保留 `Copyright (c) 2013 Sun Junyi` 与 MIT License 全文；项目已保存于 `licenses/Jieba.txt`。[S1][S2][S9]

本轮核查确认了官方公开许可与发行范围。默认词典没有逐条提供最初语料来源、词语释义引证或人工审核记录；上述许可核查范围限定于官方提供的项目资料。[S1][S2][S3][S9]

补充词语若配合其他拼音或释义数据，新增来源需要独立核查许可、版本、署名和修改说明。当前 CC-CEDICT 派生的词语与拼音部分继续遵循项目现有 CC BY-SA 4.0 说明；jieba 原始词典与词频继续保留 MIT 来源说明。[S8]

## 实现要求

补充接入需要建立明确的有效词语文件。每项提供 `word`、允许的完整读音、普通词语或成语身份、来源和审核依据；构建过程读取该文件，合并词形与完整读音，并继续应用 `excludedWords`。确认采用的条目缺少读音、字段数量不一致或来源摘要无效时，构建立即抛出错误。[S8]

jieba 的 `i` 标签不能直接生成游戏的 `idiom` 分类，分类需记录独立依据。新增多音词按同一套完整读音参与全部拼音条件，原始声调及轻声继续沿用现有规则。生成、草稿、提交与电脑答案读取相同的最终集合。[S1][S7][S8][S10]

本轮没有确定新的词语级拼音来源。单个汉字的默认读音无法确认词语中的多音字与轻声，正式补充资料需要完成词语级读音核查。全部补充词形不能仅依靠当前 CC-CEDICT 精确相交，因为 258,159 个候选在该原始来源中没有记录。[S7][S8][S10]

完成接入后，需要针对真实收录数据验证新增词语、明确排除项、多音词完整读音、成语分类、部首与字形部件提示、电脑选词排序，以及 Node 与 Cloudflare 使用同一份生成资料。词库规模变化也需要重新测量数据文件大小、运行内存和条件候选查询时间。[S8]

## 核查记录与来源

官方 README、LICENSE、`setup.py`、分词实现、词性字段读取实现已全文读取；官方 issue 正文与全部 54 条评论已经完整获取与读取。默认词典使用项目已有 `csv-parse` 完整读取，项目与 CC-CEDICT JSON 使用 `JSON.parse` 完整读取。研究资料、统计脚本与结果保存在被 `.gitignore` 忽略的 `.research/jieba-supplement-2026-10-13/`。执行 `node .research/jieba-supplement-2026-10-13/audit.mjs` 可以重新核查本文统计。[S7]

- [S1：jieba 固定版本 README](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/README.md)。
- [S2：jieba 固定版本完整 MIT License](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/LICENSE)。
- [S3：jieba 固定版本默认词典](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/jieba/dict.txt)。
- [S4：jieba 固定版本分词与词频实现](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/jieba/__init__.py)。
- [S5：jieba 官方 issue 的全部评论](https://api.github.com/repos/fxsjy/jieba/issues/7/comments?per_page=100)。
- [S6：jieba 官方 master 提交资料](https://api.github.com/repos/fxsjy/jieba/commits/master)，本轮获取结果保存在 `.research/jieba-supplement-2026-10-13/commit.json`。
- S7：本轮全文件统计 `.research/jieba-supplement-2026-10-13/audit.json`；原始资料为 `data/sources/jieba-dict.txt`、`data/sources/cc-cedict-2026-10-12.json` 与 `data/dictionary.json`。
- S8：项目当前实现与许可记录：`scripts/build-data.ts`、`shared/rules.ts`、`shared/types.ts`、`data/policy.json`、`data/README.md`、`data/sources.json` 与 `licenses/Jieba.txt`。
- [S9：jieba 固定版本安装包定义](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/setup.py)。
- S10：项目当前要求：`docs/project-discussion.md`、`docs/spec.md` 与 `docs/word-admission-2026-10-12.md`。
