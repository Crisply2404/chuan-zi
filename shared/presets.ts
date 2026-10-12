import { defaultSettings, type ModeId, type RulePresetId, type Settings } from './types';

export const modeLabels: Record<ModeId, string> = {
  'initial-tone': '声母+音调',
  radical: '部首',
  character: '字',
  'tone-only': '只有音调',
  custom: '自定义',
};

export const modeColors: Record<ModeId, string> = {
  'initial-tone': '#9B3D35',
  radical: '#35635F',
  character: '#587044',
  'tone-only': '#4C5F7A',
  custom: '#735D73',
};

export const modeDescriptions: Record<ModeId, string> = {
  'initial-tone': '声母和声调共同提示',
  radical: '提示汉字部首',
  character: '提示答案中必须出现的汉字',
  'tone-only': '只提示每个位置的声调',
  custom: '自行组合全部条件与参数',
};

export function getModeSettings(id: Exclude<ModeId, 'custom'>): Settings {
  const base = structuredClone(defaultSettings);
  base.mode = id;
  if (id === 'initial-tone') {
    return {...base, dictionary: 'all', minLength: 2, promptLength: 2, hiddenCount: 0,
      appearance: {initial: 'required', final: 'off', tone: 'required', radical: 'off', component: 'off', contains: 'off'},
      relations: [], toneScope: 'one', minAnswers: 2, maxAnswers: 20000};
  }
  if (id === 'radical') {
    return {...base, dictionary: 'all', minLength: 2, promptLength: 2, hiddenCount: 0,
      appearance: {initial: 'off', final: 'off', tone: 'off', radical: 'required', component: 'off', contains: 'off'},
      relations: [], minAnswers: 2, maxAnswers: 20000};
  }
  if (id === 'character') {
    return {...base, dictionary: 'all', minLength: 2, promptLength: 1, hiddenCount: 0,
      appearance: {initial: 'off', final: 'off', tone: 'off', radical: 'off', component: 'off', contains: 'required'},
      relations: [], minAnswers: 2, maxAnswers: 20000};
  }
  return {...base, dictionary: 'all', minLength: 2, promptLength: 2, hiddenCount: 0,
    appearance: {initial: 'off', final: 'off', tone: 'required', radical: 'off', component: 'off', contains: 'off'},
    relations: [], toneScope: 'all', minAnswers: 2, maxAnswers: 20000};
}

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
      dictionary: 'all', minLength: 2, promptLength: 2, hiddenCount: 0,
      appearance: {initial: 'required', final: 'off', tone: 'off', radical: 'off', component: 'off', contains: 'off'},
      relations: [], toneScope: 'one', minAnswers: 2, maxAnswers: 20000,
      timerMode: 'fixed', initialSeconds: 10,
    };
  }
  if (id === 'hard') {
    return {
      ...base,
      dictionary: 'all', minLength: 2, maxLength: 9, promptLength: 2, hiddenCount: 1,
      appearance: {initial: 'required', final: 'required', tone: 'required', radical: 'off', component: 'off', contains: 'off'},
      relations: [{first: 'initial', second: 'final', mode: 'same'}], toneScope: 'all', minAnswers: 1, maxAnswers: 200,
      timerMode: 'fixed', initialSeconds: 10,
    };
  }
  return {
    ...base,
    dictionary: 'all', minLength: 2, maxLength: 9, promptLength: 2, hiddenCount: 0,
    appearance: {initial: 'random', final: 'off', tone: 'random', radical: 'random', component: 'off', contains: 'required'},
    relations: [], toneScope: 'one', minAnswers: 2, maxAnswers: 500,
    timerMode: 'fixed', initialSeconds: 10,
  };
}
