import { conditionTypes, type ConditionType, type DictionaryData, type MatchResult, type Prompt, type Settings, type WordEntry } from './types';
import { validateSettings } from './settings';
import { correctionFor, correctionMessage } from './word-corrections';

export class RuleError extends Error {}

export const commonRadicals = new Set(['氵', '扌', '忄', '艹', '宀', '讠', '纟', '钅', '灬', '辶', '阝', '犭', '饣', '衤', '礻', '冫', '疒', '亻', '刂', '囗', '⺮']);

export class WordRules {
  private readonly entries: Map<string, WordEntry>;
  private readonly index = new Map<string, Uint32Array>();

  constructor(public readonly data: DictionaryData) {
    this.entries = new Map(data.words.map(entry => [entry.word, entry]));
    if (!data.words.length || this.entries.size !== data.words.length) throw new Error('词库为空或包含重复词语');
    for (const [letter, character] of Object.entries(data.characters)) {
      if (!Object.keys(character.strokeParts ?? {}).length) continue;
      if (!Number.isInteger(character.strokeCount) || character.strokeCount! <= 0) throw new Error(`汉字笔画数量无效：${letter}`);
      if (Object.values(character.strokeParts!).some(indices => indices.some(index => index < 0 || index >= character.strokeCount!))) throw new Error(`汉字笔画索引无效：${letter}`);
    }
    const counts = new Map<string, number>();
    for (const entry of data.words) {
      const length = [...entry.word].length;
      if (!entry.readings.length || entry.readings.some(reading => [reading.syllables, reading.initials, reading.finals, reading.tones].some(values => values.length !== length))) {
        throw new Error(`词语完整读音字段不一致：${entry.word}`);
      }
      for (const key of this.entryKeys(entry)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [key, count] of counts) { this.index.set(key, new Uint32Array(count)); counts.set(key, 0); }
    data.words.forEach((entry, ordinal) => {
      for (const key of this.entryKeys(entry)) {
        const position = counts.get(key)!;
        this.index.get(key)![position] = ordinal;
        counts.set(key, position + 1);
      }
    });
  }

  private entryKeys(entry: WordEntry): Set<string> {
    const keys = new Set<string>();
    const letters = [...entry.word];
    for (const reading of entry.readings) for (let position = 0; position < letters.length; position++) {
      keys.add(`initial:${reading.initials[position]}`);
      keys.add(`final:${reading.finals[position]}`);
      keys.add(`tone:${reading.tones[position]}`);
    }
    for (const letter of letters) {
      keys.add(`contains:${letter}`);
      for (const radical of this.radicalsFor(letter)) keys.add(`radical:${radical}`);
      for (const component of Object.keys(this.data.characters[letter]?.strokeParts ?? {})) keys.add(`component:${component}`);
    }
    return keys;
  }

  private indexed(pool: Uint32Array, ordinal: number): boolean {
    let first = 0;
    let last = pool.length - 1;
    while (first <= last) {
      const middle = (first + last) >>> 1;
      if (pool[middle] === ordinal) return true;
      if (pool[middle] < ordinal) first = middle + 1;
      else last = middle - 1;
    }
    return false;
  }

  match(word: string, prompt: Prompt, settings: Settings, used = new Set<string>()): MatchResult {
    const correction = correctionMessage(word);
    if (correction) return { valid: false, reason: correction };
    const entry = this.entries.get(word);
    if (!entry) return { valid: false, reason: '词库没有收录这个答案' };
    if (used.has(word)) return { valid: false, reason: '本局已经使用这个答案' };
    if (!this.allowed(entry, settings)) return { valid: false, reason: '答案不符合词库或长度设置' };
    if (!this.relationsHold(prompt, settings)) return { valid: false, reason: '提示没有满足条件关系' };
    return this.matchEntry(entry, prompt) ?? { valid: false, reason: '答案没有满足当前提示' };
  }

  draft(word: string, prompt: Prompt, settings: Settings, used = new Set<string>()): MatchResult {
    if (!word) return { valid: false };
    const correction = correctionMessage(word);
    if (correction) return { valid: false, reason: correction };
    const exact = this.entries.get(word);
    if (!exact) return { valid: false, reason: '词库没有收录这个答案' };
    if (used.has(word)) return { valid: false, reason: '本局已经使用这个答案' };
    if (!this.allowed(exact, settings)) return { valid: false, reason: '答案不符合词库或长度设置' };
    return this.matchEntry(exact, prompt) ?? { valid: false, reason: '答案没有满足当前提示' };
  }

  private allowed(entry: WordEntry, settings: Settings): boolean {
    const length = [...entry.word].length;
    return !correctionFor(entry.word) && length >= settings.minLength && length <= settings.maxLength && (settings.dictionary === 'all' || (settings.dictionary === 'idioms' ? entry.idiom : !entry.idiom));
  }

  private radicalsFor(letter: string): string[] {
    const character = this.data.characters[letter];
    return Object.keys(character?.strokeParts ?? {}).filter(radical => {
      const length = character!.strokeParts![radical].length;
      return commonRadicals.has(radical) && letter !== radical && length > 0 && length < character!.strokeCount!;
    });
  }

  private matchEntry(entry: WordEntry, prompt: Prompt): MatchResult | undefined {
    const letters = [...entry.word];
    for (const reading of entry.readings) {
      for (let offset = 0; offset <= letters.length - prompt.cells.length; offset++) {
        if (prompt.cells.every((cell, index) => {
          const position = offset + index;
          const character = this.data.characters[letters[position]];
          return (cell.initial === undefined || reading.initials[position] === cell.initial)
            && (cell.final === undefined || reading.finals[position] === cell.final)
            && (cell.tone === undefined || reading.tones[position] === cell.tone)
            && (cell.radical === undefined || this.radicalsFor(letters[position]).includes(cell.radical))
            && (cell.component === undefined || Boolean(character?.strokeParts?.[cell.component]?.length))
            && (cell.contains === undefined || letters.slice(position, position + [...cell.contains].length).join('') === cell.contains);
        })) return { valid: true, reading, offset };
      }
    }
    return undefined;
  }

  private relationsHold(prompt: Prompt, settings: Settings): boolean {
    const positions = (field: ConditionType): Set<number> => {
      const result = new Set<number>();
      prompt.cells.forEach((cell, index) => {
        if (cell[field] !== undefined) {
          const width = field === 'contains' ? [...cell.contains!].length : 1;
          for (let shift = 0; shift < width; shift++) result.add(index + shift);
        }
      });
      return result;
    };
    return settings.relations.every(relation => {
      const first = positions(relation.first);
      const second = positions(relation.second);
      if (!first.size || !second.size || relation.mode === 'free') return true;
      if (relation.mode === 'same') return first.size === second.size && [...first].every(index => second.has(index));
      return [...first].every(index => !second.has(index));
    });
  }

  generate(settings: Settings, used = new Set<string>()): Prompt {
    validateSettings(settings);
    if (settings.mode === 'radical') settings = {...settings, promptLength: Math.random() < .5 ? 1 : 2, hiddenCount: 0};
    const candidates = this.data.words.filter(entry => this.allowed(entry, settings) && !used.has(entry.word));
    if (!candidates.length) throw new RuleError('当前词库没有符合设置的答案');
    const visibleCount = settings.promptLength - settings.hiddenCount;
    const required = conditionTypes.filter(type => settings.appearance[type] === 'required');
    if (!this.assignMasks(required, Array.from({ length: visibleCount }, (_, index) => index), settings, false)) {
      throw new RuleError('提示位置数量无法满足当前条件关系与声调范围');
    }
    const active = conditionTypes.filter(type => settings.appearance[type] !== 'off');
    const possibleSelections = Array.from({ length: (1 << active.length) - 1 }, (_, index) => active.filter((_, bit) => (index + 1) & (1 << bit)))
      .filter(selected => required.every(type => selected.includes(type)) && this.assignMasks(selected, Array.from({ length: visibleCount }, (_, index) => index), settings));
    if (!possibleSelections.length) throw new RuleError('提示位置数量无法满足当前条件关系与声调范围');
    for (let attempt = 0; attempt < 500; attempt++) {
      const candidate = candidates[Math.floor(Math.random() * candidates.length)];
      const reading = candidate.readings[Math.floor(Math.random() * candidate.readings.length)];
      const length = [...candidate.word].length;
      const span = settings.promptLength;
      const offset = Math.floor(Math.random() * (length - span + 1));
      const cells = Array.from({ length: span }, () => ({} as Prompt['cells'][number]));
      const selected = possibleSelections[Math.floor(Math.random() * possibleSelections.length)];
      const positions = this.shuffle(Array.from({ length: span }, (_, index) => index)).slice(0, visibleCount);
      const assignments = this.assignMasks(selected, positions, settings);
      if (!assignments) continue;
      let complete = true;
      for (const [type, mask] of assignments) {
        for (const position of mask) {
          const absolute = offset + position;
          const cell = cells[position];
          const character = this.data.characters[[...candidate.word][absolute]];
          if (type === 'initial') cell.initial = reading.initials[absolute];
          if (type === 'final') cell.final = reading.finals[absolute];
          if (type === 'tone') cell.tone = reading.tones[absolute];
          if (type === 'radical') {
            const radicals = this.radicalsFor([...candidate.word][absolute]);
            if (!radicals.length) complete = false;
            else cell.radical = radicals[Math.floor(Math.random() * radicals.length)];
          }
          if (type === 'component') {
            const drawable = Object.keys(character?.strokeParts ?? {});
            if (!drawable.length) complete = false;
            else cell.component = drawable[Math.floor(Math.random() * drawable.length)];
          }
          if (type === 'contains') cell.contains = [...candidate.word][absolute];
        }
      }
      if (!complete || cells.filter(cell => !Object.keys(cell).length).length !== settings.hiddenCount) continue;
      const proposed = { id: '', cells, answerCount: 0 };
      const answerCount = this.examples(proposed, settings, used, Infinity).length;
      if (answerCount >= settings.minAnswers && answerCount <= settings.maxAnswers) {
        return { id: globalThis.crypto.randomUUID(), cells, answerCount };
      }
    }
    throw new RuleError('无法根据当前设置生成符合答案数量范围的提示');
  }

  examples(prompt: Prompt, settings: Settings, used = new Set<string>(), limit = 5): WordEntry[] {
    if (limit <= 0) return [];
    if (!this.relationsHold(prompt, settings)) return [];
    const pools: Uint32Array[] = [];
    for (const cell of prompt.cells) {
      for (const type of conditionTypes) {
        const value = cell[type];
        if (value === undefined) continue;
        const tokens = type === 'contains' ? [...String(value)] : [value];
        for (const token of tokens) {
          const pool = this.index.get(`${type}:${token}`);
          if (!pool) return [];
          pools.push(pool);
        }
      }
    }
    pools.sort((first, second) => first.length - second.length);
    const source = pools.length ? pools[0] : this.data.words.keys();
    const result: WordEntry[] = [];
    for (const ordinal of source) {
      const entry = this.data.words[ordinal];
      if (!used.has(entry.word) && this.allowed(entry, settings) && pools.every(pool => this.indexed(pool, ordinal)) && this.matchEntry(entry, prompt)) result.push(entry);
      if (result.length >= limit) break;
    }
    return result;
  }

  cpuAnswer(prompt: Prompt, settings: Settings, used = new Set<string>()): WordEntry | undefined {
    return this.examples(prompt, settings, used, Infinity).sort((first, second) =>
      (second.frequency ?? 0) - (first.frequency ?? 0) || second.df - first.df || first.word.length - second.word.length)[0];
  }

  private shuffle<T>(values: T[]): T[] {
    for (let index = values.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [values[index], values[swap]] = [values[swap], values[index]];
    }
    return values;
  }

  private assignMasks(selected: ConditionType[], positions: number[], settings: Settings, requireCoverage = true): Map<ConditionType, number[]> | undefined {
    if (!selected.length) return new Map();
    const groups: ConditionType[][] = selected.map(type => [type]);
    for (const relation of settings.relations) {
      if (relation.mode !== 'same') continue;
      const first = groups.find(group => group.includes(relation.first));
      const second = groups.find(group => group.includes(relation.second));
      if (first && second && first !== second) {
        first.push(...second);
        groups.splice(groups.indexOf(second), 1);
      }
    }
    const differs = (first: ConditionType[], second: ConditionType[]) => settings.relations.some(relation => relation.mode === 'different'
      && ((first.includes(relation.first) && second.includes(relation.second)) || (first.includes(relation.second) && second.includes(relation.first))));
    if (groups.some(group => differs(group, group))) return undefined;
    const masks = Array.from({ length: (1 << positions.length) - 1 }, (_, index) => positions.filter((_, bit) => (index + 1) & (1 << bit)));
    const assignments = new Map<ConditionType, number[]>();
    const visit = (index: number): boolean => {
      if (index === groups.length) return !requireCoverage || positions.every(position => [...assignments.values()].some(mask => mask.includes(position)));
      const group = groups[index];
      const toneCount = settings.toneScope === 'all' ? positions.length : settings.toneScope === 'one' ? 1 : Math.min(positions.length, Math.max(2, Math.ceil(positions.length / 2)));
      const possibilities = this.shuffle(masks.filter(mask => !group.includes('tone') || mask.length === toneCount));
      possibilities.sort((first, second) => {
        const preferred = group.some(type => type === 'initial' || type === 'final');
        return preferred ? second.length - first.length : first.length - second.length;
      });
      for (const mask of possibilities) {
        const conflict = groups.slice(0, index).some(previous => differs(group, previous) && assignments.get(previous[0])!.some(position => mask.includes(position)));
        if (conflict) continue;
        for (const type of group) assignments.set(type, mask);
        if (visit(index + 1)) return true;
        for (const type of group) assignments.delete(type);
      }
      return false;
    };
    return visit(0) ? assignments : undefined;
  }
}
