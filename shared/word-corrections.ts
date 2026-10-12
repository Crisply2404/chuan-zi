import { z } from 'zod';
import source from '../data/common-mistakes.json' with {type: 'json'};

const word = z.string().min(2).regex(/^\p{Script=Han}+$/u);
const data = z.object({
  version: z.string(),
  license: z.literal('CC0-1.0'),
  entries: z.array(z.object({
    incorrect: word,
    correct: word,
    sources: z.array(z.object({title: z.string().min(1), url: z.string().url()})).min(1),
  })),
}).parse(source);

const corrections = new Map(data.entries.map(entry => [entry.incorrect, entry.correct]));
if (corrections.size !== data.entries.length || data.entries.some(entry => entry.incorrect === entry.correct)) {
  throw new Error('易误写词语资料包含重复或相同词形');
}

export function correctionFor(value: string): string | undefined {
  return corrections.get(value);
}

export function correctionMessage(value: string): string | undefined {
  const correction = correctionFor(value);
  return correction ? `这个词应写作「${correction}」` : undefined;
}
