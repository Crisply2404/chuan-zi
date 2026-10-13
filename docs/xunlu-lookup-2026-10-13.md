# 寻路收录核查

日期：2026-10-13，Asia/Shanghai。Skill：diagnosing-bugs。

当前 data/dictionary.json 的 89,431 个词语没有寻路，原始 CC-CEDICT 2026-10-12 JSON 同样没有该词。规则公开接口 WordRules.match 与 WordRules.draft 首先要求完整词语收录，因此只有 x-l 声母的提示也会返回词库未收录。

固定版本 jieba 词典第 115,039 行记录“寻路 9 v”。目前构建只从 CC-CEDICT 建立完整词语与读音，jieba 用于已收录词语的常见程度参考；因此此项没有进入游戏集合。来源记录见 data/sources.json 与 data/README.md。

原始 CC-CEDICT 分别有寻 xun2 与路 lu4。这些汉字发音符合声母 x-l；判断完整词语是否进入游戏集合仍依词语级资料。

本轮没有改变有效答案集合。用户提出的是收录与匹配原因问题。
