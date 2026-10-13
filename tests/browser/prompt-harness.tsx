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
  tone2: { cells: [{ final: 'iu', tone: 2 }], word: '牛奶' },
  tone3: { cells: [{ final: 'ü', tone: 3 }], word: '女儿' },
  long: { cells: [{ final: 'uang', tone: 1 }], word: '窗户' },
  hidden: { cells: [{ initial: 'sh' }, {}, { initial: 'b' }], word: '生生不息' },
  zeroInitial: { cells: [{ initial: '' }], word: '安心' },
  radical: { cells: [{ radical: '冫' }], word: '冰凉' },
  combined: { cells: [{ radical: '冫', initial: 'b' }], word: '冰凉' },
  neutral: { cells: [{initial: 'd'}], word: '使得' },
  all: {cells: [{initial: 'zh', final: 'ua', tone: 1, radical: '扌', component: '爪', contains: '抓'}, {initial: 'b', final: 'ing', tone: 3, radical: '饣', component: '并', contains: '饼'}], word: '抓饼'},
};
const name = new URLSearchParams(location.search).get('case') || 'sliding';
const selected = cases[name];
if (!selected) throw new Error('没有指定的测试条件');
const prompt = { id: name, cells: selected.cells, answerCount: 1 };
if (!rules.match(selected.word, prompt, defaultSettings).valid) throw new Error('测试答案不符合真实词库与条件');

function Harness() {
  const [word, setWord] = useState('');
  const [phase, setPhase] = useState<'editing' | 'merging' | 'returning'>('editing');
  const result = rules.match(word, prompt, defaultSettings);
  const offset = result.offset ?? null;
  const reading = result.reading && offset !== null ? {
    syllables: result.reading.syllables.slice(offset, offset + prompt.cells.length),
    initials: result.reading.initials.slice(offset, offset + prompt.cells.length),
    finals: result.reading.finals.slice(offset, offset + prompt.cells.length),
    tones: result.reading.tones.slice(offset, offset + prompt.cells.length),
  } : undefined;
  return <main style={{ width: 'min(660px, calc(100% - 40px))', margin: '80px auto' }}>
    <PromptView prompt={prompt} draft={phase === 'returning' ? '' : word} maxLength={9} draftMatch={{ word, promptId: prompt.id, offset, reading }} submitting={phase === 'merging'} onCombined={() => setPhase('returning')} />
    <label>测试答案<input aria-label="测试答案" value={word} onChange={event => setWord(event.target.value)} /></label>
    <button type="button" disabled={!result.valid} onClick={() => setPhase('merging')}>提交合法答案</button>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Harness />);
