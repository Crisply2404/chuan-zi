import { z } from 'zod';
import { conditionTypes } from './types';

const appearance = z.enum(['off', 'random', 'required']);
const conditionType = z.enum(conditionTypes);

export const settingsSchema = z.object({
  dictionary: z.enum(['idioms', 'words', 'all']),
  minLength: z.number().int().min(2).max(9),
  maxLength: z.number().int().min(2).max(9),
  promptLength: z.number().int().min(1).max(8),
  hiddenCount: z.number().int().min(0).max(7),
  appearance: z.object({initial: appearance, final: appearance, tone: appearance, radical: appearance, component: appearance, contains: appearance}).strict(),
  relations: z.array(z.object({ first: conditionType, second: conditionType, mode: z.enum(['free', 'same', 'different']) }).strict()).max(15),
  toneScope: z.enum(['one', 'some', 'all']),
  minAnswers: z.number().int().min(1).max(100000),
  maxAnswers: z.number().int().min(1).max(100000),
  startingLives: z.number().int().min(1).max(10),
  maxLives: z.number().int().min(1).max(10),
  timerMode: z.enum(['fixed', 'random']),
  initialSeconds: z.number().int().min(1).max(120),
  randomMinSeconds: z.number().int().min(1).max(120),
  randomMaxSeconds: z.number().int().min(1).max(120),
  minimumSeconds: z.number().int().min(1).max(60),
  bestOf: z.number().int().min(1).max(21),
  maxPlayers: z.number().int().min(2).max(16),
  bonusInitials: z.array(z.string().regex(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])$/)).min(1).max(23),
}).strict().superRefine((value, context) => {
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
});

export function validateSettings(input: unknown) {
  const result = settingsSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues.map(issue => issue.message).join('；'));
  return result.data;
}
