import { formatPinyin } from '../shared/pinyin';
import type { Prompt } from '../shared/types';

export function PromptView({ prompt, compact = false }: { prompt: Prompt; compact?: boolean }) {
  return <div className={`prompt ${compact ? 'prompt-compact' : ''}`} aria-label="当前提示">
    <div className="prompt-cells">
      {prompt.cells.map((cell, index) => {
        const hidden = Object.keys(cell).length === 0;
        const pinyin = cell.initial !== undefined || cell.final !== undefined || cell.tone !== undefined
          ? formatPinyin(cell.initial, cell.final, cell.tone) : null;
        return <div className={`prompt-cell ${hidden ? 'prompt-hidden' : ''} ${[pinyin, cell.radical, cell.component, cell.contains].filter(item => item !== null && item !== undefined).length > 2 ? 'prompt-cell-multiple' : ''}`} key={index} aria-label={`第 ${index + 1} 个位置`}>
          {hidden ? <span className="prompt-star">*</span> : <>
            {pinyin !== null && <span className={`prompt-pinyin ${pinyin.length > 6 ? 'prompt-pinyin-long' : ''}`}>{pinyin || '∅'}</span>}
            {cell.radical !== undefined && <span className="prompt-character" title="部首">{cell.radical}</span>}
            {cell.component !== undefined && <span className="prompt-character" title="字形部件">{cell.component}</span>}
            {cell.contains !== undefined && <span className="prompt-character" title="连续汉字">{cell.contains}</span>}
          </>}
        </div>;
      })}
    </div>
    <span className="prompt-count">可用答案 {prompt.answerCount.toLocaleString()}</span>
  </div>;
}
