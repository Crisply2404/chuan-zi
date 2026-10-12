# 现成中文游戏词库核查

日期：2026-10-12，Asia/Shanghai。

## 用户要求

- 查找已经适合中文词语游戏使用的现成词库，包含独立普通词语与成语。
- 收录范围排除口语组合和需要专业知识的医学诊断、化学物质等名称。
- 用户指定排除“到家”“亲亲”，保留“人工智能、咖啡、冰淇淋”等日常名称。
- 数据免费且允许商业使用，包括网页和微信小程序；来源、使用条件与文件内容需要核查。

## 已核查的游戏成语名单

`AllanChain/chinese-wordle` 提供 `data/reviewed.txt`，包含 **1,421 个唯一的四个汉字成语候选**。维护者说明，游戏答案主要来自 THUOCL，经人工筛选，去掉了一部分不适合猜的成语；处理代码进一步说明名单前段从 THUOCL 高频成语筛选，后段结合高考成语选取。全文名单与项目保存的 THUOCL 精确交集为 1,421 个，全部具有 THUOCL 来源。[S1][S2][S3]

这是已经有人为成语游戏整理的现成名单。它只提供成语名称，适合用作成语模式的收录范围。名单没有普通词语，无法覆盖默认普通词语与成语的全部范围。[S3]

发布仓库使用 BSD-3-Clause，允许免费使用、修改和商业发行；需要保留 Allan Chain 的版权、许可全文和免责声明，宣传中不得未经许可使用作者或贡献者姓名作为背书。原始 THUOCL 采用 MIT，商业使用已核查，使用这份筛选名单时保留两份许可。项目已经保存 THUOCL 完整许可。[S4][S5]

本次只将上述 **成语名称名单**列为可以复用的资料，拼音使用本项目已有的完整词语级读音资料。名单与本轮读取的 `data/dictionary.json` 相交后有 1,294 个词语，另外 127 个尚需取得满足本项目许可和格式要求的完整读音。[S3][S6]

维护者提供的游戏人工筛选依据可以核查，公开说明未承诺逐条符合本项目的全部收录条件。名单包含“新陈代谢”等广泛使用的科学词语，以及“二话不说”等常用固定表达；这些条目的收录仍依照本项目当前确定的日常使用范围处理。本次已经完整阅读名单并核对指定例词；没有逐条专家评审或准确率结果。[S1][S2][S3]

## 指定例词核查

以下结果来自完整读取 `reviewed.txt`，按完整词语精确查找。[S3]

| 词语 | 名单是否收录 |
| --- | --- |
| 到家 | 没有 |
| 亲亲 | 没有 |
| 边缘性人格障碍 | 没有 |
| 精神分裂症 | 没有 |
| 乙酰胆碱 | 没有 |
| 氰化钾 | 没有 |
| 生生不息 | 收录 |

有限的例词核查说明这些指定条目的状态。全部专业名称的自动排除规则没有在该游戏的名单说明中声明。[S1][S2]

## 普通词语范围的研究状态

本次没有核查到一份覆盖独立普通词语和成语、已经完成口语组合与专业名称筛选、并具有明确免费商业授权的完整现成游戏词库。这个结果限定于本次检索和取得的一手资料。

检索包含 GitHub 的中文 Wordle、汉字 Wordle、词语接龙、语义猜词、连线找词项目，以及现代汉语常用词表、分级常用词资料和日常词语筛选数据。查询关键词包含“中文词语游戏”“Chinese word game”“词语接龙”“chinese wordle”“人工筛选”“专业词”“常用词表”和“CC0”。具体核查涉及维护者的完整 README、收录或生成代码、来源声明、LICENSE，以及取得的完整数据文件。

通用搜索引擎返回的内容在本次访问中未提供有效的相关检索证据，研究结果依据 GitHub 一手仓库和项目已经保存的来源资料。当前普通词语数据的范围、许可和收录方法继续见 [中文数据来源](chinese-word-sources.md)、[日常词语资料](everyday-word-sources-2026-10-11.md) 和 [独立词语收录](word-admission-2026-10-12.md)。本次研究没有更改产品词库。

## 文件版本与验证

固定版本：`6838dde35e795ed8b81fa705d240c7f570d9d1a1`。

| 文件 | 数量或大小 | SHA-256 |
| --- | --- | --- |
| `data/reviewed.txt` | 1,421 个唯一词语；18,473 bytes | `43bf72047d4dd943e0c52e6e3ca736857672e84e6c6e81df9360fb5461736e2c` |
| `LICENSE` | 1,519 bytes | `3153ae4d0175862f71c416c69172b128bc60cb0eb989f95f922958e13303c19e` |
| `README.md` | 2,748 bytes | `0fe6054e71078309f7579c5c17d9b88aeaa4f5230ad15ab7a0faaec27a3c0b79` |

核查程序使用 Python 标准库 `csv` 读取单列及 TSV 文件、使用 `json` 读取 JSON，没有执行外部游戏代码。脚本、原始完整文件和统计结果保存在忽略目录 `.research/ready-game-lexicon-2026-10-12/`。重新运行 `python3 .research/ready-game-lexicon-2026-10-12/audit.py` 可以核查文件版本、摘要、数量、THUOCL 交集与指定词语。[S3][S6]

## 来源

- [S1：游戏维护者 README，固定版本全文](https://raw.githubusercontent.com/AllanChain/chinese-wordle/6838dde35e795ed8b81fa705d240c7f570d9d1a1/README.md)。
- [S2：成语名单处理代码，固定版本全文](https://raw.githubusercontent.com/AllanChain/chinese-wordle/6838dde35e795ed8b81fa705d240c7f570d9d1a1/data/process_idioms.py)。
- [S3：人工筛选成语名称，固定版本完整名单](https://raw.githubusercontent.com/AllanChain/chinese-wordle/6838dde35e795ed8b81fa705d240c7f570d9d1a1/data/reviewed.txt)。
- [S4：BSD-3-Clause 完整许可](https://raw.githubusercontent.com/AllanChain/chinese-wordle/6838dde35e795ed8b81fa705d240c7f570d9d1a1/LICENSE)。
- S5：项目 [THUOCL 完整来源与许可核查](thuocl-audit.md)，原始文件 `THUOCL_chengyu.txt`，许可 `licenses/THUOCL.txt`。
- S6：本次实际全文件统计 `.research/ready-game-lexicon-2026-10-12/audit.json`；本轮读取的当前产品文件 `data/dictionary.json`。
