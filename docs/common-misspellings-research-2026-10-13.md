# 易误写词语提醒资料

研究日期：2026-10-13，Asia/Shanghai。使用 Skill：`research`。

## 提醒范围

用户已经指定“不可置否”对应“不置可否”。教育部《重編國語辭典修訂本》与《成語典》的词目均为“不置可否”，当前游戏资料包含该成语及完整读音 `bu4 zhi4 ke3 fou3`。研究保存这个用户指定的对应关系，以及十二组经过查证的常见误写对应关系。

提醒只在已经确认的汉字内容与 `incorrect` 完全相同时出现，文案为“这个词应写作「不置可否」”，位置使用答案格下方的行内反馈区域。改变输入内容后重新判断。拼音输入法组合期间依据已经确认的汉字内容判断。提醒文字说明词语写法；修改后的答案仍然需要满足当前题目、长度、词库与本局重复限制。

词库查不到某种表达只能说明当前收录情况。加入提醒资料需要逐项确认规范词目、明确误写证据、合法变体以及当前游戏收录情况。已有合法词语继续遵循原本的判定资料；新增提醒项目应当经过同样的人工检查。

## 已使用的十三组对应关系

下列“教育部词目”来自词典编制机构自己发布的完整网页；列表页、详情页 HTML 与 metadata 全部保存于 `.research/misspellings-2026-10-13/`。部分详情页的主要正文由网站运行过程呈现，本次读取了完整 HTTP 内容、完整列表文本及详情页的完整 metadata。核对内容包括规范字形、词目读音与变体说明，产品资料只保存词语和来源地址。

“误写依据”列的天华学院语言文字栏目由学校发布，明确用括号指示正确文字。各组对应关系由本项目逐项整理，重新安排项目顺序，配合教育部词目与开放词典核对。

十二种输入另分别提交至教育部《重編國語辭典修訂本》的词目查询，完整结果保存为 `moe-incorrect-1.html` 至 `moe-incorrect-12.html` 和 `moe-incorrect.json`。各输入的正文与附录结果均为零；其中九种输入得到网站提供的对应规范词目参考，包括“不可置否”查询返回“不置可否”，“再接再勵”查询返回“再接再厲”。这项第一方查询结果与学校的明确正字指示、正确词目的字形与读音共同支持所列对应关系。

