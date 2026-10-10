# 日常词语与电脑选词资料

研究日期：2026-10-11，时区 Asia/Shanghai。

## 用户已经确定的要求

- 游戏保留普通词语和成语，词语具有完整读音。
- 电脑优先使用常见、容易理解的词语，玩家可以提交词库中的其他合法词语。
- 排除「边缘性人格障碍」这类专业词语。
- 数据允许免费商业使用，包含网页与微信小程序。

## 现成词库的核实范围

本次没有核实到同时提供免费商业授权、医学诊断与化学物质等专业词语排除标准、完整筛选记录的现成日常词库。能够直接使用的一手资料提供词语、读音、词频与候选标签；专业词语的收录仍需要由游戏的明确收录文件管理。

免费商业授权与词语质量需要分别核实。公开许可可以确认使用条件；词频能够帮助电脑选择常见答案；某个词语具有较高词频，并不能证明它属于日常词语。

## jieba：适合本项目的常见程度排序资料

jieba 默认词典采用项目的 MIT License，允许免费商业使用。固定版本为 `67fa2e36e72f69d9134b8a1037b83fbb070b9775`，数据文件为 `jieba/dict.txt`，SHA-256 为 `7197c3211ddd98962b036cdf40324d1ea2bfaa12bd028e68faa70111a88e12a8`。原始记录包含词语、整数词频和词性字段；发行相应数据时保留 `Copyright (c) 2013 Sun Junyi` 与 MIT License 全文。[S1][S2][S3]

已有全文件核查确认默认词典共有 349,046 条记录，与当前具有完整 CC-CEDICT 读音的词库有 64,516 个精确交集词语。完整统计与授权核查保存在 [普通词语收录质量研究](word-quality-research-2026-10-11.md)。

本次使用 `csv-parse` 完整读取固定词典，并用 `JSON.parse` 完整读取当前词库和 CC-CEDICT。以下数值是原始字段：[S3][S4]

| 词语 | jieba 词频 | 原始词性 |
| --- | ---: | --- |
| 知识 | 8254 | `v` |
| 老板 | 4402 | `n` |
| 咖啡 | 1400 | `n` |
| 清澈 | 568 | `a` |
| 人工智能 | 151 | `n` |
| 天翻地覆 | 150 | `i` |
| 冰淇淋 | 79 | `nr` |
| 生生不息 | 39 | `l` |
| 打击报复 | 27 | `l` |
| 无往不利 | 14 | `i` |

这些数据可以给电脑的合法候选排序：完整匹配提示、长度、词库范围和未使用条件之后，优先选择词频较高的候选。这个排序过程可以直接配合现有词语级拼音与 THUOCL 成语分类；词频无需改变玩家的有效答案集合。

jieba 的词频用于分词概率，作者提供的 `suggest_freq` 允许调整它。因此这些整数适合作为常见程度参考，不能解释为现代中文的实际使用次数。词性字段同样需要结合词语解释；「冰淇淋」的 `nr` 标签不能作为删除该日常食物名的充分依据。[S1][S5]

## 专业词语的完整记录核查

「边缘性人格障碍」来自 CC-CEDICT 数据，释义为 `borderline personality disorder (BPD)`。该词语未出现在上述固定版本 jieba 默认词典中。游戏明确排除文件保存这条记录；现有字段与释义可以核实其医学诊断含义。[S4]

另外两条记录展示词频筛选的能力范围：[S3][S4]

| 词语 | jieba 词频 | 原始词性 | CC-CEDICT 释义 |
| --- | ---: | --- | --- |
| 精神分裂症 | 44 | `n` | `schizophrenia` |
| 乙酰胆碱 | 51 | `l` | `acetylcholine ACh (amine related to vitamin B complex)` |

只按常用名词标签或词频下限处理，仍会保留上述专业词语。专业词语的排除需要保存明确的词条与依据，保持人工可维护。一般词语与成语的分类继续使用各自来源；某个分词标签不能单独承担专业领域分类。

## wordfreq：具有多种语料的词频参考

wordfreq 可以提供中文常见程度估计，官方 README 列出的中文资料包含 Wikipedia、影视字幕、新闻、书籍、网页、Twitter 与 jieba 七种来源。不同来源中最高和最低的词频会被移除，再对其余来源求平均。数据代表大约截至 2021 年的语言使用，作者已说明词频资料预计不会继续更新。[S6]

`zipf_frequency(word, 'zh')` 使用 Zipf 数值；3 表示每百万个词语约出现一次，6 表示每千个词语约出现一次。`iter_wordlist('zh')` 按词频递减提供词语；`get_frequency_dict('zh')` 提供全部词频。它可以为电脑选词提供跨语料的另一种常见程度参考。[S6][S7]

