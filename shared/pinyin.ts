import { getToneNumber, numberToMark, removeTone } from 'pinyin-utils';

const initials = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'w', 'y'];

export interface PinyinParts {
  syllable: string;
  initial: string;
  final: string;
  tone: number;
}

export function splitPinyin(value: string): PinyinParts {
  const normalized = value.toLowerCase().replace(/u:/g, 'ü').replace(/v/g, 'ü');
  const syllable = removeTone(normalized);
  const initial = initials.find(item => syllable.startsWith(item)) ?? '';
  return { syllable, initial, final: syllable.slice(initial.length), tone: getToneNumber(normalized) || 5 };
}

export function formatPinyin(initial?: string, final?: string, tone?: number): string {
  const body = `${initial ?? ''}${final ?? ''}`;
  if (!body) return tone ? ['', 'ˉ', 'ˊ', 'ˇ', 'ˋ', '·'][tone] : '';
  if (tone && !final) return `${body}${['', 'ˉ', 'ˊ', 'ˇ', 'ˋ', '·'][tone]}`;
  return tone ? numberToMark(`${body}${tone}`) : body;
}

export function normalizePinyin(value: string): string {
  return removeTone(value.toLowerCase().replace(/u:/g, 'ü').replace(/v/g, 'ü'));
}
