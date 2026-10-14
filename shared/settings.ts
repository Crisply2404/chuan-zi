import { z } from 'zod';
import { conditionTypes, modeIds } from './types';
import {slotHasCondition} from './prompt-slots';
import {bonusCandidates, resolveBonusType} from './bonuses';
import {bonusFinalCandidates, bonusRadicalCandidates} from './bonus-candidates';

const appearance = z.enum(['off', 'random', 'required']);
const conditionType = z.enum(conditionTypes);

export const settingsSchema = z.object({
  mode: z.enum(modeIds),
  dictionary: z.enum(['idioms', 'words', 'all']),
  minLength: z.number().int().min(2).max(9),
  maxLength: z.number().int().min(2).max(9),
  promptLength: z.number().int().min(1).max(9),
  hiddenCount: z.number().int().min(0).max(8),
  appearance: z.object({initial: appearance, final: appearance, tone: appearance, radical: appearance, component: appearance, contains: appearance}).strict(),
  relations: z.array(z.object({ first: conditionType, second: conditionType, mode: z.enum(['free', 'same', 'different']) }).strict()).max(15),
  toneScope: z.enum(['one', 'some', 'all']),
  promptSlots: z.array(z.object({initial: z.enum(['off', 'required', 'absent']), final: z.enum(['off', 'required', 'absent']),
    tone: z.boolean(), radical: z.boolean(), component: z.boolean(), contains: z.boolean()}).strict()).min(1).max(9).optional(),
  minAnswers: z.number().int().min(1).max(100000),
  maxAnswers: z.number().int().min(1).max(100000),
  startingLives: z.number().int().min(1).max(10),
  maxLives: z.number().int().min(1).max(10),
  timerMode: z.enum(['fixed', 'random']),
  initialSeconds: z.number().int().min(1).max(120),
  randomMinSeconds: z.number().int().min(1).max(120),
  randomMaxSeconds: z.number().int().min(1).max(120),
  bestOf: z.number().int().min(1).max(21),
  maxPlayers: z.number().int().min(2).max(16),
  bonusInitials: z.array(z.string().regex(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])$/)).max(23),
  bonusEnabled: z.boolean().optional(),
  bonusType: z.enum(['auto', 'initial', 'final', 'radical']).optional(),
  bonusFinals: z.array(z.string().refine(value => bonusFinalCandidates.includes(value))).max(bonusFinalCandidates.length).optional(),
  bonusRadicals: z.array(z.string().refine(value => bonusRadicalCandidates.includes(value))).max(bonusRadicalCandidates.length).optional(),
}).strict().transform(value => value.dictionary === 'idioms' ? {...value, minLength: 4, maxLength: 4} : value).superRefine((value, context) => {
  const invalid = (message: string) => context.addIssue({code: z.ZodIssueCode.custom, message});
  if (value.minLength > value.maxLength) invalid('最短答案长度超过最长答案长度');
  if (value.promptLength > value.minLength) invalid('提示长度不能超过最短答案长度');
  if (value.hiddenCount >= value.promptLength) invalid('至少保留一个提示位置');
  if (value.minAnswers > value.maxAnswers) invalid('答案数量下限超过上限');
  if (value.startingLives > value.maxLives) invalid('初始生命超过生命上限');
  if (value.randomMinSeconds > value.randomMaxSeconds) invalid('随机时间下限超过上限');
  if (value.bestOf % 2 === 0) invalid('比赛局数需要使用奇数');
  if (Object.values(value.appearance).every(mode => mode === 'off')) invalid('至少开启一种条件');
  const pairs = new Set<string>();
  for (const relation of value.relations) {
    const key = [relation.first, relation.second].sort().join(':');
    if (relation.first === relation.second || pairs.has(key)) invalid('条件关系重复');
    pairs.add(key);
  }
  if (new Set(value.bonusInitials).size !== value.bonusInitials.length) invalid('奖励声母不能重复');
  for (const values of [value.bonusFinals, value.bonusRadicals]) if (values && new Set(values).size !== values.length) invalid('奖励候选不能重复');
  if (resolveBonusType(value) && bonusCandidates(value).length === 0) invalid('启用奖励时至少选择一个候选');
  if (value.promptSlots) {
    if (value.mode !== 'custom') invalid('逐格条件用于自定义模式');
    if (value.promptSlots.length !== value.promptLength) invalid('提示格数量与规则不一致');
    if (value.promptSlots.filter(slot => !slotHasCondition(slot)).length !== value.hiddenCount) invalid('隐藏格数量与规则不一致');
    if (value.promptSlots.every(slot => !slotHasCondition(slot))) invalid('至少给一个提示格选择条件');
  }
});

export function validateSettings(input: unknown) {
  const result = settingsSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues.map(issue => issue.message).join('；'));
  return result.data;
}
