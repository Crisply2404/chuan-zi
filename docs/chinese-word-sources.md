# 中文词语、拼音与部首数据来源研究

研究日期：2026-10-08（Asia/Shanghai）

目标：为「击鼓传字」选择免费、允许商业使用、可以核查并随项目维护的中文词语数据。用户决定直接修改项目文件。

## 推荐组合

### THUOCL：成语候选和历史文档频次

THUOCL 由清华大学自然语言处理与社会人文计算实验室整理推出，官方 README 说明词表来自社会标签、搜索热词和输入法词库，经过多轮人工筛选。成语分类的历史新闻文档频次来自新浪新闻 2008.01 至 2016.11 的 8421097 篇文档。词条收集来源与文档频次来源分别记录。

项目根目录的 `THUOCL_chengyu.txt` 与官方仓库文件逐字节一致，共 8519 条唯一词条，包含词条和整数 `DF`。其中 7874 条包含四个汉字，645 条包含五个至九个汉字。SHA-256 为 `c339d5d6e37d4f8ecdcb82f2a02b7fdfc66796f0a5215155f2aff8a77e89a7eb`。

官方 README 明确允许免费用于研究和商业，仓库采用 MIT License。用于商业网页游戏或微信小程序无需支付 THUOCL 词库授权费；发行数据时保存 `Copyright (c) 2018 THUNLP` 和完整 MIT 许可文本。项目已保存 [许可文本](../licenses/THUOCL.txt)。

THUOCL 适合提供成语候选与历史常见程度参考。它的其他分类可以作为普通词语的补充候选，但这些分类来自不同领域与年代，不能直接作为完整的现代普通词语库。文件没有拼音、声调、释义、部首与逐条词典引证；最终有效答案需要依据游戏收录标准筛选，读音条件需要配合词语级拼音。提示难度根据满足全部条件且尚未使用的答案数量计算，`DF` 作为辅助信息。

来源与完整核查结果：