中文查询需要保留官方字符转换与分词过程。官方实现会将繁简体字符转换为内部形式，并对分词后拼接的表达计算估计值；README 明确提醒这种估计可能高估不常见的词语组合。以它进行游戏排序时，应该只给已经通过游戏收录和完整读音判定的词语计算分数。[S6][S7][S8]

代码采用 Apache-2.0；数据采用 CC BY-SA 4.0。作者的 `NOTICE.md` 明确记录了商业用途可使用的 SUBTLEX 授权，以及必须保留的作者与数据署名。使用时需要保留 Robyn Speer、SUBTLEX 作者、资料来源、CC BY-SA 4.0 与代码许可。官方 README 要求保留库的许可和处理过程，公开派生资料应随完整说明发行。[S6][S9][S10]

当前本项目可以直接使用已完成完整核查的 jieba 词频进行电脑候选排序。wordfreq 为另一份可免费商业使用的词频资料，当前研究没有将其并入产品数据。

## 可直接采用的数据安排

- 词语与完整读音继续采用现有 CC-CEDICT 整理文件，保留 CC BY-SA 4.0 署名和修改说明。
- 成语候选与现有 DF 继续采用已核实的 THUOCL，保留 THUNLP 的 MIT License。
- 电脑选词使用固定版本 jieba 的词频排序，保留原始资料、固定版本、SHA-256、Sun Junyi 署名与 MIT License。
- 需要排除的专业词语保存在 `data/policy.json` 的明确收录规则中，重新生成词库时持续应用。
- 电脑选择范围与玩家提交范围保持独立：电脑优先选择常见候选，玩家继续按照游戏词库与本局提示判定。

用户确认按照日常使用范围收录。构建过程按每条记录的主要释义执行专业领域检查：主要释义全部包含明确专业标签或术语时排除；具有日常含义的记录继续参与其他收录检查。明确保留文件包含日常名称，例如“人工智能、咖啡、冰淇淋、药片、流食、呼吸机”，以及常见的科学或健康用语。当前共 88,177 个词语，7,133 个成语。来源未标记的专业词语仍需人工检查。

明确排除文件同时保存已核查但没有领域标签的专业名称。固定 CC-CEDICT 原始记录中，“氰化钾”的释义为 `potassium cyanide KCN`；“乙二醇”为 `glycol` 与 `ethylene glycol C2H4(OH)2 (antifreeze)`；“胰腺炎”为 `pancreatitis`；“躁郁症”为 `bipolar disorder`。这些记录按照用户确定的收录范围排除。日常名称按完整释义核查，“药片”对应 `a (medicine) pill or tablet`，“流食”对应 `(medicine) liquid food`，领域标签与日常名称可以同时存在，收录文件保留这些日常名称。[S4]

## 核查方法与来源

本次新增核查脚本保存于 `.research/everyday-words-2026-10-11/audit.mjs`；执行 `node .research/everyday-words-2026-10-11/audit.mjs` 可以重新读取原始数据并核查上述例词。下载资料保存在同一目录。官方 README、许可、NOTICE 与引用的词频处理代码均已全文读取。

- [S1：jieba 固定版本 README](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/README.md)。
- [S2：jieba 固定版本 MIT License](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/LICENSE)。
- [S3：jieba 固定版本完整默认词典](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/jieba/dict.txt)。
- S4：本地固定数据 `node_modules/cedict-json/cedict.json`，版本 `cedict-json@1.3.20251213`；当前词库 `data/dictionary.json`。
- [S5：jieba 固定版本词频使用代码](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/jieba/__init__.py)。
- [S6：wordfreq 固定版本 README](https://raw.githubusercontent.com/rspeer/wordfreq/912caf64b657478d1dff1138efdc078947d54bb1/README.md)。
- [S7：wordfreq 固定版本词频处理代码](https://raw.githubusercontent.com/rspeer/wordfreq/912caf64b657478d1dff1138efdc078947d54bb1/wordfreq/__init__.py)。
- [S8：wordfreq 固定版本中文处理代码](https://raw.githubusercontent.com/rspeer/wordfreq/912caf64b657478d1dff1138efdc078947d54bb1/wordfreq/chinese.py)。
- [S9：wordfreq 固定版本 NOTICE](https://raw.githubusercontent.com/rspeer/wordfreq/912caf64b657478d1dff1138efdc078947d54bb1/NOTICE.md)。
- [S10：wordfreq 固定版本 LICENSE](https://raw.githubusercontent.com/rspeer/wordfreq/912caf64b657478d1dff1138efdc078947d54bb1/LICENSE.txt)。
