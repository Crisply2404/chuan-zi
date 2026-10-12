import type { DictionaryData, Reading, WordEntry } from './types';

export interface CompactDictionary {
  syllables: {syllable: string; initial: string; final: string; tone: number}[];
  readings: number[][];
  sources: string[][];
  words: [string, number[], number, number, number, number][];
  characters: DictionaryData['characters'];
  metadata: DictionaryData['metadata'];
}

export function compactDictionary(data: DictionaryData): CompactDictionary {
  const syllables: CompactDictionary['syllables'] = [];
  const syllableIds = new Map<string, number>();
  const readings: number[][] = [];
  const readingIds = new Map<string, number>();
  const sources: string[][] = [];
  const sourceIds = new Map<string, number>();
  const words = data.words.map(entry => {
    const ids = entry.readings.map(reading => {
      const sequence = reading.syllables.map((syllable, index) => {
        const key = JSON.stringify([syllable, reading.initials[index], reading.finals[index], reading.tones[index]]);
        if (!syllableIds.has(key)) {
          syllableIds.set(key, syllables.length);
          syllables.push({syllable, initial: reading.initials[index], final: reading.finals[index], tone: reading.tones[index]});
        }
        return syllableIds.get(key)!;
      });
      const key = JSON.stringify(sequence);
      if (!readingIds.has(key)) { readingIds.set(key, readings.length); readings.push(sequence); }
      return readingIds.get(key)!;
    });
    const sourceKey = JSON.stringify(entry.source);
    if (!sourceIds.has(sourceKey)) { sourceIds.set(sourceKey, sources.length); sources.push(entry.source); }
    return [entry.word, ids, Number(entry.idiom), entry.df, entry.frequency ?? 0, sourceIds.get(sourceKey)!] as CompactDictionary['words'][number];
  });
  return {syllables, readings, sources, words, characters: data.characters, metadata: data.metadata};
}

export function expandDictionary(data: CompactDictionary): DictionaryData {
  const readings: Reading[] = data.readings.map(sequence => {
    const values = sequence.map(id => data.syllables[id]);
    return {syllables: values.map(value => value.syllable), initials: values.map(value => value.initial), finals: values.map(value => value.final), tones: values.map(value => value.tone)};
  });
  const words: WordEntry[] = data.words.map(([word, ids, idiom, df, frequency, source]) => ({word, readings: ids.map(id => readings[id]), idiom: Boolean(idiom), df, frequency, source: data.sources[source]}));
  return {words, characters: data.characters, metadata: data.metadata};
}