- [THUOCL 核查记录](thuocl-audit.md)
- [官方 README 固定版本](https://raw.githubusercontent.com/thunlp/THUOCL/a30ce79d895d01ab5132a5c74c29703ff7efb4cc/README.md)
- [MIT License 固定版本](https://raw.githubusercontent.com/thunlp/THUOCL/a30ce79d895d01ab5132a5c74c29703ff7efb4cc/LICENSE)
- [成语数据固定版本](https://raw.githubusercontent.com/thunlp/THUOCL/f694ce779b2a066bfdff2c71a0bd7cfff81fe1ef/data/THUOCL_chengyu.txt)

### CC-CEDICT：词语和拼音的开放基础数据

CC-CEDICT 是持续维护的可下载中文-英文词典。官方说明显示，它包含繁体字、简体字、拼音和释义，词条由编辑审核；提交规则优先收录现代使用中的词语和汉字，并限制大部分普通专名。当前格式可以提供每个词条的繁体字、简体字和带声调数字的拼音。

CC-CEDICT 使用 CC BY-SA 4.0，允许免费商业使用。将其中词条整理进游戏并随项目发布时，需要保留署名、许可证说明并标明修改；公开改编词语数据需要遵循 ShareAlike 要求。许可义务针对所用资料及其改编资料。建议将来源说明和许可证文本放在项目资料中，并在词语数据文件中保留 `source` 字段。

CC-CEDICT 适合提供：

- 简体中文词语基础集合。
- 每个汉字或词语的拼音序列。
- 声母提取所需的拼音音节。
- 词语的繁体形式，供后续词库选择使用。

CC-CEDICT 的官方格式说明明确提醒，数据库仍包含遗漏、错误和多义词条。游戏词库需要经过项目自己的筛选，不能直接把全部条目当作有效答案。CC-CEDICT 的定义说明面向人工阅读，项目需要使用中文字段和拼音字段完成判定。

官方格式使用数字 1 至 5 标记声调，5 表示轻声。拼音保存词语的原始声调，包括词语中的轻声；「一」「不」与第三声的连读声调变化不改变判定数据。多音词需要记录允许的完整读音序列，所有条件由其中同一套完整读音满足。THUOCL 与 CC-CEDICT 的词条覆盖交集尚未统计。

来源：

- [CC-CEDICT 官方主页](https://cc-cedict.org/wiki/)
- [CC-CEDICT 格式说明](https://cc-cedict.org/wiki/syntax_v2)
- [CC-CEDICT 提交规则](https://cc-cedict.org/wiki/guidelines)
- [CC-CEDICT 编辑页面](https://cc-cedict.org/editor/editor.php)
- [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### 教育部词典与成语典：权威查证来源

台湾教育部的公眾授權網列出《重編國語辭典修訂本》《國語辭典簡編本》《國語小字典》和《成語典》。页面说明这些资料采用「創用CC-姓名標示-禁止改作 3.0 臺灣授權條款」发布，允许重制、散布、傳輸和商业使用，要求署名并遵守使用说明，禁止修改原著。

这些资料适合用于：

- 人工确认词语和成语是否有可靠释义。
- 建立项目自己的候选词语清单。
- 对 CC-CEDICT 的拼音、词形和成语标签进行交叉检查。

教育部资料用于查证词语与读音。整理或再发布其资料时，应当依据具体数据文件的授权条件处理；人工处理同样需要遵守适用的许可。项目发布的数据来源与授权范围需要逐项记录。

来源：

- [教育部國語辭典公眾授權網](https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/index.html)
- [教育部《重編國語辭典修訂本》](https://dict.revised.moe.edu.tw/)
- [教育部《成語典》](http://dict.idioms.moe.edu.tw/)

### Unicode Unihan：汉字部首与笔画数据

Unicode Unihan 是 Unicode Consortium 维护的汉字数据库。UAX #38 说明它按汉字记录属性；`kRSUnicode` 提供康熙部首和笔画信息，适合实现「部首/字形部件」模式中的部首判定。

Unihan 数据文件受 Unicode License v3 授权。该许可证允许使用、复制、修改、合并、发布、分发和销售数据文件，但需要在副本或相关文档中保留版权和许可说明。项目应当保存 `Unihan` 的来源、版本日期和许可证文本，不需要把 UAX 技术报告全文复制进项目。

Unihan 主要提供汉字级数据。它不能单独提供完整中文词语、成语或所有字形部件的结构分析。部首模式需要先确定采用康熙部首判定，再将词语中的每个汉字映射到 `kRSUnicode`。

来源：

- [UAX #38: Unicode Han Database](https://www.unicode.org/reports/tr38/)
- [Unicode Public Data Files](https://www.unicode.org/Public/UCD/latest/ucd/)
- [Unihan ReadMe](https://www.unicode.org/Public/UCD/latest/ucd/ReadMe.txt)
- [Unicode License v3](https://www.unicode.org/license.txt)

## 项目文件建议

词语数据直接存放在项目目录，便于人工修改。可以按用途分成以下文件：

- `data/words/accepted.json`：允许提交的简体中文词语。
- `data/words/idioms.json`：允许提交的成语。
- `data/words/pinyin.json`：词语、汉字序列和拼音音节。
- `data/characters/radicals.json`：汉字到康熙部首的映射。
- `data/words/sources.json`：每组数据的来源、版本、许可证和整理日期。

这些文件的具体格式需要等条件组合的匹配规则确定后再写入。词语文件保留来源字段，方便直接修改后仍然能够追溯来源。THUOCL 原始词表与 MIT License 按来源保留；使用 CC-CEDICT 补充得到的公开派生词库遵循 CC BY-SA 4.0 的适用条件。

## 当前建议

成语候选与历史文档频次使用 THUOCL；普通词语以 CC-CEDICT 为基础，THUOCL 其他分类只作为经过筛选的补充候选；词语级拼音使用 CC-CEDICT；部首使用 Unicode Unihan 的 `kRSUnicode`。教育部词典和成语典用于查证。发布的数据保存版本、来源、署名和许可证。字形部件的数据来源及完整读音覆盖仍需研究。

## 仍需确认

- CC-CEDICT 数据整理为项目词表后，完整 ShareAlike 文本和署名放置位置。
- THUOCL 成语候选在 CC-CEDICT 中的完整读音覆盖率。
- 字形部件映射的数据来源、免费商业使用授权和筛选规则。
- 普通词语、成语与网络用语的最终收录标准。

## 当前游戏资料

当前游戏词库 `data/dictionary.json` 采用 CC-CEDICT / MDBG `2026-10-12T08:13:53Z` 固定快照，包含 89,431 个词语，其中 7,050 个列入成语集合；THUOCL 中有 5,142 个候选获得完整 CC-CEDICT 读音。生成规则、筛选文件及完整统计见 `data/README.md`、`data/policy.json`、`data/build-report.json`。常见程度排序采用 jieba 固定版本的 MIT 词频资料，专业领域筛选依据词条释义和明确保留文件，研究见 `docs/everyday-word-sources-2026-10-11.md`。

资料按来源保存许可：CC-CEDICT 的词语与拼音部分按 CC BY-SA 4.0 发布；THUOCL 原始候选和 DF 保留 MIT；Unicode 部首保留 Unicode License v3。词语数据的修改包括长度与释义筛选、完整读音去重、拼音条件字段生成和成语分类。单局条件使用同一匹配窗口与同一套完整读音，候选数量按实际交集统计。

字形部件使用 Make Me a Hanzi 的 `dictionary.txt`，固定版本 `bddc96d41bef78427ed0e034e9f7e31d71fd1b92`，共 9,574 个汉字记录。dictionary 采用 LGPL-3.0-or-later，逐笔 graphics 采用 Arphic Public License，均允许免费商业使用。原始资料、版本、修改后资料与完整许可随项目保留，研究见 `radical-stroke-data-2026-10-13.md`。

字形结构使用 `parse-ids` 读取 IDS，递归整理实际部件。字典分类来自 Unihan 18.0.0 的 `kRSUnicode`。游戏部首条件按实际常见部件形态匹配，要求 `strokeParts` 中存在真实笔画映射，且汉字包含其他笔画。清、澈可以回答氵，空穴来风可以回答宀；生成、草稿与提交使用相同映射。缺少字形资料的汉字保留空的部件集合。

来源文件与 SHA-256 见 `data/sources.json`。原始资料保存于 `data/sources/`，生成过程使用 JSON、JSON Lines、CSV/TSV、ZIP 与 IDS 的现有库。词条直接维护入口为 JSON；重新生成所需的持续排除设置保存在 `policy.json`。

官方核查资料：Make Me a Hanzi 固定版本 README、COPYING、LGPL 与完整 dictionary JSON Lines；Unicode 18.0.0 CJKRadicals 完整文件和 Unicode License v3。部件数据采用 LGPL-3.0-or-later，修改后的相应资料继续保留来源许可；词语部分采用 CC BY-SA 4.0，来源署名为 CC-CEDICT contributors。

易误写提醒保存于 `data/common-mistakes.json`，记录项目人工核查的词形对应与来源链接，网页、Node 服务和 Cloudflare 共用。当前 13 组，研究见 `common-misspellings-research-2026-10-13.md`。
