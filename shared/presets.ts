import { defaultSettings, type RulePresetId, type Settings } from './types';

export const presetLabels: Record<Exclude<RulePresetId, 'custom'>, string> = {
  simple: '简单模式',
  hard: '困难模式',
  featured: '特色模式',
};

export const presetDescriptions: Record<Exclude<RulePresetId, 'custom'>, string> = {
  simple: '只提示声母，适合熟悉回合节奏',
  hard: '声母、韵母和声调交叉提示',
  featured: '连续汉字结合部首与随机声调',
};

export function getPresetSettings(id: Exclude<RulePresetId, 'custom'>): Settings {
  const base = structuredClone(defaultSettings);
  if (id === 'simple') {
    return {
      ...base,
      dictionary: 'idioms', promptLength: 2, hiddenCount: 0,
      appearance: {initial: 'required', final: 'off', tone: 'off', radical: 'off', component: 'off', contains: 'off'},
      relations: [], toneScope: 'one', minAnswers: 2, maxAnswers: 20000,
      timerMode: 'fixed', initialSeconds: 20,
    };
  }
  if (id === 'hard') {
    return {
      ...base,
      dictionary: 'all', minLength: 3, maxLength: 8, promptLength: 3, hiddenCount: 1,
      appearance: {initial: 'required', final: 'required', tone: 'required', radical: 'off', component: 'off', contains: 'off'},
      relations: [{first: 'initial', second: 'final', mode: 'same'}], toneScope: 'all', minAnswers: 1, maxAnswers: 200,
      timerMode: 'random', randomMinSeconds: 10, randomMaxSeconds: 24, minimumSeconds: 5,
    };
  }
  return {
    ...base,
    dictionary: 'idioms', minLength: 4, maxLength: 8, promptLength: 2, hiddenCount: 0,
    appearance: {initial: 'random', final: 'off', tone: 'random', radical: 'random', component: 'off', contains: 'required'},
    relations: [], toneScope: 'one', minAnswers: 2, maxAnswers: 500,
    timerMode: 'fixed', initialSeconds: 18, minimumSeconds: 5,
  };
}
