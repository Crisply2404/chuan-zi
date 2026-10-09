# THUOCL 成语词表核查

研究日期：2026-10-08（Asia/Shanghai）。

## 文件一致性

项目根目录的 `THUOCL_chengyu.txt` 与 `thunlp/THUOCL` 官方仓库中 `data/THUOCL_chengyu.txt` 的全部字节一致。已分别下载当前 `master` 文件和固定 commit `f694ce779b2a066bfdff2c71a0bd7cfff81fe1ef` 的文件，并使用 `cmp` 验证。GitHub 文件 API 返回的 blob SHA 为 `44d91b3349753dc7f43b53e8cf64cda790c9ea22`。[S3][S4]

本地文件的核查结果：

- 文件大小：166549 bytes。
- 记录数量：8519 条；每条记录均包含两个字段。
- 编码：UTF-8。
- 唯一词条：8519 条；没有重复词条。
- SHA-256：`c339d5d6e37d4f8ecdcb82f2a02b7fdfc66796f0a5215155f2aff8a77e89a7eb`。
- 词条长度：四个汉字 7874 条、五个汉字 187 条、六个汉字 159 条、七个汉字 165 条、八个汉字 129 条、九个汉字 5 条。
- DF 最小值：21；最大值：54113；记录按照 DF 从大到小排列。
- DF 不少于 1000：2340 条；DF 不少于 100：6104 条。

统计使用 Python 标准库 `csv.reader` 读取完整 TSV 文件，同时检查字段数量、整数 DF、词条长度和重复词条。核查脚本保存在 `.research/thuocl-audit/analyze_tsv.py`。以上数量均为本次全文件统计。[S3]

## 发布来源

THUOCL 的官方 README 说明，该词库由清华大学自然语言处理与社会人文计算实验室整理推出；原始词表来自主流网站的社会标签、搜索热词和输入法词库，经过多轮人工筛选。成语分类列出的贡献者是韩世依、张钰晖、马云山，分类更新时间是 2016-12-24，词条数量为 8519。[S1]

仓库属于 GitHub 的 `thunlp` Organization。机构 API 将其描述为清华大学自然语言处理实验室，并列出清华域名的机构网站。README 指向的 THULAC 官方页面也标明同一个实验室，并连接 `thunlp` 的项目仓库。这些发布信息与本地文件一致性支持将本文件视为 THUOCL 的原始公开数据。[S5][S6][S7]

GitHub 数据文件历史当前返回一条提交：`f694ce779b2a066bfdff2c71a0bd7cfff81fe1ef`，提交者为 Guo Zhipeng，提交时间为 2018-11-21 04:54:43 UTC。GitHub 上传时间与 README 所写的分类更新时间分别记录不同事件。[S4]

README 没有提供每个词条对应的原始网站、输入法词表版本、人工校验记录或收录标准。当前能够核实发布者、总体收集方式和文件原始版本；每条记录的最初出处没有逐条公开。[S1][S3]

## 成语词条与新闻 DF

文件每一行包含词条和 DF，中间使用 Tab 分隔。README 将 DF 定义为包含该词条的文档数量。[S1][S3]

成语分类使用的 DF 来自新浪新闻：语料时间为 2008.01 至 2016.11，文档数量为 8421097。这个来源描述的是词频统计语料；原始词条的总体收集方式另列为社会标签、搜索热词和输入法词库。[S1]

例如，文件包含：

- `随时随地`：DF 52510。
- `防患于未然`：DF 6626。
- `一步一个脚印`：DF 4943。
- `生生不息`：DF 4370。
- `天翻地覆`：DF 2061。

这些记录说明词表容纳四字表达和更长表达。8519 条记录的成语类别来自 THUOCL 的分类；文件没有释义、成语用法标签或逐条词典引证，因而不能凭这一分类确认全部记录符合项目最终采用的成语定义。[S1][S3]

本次检查完成了来源、完整性和格式核查。词条的语言学准确率没有进行逐条专家评审，也没有官方准确率数据可以引用。[S1][S3]

## 免费商业使用

官方 README 明确写明，THUOCL 面向大学、研究所、企业、机构与个人免费开放，可用于研究与商业。仓库根目录的 `LICENSE` 是 MIT License，版权说明为 `Copyright (c) 2018 THUNLP`。[S1][S2]

MIT License 免费授予使用、复制、修改、合并、发布、分发、再授权和销售的许可。将本词表用于商业网页游戏或微信小程序，在该公开授权范围内无需支付词库授权费。发行词表原文、修改后的词表或包含大量该数据的项目时，需要保留版权说明和完整许可说明。[S2]

项目应当随 THUOCL 数据保存以下信息：

