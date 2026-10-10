# 普通词语收录质量研究

研究日期：2026-10-11（Asia/Shanghai）。

## 用户已经确定的要求

- 游戏默认同时使用普通词语和成语，答案至少包含两个汉字。
- 普通词语集合需要排除组织全称等不符合游戏要求的表达。
- 来源需要免费并允许商业使用，包含微信小程序用途。
- 词库通过项目文件维护。

## 例词来源

项目使用的 `cedict-json@1.3.20251213` 包含以下原始记录：

```json
{
  "traditional": "八大工業國組織",
  "simplified": "八大工业国组织",
  "pinyin": "ba1 da4 gong1 ye4 guo2 zu3 zhi1",
  "english": ["G8 (group of eight major industrialized nations)"]
}
```

`data/dictionary.json` 中相应记录的 `source` 为 `['CC-CEDICT']`、`idiom` 为 `false`、`df` 为 `0`。完整读音由这条 CC-CEDICT 记录生成；THUOCL 成语文件没有提供该词条。

当前 `scripts/build-data.ts` 筛选汉字数量、拼音格式、大写拼音和指定英文释义。该记录的拼音全部小写，英文释义未匹配 `data/policy.json` 中的排除条件，因此被收录。上述结果来自完整读取本地 JSON 数据和现有生成代码。

CC-CEDICT 官方提交规则说明，正确且具有一定意义的既有专名可以继续保留。它的词条范围包含国家、行政区、文化人物和文学作品；官方格式说明也明确写明数据中仍存在需要审核的旧记录。游戏需要单独定义有效答案集合。[S13][S2]

## jieba 的公开授权和字段

jieba 官方仓库采用 MIT License，版权声明为 `Copyright (c) 2013 Sun Junyi`。完整许可允许免费使用、复制、修改、发布、分发和销售，发行时保存版权与完整许可文本。官方 README 明确列出 MIT；`setup.py` 将 `dict.txt` 与其他数据一并收入安装包，发布者未为默认词典另外列出许可证。[S3][S4][S5]

本次核查固定版本为 `67fa2e36e72f69d9134b8a1037b83fbb070b9775`，默认词典 `jieba/dict.txt` 的完整结果为：[S6]

| 项目 | 结果 |
| --- | --- |
| 文件大小 | 5,071,852 bytes |
| 记录数量 | 349,046 |
| 二至九个汉字的唯一记录 | 337,081 |
| SHA-256 | `7197c3211ddd98962b036cdf40324d1ea2bfaa12bd028e68faa70111a88e12a8` |

README 说明，每行按空格分隔词语、词频和词性。`jieba/posseg/__init__.py` 的 `load_word_tag` 直接读取该词性字段；`jieba/__init__.py` 的 `gen_pfdict` 和 `calc` 使用词频计算分词概率。这些字段适合提供候选词语、筛选信号和排序参考。词典没有拼音、声调或逐条释义。[S3][S7][S8]

jieba 的词频服务于分词概率。README 提供了通过 `suggest_freq` 修改词频来改变分词结果的例子，因此某个数值不能直接解释为当前中文使用次数或语言规范等级。[S3][S8]

## jieba 的词性和质量范围

在本次默认词典中，可以核实以下记录：[S6]

| 词语 | 词频 | 原始词性字段 |
| --- | ---: | --- |
| 老板 | 4402 | `n` |
| 知识 | 8254 | `v` |
| 清澈 | 568 | `a` |
| 咖啡 | 1400 | `n` |
| 人工智能 | 151 | `n` |
| 冰淇淋 | 79 | `nr` |
| 打击报复 | 27 | `l` |
| 生生不息 | 39 | `l` |
| 天翻地覆 | 150 | `i` |
| 无往不利 | 14 | `i` |
| 今天天气 | 3 | `i` |
| 八国集团 | 5 | `nt` |

「冰淇淋」的原始标签是 `nr`；单凭人名标签排除词语会删除正常的食物名。「知识」的原始标签是 `v`；仅收录名词也会减少有效普通词语。`i` 标签同时出现在「天翻地覆」和「今天天气」，成语身份需要继续依据现有来源独立判断。

作者在官方 issue 中说明，`dict.txt` 存在不符合正常词语标准的记录。官方 README 也以删除「今天天气」调整分词结果为例。这些一手证据支持将默认词典作为经过进一步筛选的候选来源。[S3][S9]

词库本身经过全文件结构和交集核查；本研究没有逐条确认全部记录的语言学准确性。jieba 的公开 MIT 授权可以核查，每条默认词语的最初资料和人工审核记录没有逐条公开。

## 与当前读音数据的交集

