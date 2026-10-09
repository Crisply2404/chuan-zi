import { formatPinyin } from '../shared/pinyin';
import type { DraftMatch, Prompt } from '../shared/types';

export function PromptView({ prompt, compact = false, maxLength = prompt.cells.length, draft = '', draftMatch, feedback = false }: {
  prompt: Prompt; compact?: boolean; maxLength?: number; draft?: string; draftMatch?: DraftMatch; feedback?: boolean;
}) {
  const characters = [...draft];
  const offset = draftMatch?.promptId === prompt.id && draftMatch.offset !== null ? draftMatch.offset : 0;
  return <div className={`prompt ${compact ? 'prompt-compact' : ''}`} aria-label="当前提示">
    <div className="prompt-cells">
      {Array.from({length: maxLength}, (_, index) => {
        const promptIndex = index - offset;
        const cell = prompt.cells[promptIndex];
        const hidden = cell ? Object.keys(cell).length === 0 : false;
        const pinyin = cell && (cell.initial !== undefined || cell.final !== undefined || cell.tone !== undefined)
          ? formatPinyin(cell.initial, cell.final, cell.tone) : null;
        const character = characters[index];
        return <div className={`prompt-cell ${!cell ? 'prompt-outline' : ''} ${hidden ? 'prompt-hidden' : ''} ${feedback ? 'prompt-feedback' : ''}`} key={index} aria-label={`第 ${index + 1} 个位置`}>
          <span className="prompt-input-character">{character || ''}</span>
          {cell && !hidden && <span className="prompt-hint">{pinyin !== null && <span className={`prompt-pinyin ${pinyin.length > 6 ? 'prompt-pinyin-long' : ''}`}>{pinyin || '∅'}</span>}{cell.radical !== undefined && <span title="部首">{cell.radical}</span>}{cell.component !== undefined && <span title="字形部件">{cell.component}</span>}{cell.contains !== undefined && <span title="连续汉字">{cell.contains}</span>}</span>}
          {cell && hidden && <span className="prompt-star">*</span>}
        </div>;
      })}
    </div>
    <span className="prompt-count">可用答案 {prompt.answerCount.toLocaleString()}</span>
  </div>;
}