| `input` | `correction` | 教育部词目 | 误写依据与状态 |
| --- | --- | --- | --- |
| 不可置否 | 不置可否 | [《重編國語辭典修訂本》21272](https://dict.revised.moe.edu.tw/dictView.jsp?ID=21272&la=0&powerMode=0)、[《成語典》1341](https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=1341&q=1) | 用户指定的对应关系；规范词目已核查 |
| 再接再励 | 再接再厉 | [《重編國語辭典修訂本》138352](https://dict.revised.moe.edu.tw/dictView.jsp?ID=138352&la=0&powerMode=0)、[《成語典》241](https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=241&q=1) | [天华学院第41项](https://thyy.sthu.edu.cn/28/b3/c947a10419/page.htm)明确“励”应为“厉”；已经核查 |
| 一愁莫展 | 一筹莫展 | [《重編國語辭典修訂本》149626](https://dict.revised.moe.edu.tw/dictView.jsp?ID=149626&la=0&powerMode=0)、[《成語典》153](https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=153&q=1) | [天华学院第8项](https://thyy.sthu.edu.cn/28/b3/c947a10419/page.htm)明确“愁”应为“筹”；已经核查 |
| 迫不急待 | 迫不及待 | [《重編國語辭典修訂本》22553](https://dict.revised.moe.edu.tw/dictView.jsp?ID=22553&la=0&powerMode=0)、[《成語典》743](https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=743&q=1) | [天华学院第26项](https://thyy.sthu.edu.cn/28/b3/c947a10419/page.htm)明确“急”应为“及”；已经核查 |
| 穿流不息 | 川流不息 | [《重編國語辭典修訂本》125788](https://dict.revised.moe.edu.tw/dictView.jsp?ID=125788&la=0&powerMode=0)、[《成語典》440](https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=440&q=1) | [天华学院第9项](https://thyy.sthu.edu.cn/28/b3/c947a10419/page.htm)明确“穿”应为“川”；已经核查 |
| 甘败下风 | 甘拜下风 | [《重編國語辭典修訂本》词目查询](https://dict.revised.moe.edu.tw/search.jsp?md=1&word=%E7%94%98%E6%8B%9C%E4%B8%8B%E9%A2%A8&qMd=0&qCol=1&sound=1)、[《成語典》136](https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=136&q=1) | [天华学院第2项](https://thyy.sthu.edu.cn/28/b3/c947a10419/page.htm)明确“败”应为“拜”；已经核查 |
| 天翻地复 | 天翻地覆 | [《重編國語辭典修訂本》词目查询](https://dict.revised.moe.edu.tw/search.jsp?md=1&word=%E5%A4%A9%E7%BF%BB%E5%9C%B0%E8%A6%86&qMd=0&qCol=1&sound=1)、[《成語典》999](https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=999&q=1) | [天华学院第16项](https://thyy.sthu.edu.cn/28/b3/c947a10419/page.htm)明确“复”应为“覆”；已经核查 |
| 言简意骇 | 言简意赅 | [《重編國語辭典修訂本》词目查询](https://dict.revised.moe.edu.tw/search.jsp?md=1&word=%E8%A8%80%E7%B0%A1%E6%84%8F%E8%B3%85&qMd=0&qCol=1&sound=1)、[《成語典》650](https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=650&q=1) | [天华学院第17项](https://thyy.sthu.edu.cn/28/b3/c947a10419/page.htm)明确“骇”应为“赅”；已经核查 |
| 一股作气 | 一鼓作气 | [《重編國語辭典修訂本》词目查询](https://dict.revised.moe.edu.tw/search.jsp?md=1&word=%E4%B8%80%E9%BC%93%E4%BD%9C%E6%B0%A3&qMd=0&qCol=1&sound=1) | [天华学院第19项](https://thyy.sthu.edu.cn/28/b3/c947a10419/page.htm)明确“股”应为“鼓”；已经核查 |
| 金榜提名 | 金榜题名 | [《重編國語辭典修訂本》词目查询](https://dict.revised.moe.edu.tw/search.jsp?md=1&word=%E9%87%91%E6%A6%9C%E9%A1%8C%E5%90%8D&qMd=0&qCol=1&sound=1) | [天华学院第73项](https://thyy.sthu.edu.cn/28/b3/c947a10419/page.htm)明确“提”应为“题”；已经核查 |
| 沤心沥血 | 呕心沥血 | [《重編國語辭典修訂本》词目查询](https://dict.revised.moe.edu.tw/search.jsp?md=1&word=%E5%98%94%E5%BF%83%E7%80%9D%E8%A1%80&qMd=0&qCol=1&sound=1) | [天华学院第56项](https://thyy.sthu.edu.cn/28/b3/c947a10419/page.htm)明确“沤”应为“呕”；已经核查 |
| 食不裹腹 | 食不果腹 | [《重編國語辭典修訂本》127752](https://dict.revised.moe.edu.tw/dictView.jsp?ID=127752&la=0&powerMode=0) | [天华学院第22项](https://thyy.sthu.edu.cn/28/b3/c947a10419/page.htm)明确“裹”应为“果”；已经核查 |
| 草管人命 | 草菅人命 | [《重編國語辭典修訂本》141584](https://dict.revised.moe.edu.tw/dictView.jsp?ID=141584&q=1&word=%E8%8D%89%E8%8F%85%E4%BA%BA%E5%91%BD) | [天华学院第29项](https://thyy.sthu.edu.cn/28/b3/c947a10419/page.htm)明确“管”应为“菅”；规范词目与当前词库已经核查 |

## 当前游戏资料核查

完整读取 `data/dictionary.json` 与 `data/sources/cc-cedict-2026-10-12.json` 的 JSON 资料进行逐项检查。十三个正确词形全部已经收录，具有四个汉字的完整读音并标记为成语。十三个误写词形在游戏词库与该 CC-CEDICT 原始快照中均未收录。

检查结果保存于 `.research/misspellings-2026-10-13/dictionary-audit.json`，检查程序为同目录 `audit-dictionary.py`。项目运行过程可以检查 `input` 唯一、`correction` 已有读音、两者字符不同、来源网址存在等条件，资料冲突时在初始化位置抛出错误，要求维护者重新核查。

## 变体与误报控制

教育部“不置可否”词目也记录“未置可否”；“再接再厉”的典源字形使用“砺”。提醒集合只对表格内的 `input` 进行完全相同的字符判断。文案没有延伸到近义词、繁体词语、倒序表达或典源字形。已有读音与词库分类继续由游戏原有资料处理。

每条来源至少支持具体规范词目；误写的判定还需要支持材料或用户明确指定。提醒资料维护应保存这个证据范围，避免从查询缺少词目推断某种表达必然错误。

## 数据文件

独立文件使用 `data/common-mistakes.json`。每个项目具有 `incorrect`、`correct` 与 `sources`，查证范围记录在本文件。界面文案由代码统一生成，方便继续维护。

```json
{
  "version": "2026-10-13",
  "license": "CC0-1.0",
  "entries": [
    {
      "incorrect": "不可置否",
      "correct": "不置可否",
      "sources": [
        {"title": "教育部《重編國語辭典修訂本》不置可否", "url": "https://dict.revised.moe.edu.tw/dictView.jsp?ID=21272"}
      ]
    },
    {
      "incorrect": "再接再励",
      "correct": "再接再厉",
      "sources": [
        {"title": "天华学院：100个常见别字", "url": "https://thyy.sthu.edu.cn/28/b3/c947a10419/page.htm"},
        {"title": "教育部辞典：再接再厲", "url": "https://dict.revised.moe.edu.tw/dictView.jsp?ID=138352&la=0&powerMode=0"}
      ]
    }
  ]
}
```

## 免费商业使用依据

数据由本项目整理为十三组词语写法事实，来源地址用于核查。产品文件保存短词语、对应关系、日期和来源；词典释义、例句、学校文章全文、完整词典集合及网页素材保存在研究目录中。项目编排的对应集合按 CC0 1.0 发布，全文见 `licenses/CC0-1.0.txt`。CC0 的完整说明确认可以复制、修改、分发及商业使用：[Creative Commons CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)。

教育部公眾授權网页允许其完整资料商业使用，适用 CC BY-ND 3.0 TW 并要求署名与保持原文。该词典用于核对短词语写法，未将其释义资料改写成产品词典：[教育部國語辭典公眾授權網](https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/index.html)。学校网页的文章和编排未核实开放许可，产品文件使用逐项整理的事实。版权对事实和表达的范围可参考已经完整读取的 [U.S. Copyright Office 说明](https://www.copyright.gov/help/faq/faq-protect.html)，其中明确区分事实与原创表达，且指出短语本身不属于 copyright 的保护对象。

当前完整游戏词库继续使用 CC-CEDICT contributors / MDBG 的 CC BY-SA 4.0 词语和读音资料。新增对应集合的许可说明与现有词库资料分别记录。

## 研究文件

完整原始 HTTP 页面、文本与 metadata：`.research/misspellings-2026-10-13/`。主要资料为 `college.html`、`moe-1.html` 至 `moe-15.html`、`moe-detail-1.html` 至 `moe-detail-6.html`、`idioms-detail-1.html` 至 `idioms-detail-9.html`、`moe-incorrect-1.html` 至 `moe-incorrect-12.html`、`moe-license.html`、`license-cc0.html`、`copyright-facts.html`。JSON 核对结果为 `moe-audit.json`、`moe-details.json`、`idioms-details.json`、`moe-incorrect.json` 与 `dictionary-audit.json`。