统计对象是当前已经通过项目筛选、具有完整 CC-CEDICT 读音的 88,614 个词语。与 jieba 默认词典精确相交后共有 64,516 个词语，另有 6,151 个当前词语在 jieba 中使用 `nr`、`nrfg`、`nrt`、`ns`、`nt` 或 `nz` 标签。这个数量表示标签分布，需要结合具体词语解释。

以下候选实验使用允许标签集合：`n, v, vn, a, ad, an, d, i, l, j, b, f, s, t, r, c, p, u, q, m`。所有词语仍需要通过现有 CC-CEDICT 筛选。表中的成语数量使用当前游戏独立分类，共 7,133 个，不受 jieba 词频限制。

| jieba 词频下限 | 相交且符合标签的全部词语 | 其中普通词语 | 普通词语加当前成语 |
| --- | ---: | ---: | ---: |
| 2 | 57,690 | 51,869 | 59,002 |
| 5 | 45,146 | 40,694 | 47,827 |
| 10 | 41,755 | 37,854 | 44,987 |
| 20 | 36,648 | 33,649 | 40,782 |
| 50 | 27,552 | 25,983 | 33,116 |

这些数量用于评估覆盖范围。标签集合与词频下限属于项目候选实验，尚未由用户确定，也不能证明全部剩余词条都符合普通词语标准。长词条需要独立审核，符合普通名词标签的技术术语仍有较长的表达。

「八大工业国组织」未出现在该固定版本的 jieba 默认词典；精确交集会排除它。「老板」「知识」「清澈」「人工智能」「咖啡」具有完整 CC-CEDICT 读音，并在上述下限为 5 的候选集合中保留。「打击报复」「生生不息」「天翻地覆」「无往不利」可以由独立成语集合保留。

## 数据组合建议，待用户确认

普通词语候选使用 jieba 默认词典与完整 CC-CEDICT 读音的精确交集，结合词频、释义和词性审核；采用明确的词语收录文件保存最终有效答案。已核实的正常词语可以通过显式收录设置保留，组织全称等表达通过显式排除设置处理。自动筛选需要保存来源和筛选依据，以便维护者直接修改文件。

成语继续使用 THUOCL 与 CC-CEDICT 的现有候选和读音组合，保持其独立标签。THUOCL 官方 README 说明经过多轮人工筛选并允许免费商业使用；发布时保留 THUNLP 的 MIT 声明。项目既有的逐项核查见 `docs/thuocl-audit.md`。[S10][S11]

词语读音继续使用 CC-CEDICT 的完整词语记录，保留同一词语认可的整组读音。官方格式采用原始声调，轻声标记为数字 5，词语中的轻声变化有独立说明；这些规则与现有游戏判定要求一致。CC-CEDICT 官方采用 CC BY-SA 4.0，公开整理后的词语和读音数据继续保存署名、修改说明与 ShareAlike 许可。[S1][S2][S12]

## 核查方法与资料

官方 README、完整许可和相关源代码已全文读取。jieba 默认词典使用项目已有 `csv-parse` 读取全部 349,046 行并核查三个字段，CC-CEDICT 与游戏 JSON 使用 `JSON.parse` 完整读取。HTML 使用 BeautifulSoup 获取全文。下载、统计脚本和统计结果保存于被 `.gitignore` 忽略的 `.research/word-quality-2026-10-11/`；运行 `node .research/word-quality-2026-10-11/analyze.mjs` 可以重新生成本次交集统计。

- [S1：CC-CEDICT 官方主页](https://cc-cedict.org/wiki/)。
- [S2：CC-CEDICT 官方格式与读音说明](https://cc-cedict.org/wiki/syntax_v2)。
- [S3：jieba 固定版本 README](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/README.md)。
- [S4：jieba 固定版本 MIT License](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/LICENSE)。
- [S5：jieba 固定版本安装包定义](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/setup.py)。
- [S6：jieba 固定版本完整默认词典](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/jieba/dict.txt)。
- [S7：jieba 固定版本词性字段读取代码](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/jieba/posseg/__init__.py)。
- [S8：jieba 固定版本默认词典与分词概率代码](https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/jieba/__init__.py)。
- [S9：jieba 作者关于默认词典质量的官方讨论](https://api.github.com/repos/fxsjy/jieba/issues/7/comments?per_page=100)。完整读取全部 54 条评论，引用作者 `fxsjy` 的说明。
- [S10：THUOCL 固定版本 README](https://raw.githubusercontent.com/thunlp/THUOCL/a30ce79d895d01ab5132a5c74c29703ff7efb4cc/README.md)。
- [S11：THUOCL 固定版本 MIT License](https://raw.githubusercontent.com/thunlp/THUOCL/a30ce79d895d01ab5132a5c74c29703ff7efb4cc/LICENSE)。
- [S12：CC BY-SA 4.0 完整许可](https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt)。
- [S13：CC-CEDICT 官方提交规则](https://cc-cedict.org/wiki/guidelines)。
