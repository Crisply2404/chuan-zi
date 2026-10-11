import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WordRules } from '../../shared/rules';
import { defaultSettings, type DictionaryData, type PromptCell } from '../../shared/types';
import data from '../../data/dictionary.json';
import { PromptView } from '../../src/PromptView';
import '../../src/styles.css';

const rules = new WordRules(data as DictionaryData);
const cases: Record<string, { cells: PromptCell[]; word: string }> = {
  initial: { cells: [{ initial: 'zh', tone: 1 }], word: '知识' },
  vowel: { cells: [{ final: 'i', tone: 1 }], word: '知识' },
  consonant: { cells: [{ initial: 'm', tone: 1 }], word: '姆妈' },
  sliding: { cells: [{ initial: 'j' }, { initial: 'b', tone: 4 }], word: '打击报复' },
};
const name = new URLSearchParams(location.search).get('case') || 'sliding';
const selected = cases[name];
if (!selected) throw new Error('没有指定的测试条件');
const prompt = { id: name, cells: selected.cells, answerCount: 1 };
if (!rules.match(selected.word, prompt, defaultSettings).valid) throw new Error('测试答案不符合真实词库与条件');

function Harness() {
  const [word, setWord] = useState('');
  const result = rules.match(word, prompt, defaultSettings);
  return <main style={{ width: 'min(660px, calc(100% - 40px))', margin: '80px auto' }}>
    <PromptView prompt={prompt} draft={word} maxLength={9} draftMatch={{ word, promptId: prompt.id, offset: result.offset ?? null, reading: result.reading }} />
    <label>测试答案<input aria-label="测试答案" value={word} onChange={event => setWord(event.target.value)} /></label>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Harness />);