- `Copyright (c) 2018 THUNLP`。
- MIT License 全文。
- 官方数据文件地址、固定版本和上述 SHA-256。
- 词库说明中注明来源为 THUOCL（清华大学开放中文词库）。

MIT License 没有要求公开独立游戏代码。README 另外要求论文或科研成果注明使用 THUOCL 并引用作者，商业游戏的数据说明可以同时保留作者与项目名称。[S1][S2]

## 游戏用途

THUOCL 适合提供「成语词库」的候选词条，以及历史新闻常见程度的辅助信息。用户希望直接维护文件，可以依据游戏规定形成明确的有效答案集合，并保留 THUOCL 来源与 MIT License。[S1][S2][S3]

四字答案设置可以采用其中的 7874 个四字候选；允许更长表达时，可以采用其余 645 个候选。长度筛选属于项目的游戏规则，词条是否适合收入最终有效集合仍需要依据该规则确认。现有文件还收录了用户举出的 `生生不息` 和 `天翻地覆`。[S3]

文件没有一个至三个汉字的记录，没有拼音、声调、释义或部首数据。用户提出的普通词语、声母、韵母、声调与部首组合玩法，需要词语级读音和汉字属性数据配合。[S3]

DF 可用来辅助组织常见程度；不同提示的难度还取决于当前有效词库中符合全部条件的答案数量。该数量需要根据提示与答案规则计算。单独使用新闻 DF 无法得到一个提示的可答词条数量。

## 配合 CC-CEDICT

CC-CEDICT 是与本项目需求相符的补充数据：官方格式提供繁体、简体、词语拼音和释义，拼音声调用数字 1 至 5 表示，数字 5 表示轻声。官方拼音规范采用原始声调，并记录词语使用中的轻声，适合支撑声母、韵母和声调判定。[S8][S9]

使用词语级读音可以处理多音字在特定词语中的发音。有效词语保留其认可的整组读音；每个汉字的读音组合需要与该词语相符。CC-CEDICT 自身也说明仍存在遗漏和错误，项目需要依据有效答案规则筛选和确认。[S9]

CC-CEDICT 采用 CC BY-SA 4.0，允许免费商业使用。使用其数据需要署名、标明修改内容并提供许可证；公开改编数据时需遵守 ShareAlike。许可义务针对所用资料及其改编资料。[S8][S10]

本项目可按来源保存 THUOCL 原始词表及 MIT License，并保存 CC-CEDICT 词语、读音数据及 CC BY-SA 4.0 说明。使用 CC-CEDICT 补充得到的公开派生词库，需要遵循 CC BY-SA 4.0 的适用条件。这样的数据组合能覆盖成语候选、一般词语和词语级拼音；汉字部首另使用项目已经研究的 Unicode Unihan。

## 核查资料

以下资料均已获取完整内容并阅读；JSON 使用结构化解析，HTML 使用 BeautifulSoup 读取。数据文件使用完整 CSV/TSV 读取及全字节比对。下载的核查资料保存在被 `.gitignore` 忽略的 `.research/thuocl-audit/`。

- [S1：THUOCL 官方 README 固定版本](https://raw.githubusercontent.com/thunlp/THUOCL/a30ce79d895d01ab5132a5c74c29703ff7efb4cc/README.md)，完整文本，与核查时 `master` 版本一致。
- [S2：THUOCL MIT License 固定版本](https://raw.githubusercontent.com/thunlp/THUOCL/a30ce79d895d01ab5132a5c74c29703ff7efb4cc/LICENSE)，完整文本，与核查时 `master` 版本一致。
- [S3：THUOCL 成语数据固定版本](https://raw.githubusercontent.com/thunlp/THUOCL/f694ce779b2a066bfdff2c71a0bd7cfff81fe1ef/data/THUOCL_chengyu.txt)，完整文件，与项目本地文件一致。
- [S4：GitHub 成语文件提交历史 API](https://api.github.com/repos/thunlp/THUOCL/commits?path=data/THUOCL_chengyu.txt&per_page=100)，完整 JSON；文件 API 的 blob 标识也已核查。
- [S5：GitHub 仓库 API](https://api.github.com/repos/thunlp/THUOCL)，完整 JSON。
- [S6：GitHub THUNLP Organization API](https://api.github.com/orgs/thunlp)，完整 JSON。
- [S7：THULAC 官方页面](http://thulac.thunlp.org/)，完整 HTML 与页面文本，仅用于核查实验室身份关联。
- [S8：CC-CEDICT 官方主页](https://cc-cedict.org/wiki/)，完整 HTML 与页面文本。
- [S9：CC-CEDICT v2 格式说明](https://cc-cedict.org/wiki/syntax_v2)，完整 HTML 与页面文本。
- [S10：CC BY-SA 4.0 完整许可条文](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en)，完整 HTML 与许可条文。
