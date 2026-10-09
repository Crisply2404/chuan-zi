import { formatPinyin } from '../shared/pinyin';
import type { DraftMatch, Prompt, PromptCell, Reading } from '../shared/types';

function promptText(cell: PromptCell) {
  const parts = [cell.initial, cell.final, cell.tone === undefined ? undefined : formatPinyin(undefined, undefined, cell.tone), cell.radical, cell.component, cell.contains];
  if (parts.some(value => value !== undefined)) return parts.filter((value): value is string => value !== undefined).join(' ');
  if (cell.tone !== undefined) return formatPinyin(undefined, undefined, cell.tone);
  return '';
}

function PromptCellView({ cell, character, reading, position }: {
  cell: PromptCell; character?: string; reading?: Reading; position?: number;
}) {
  const hidden = Object.keys(cell).length === 0;
  const fullPinyin = reading && position !== undefined
    ? formatPinyin(reading.initials[position], reading.finals[position], reading.tones[position])
    : '';
  const source = promptText(cell);
  const completion = source && fullPinyin.startsWith(source) ? fullPinyin.slice(source.length) : fullPinyin;
  return <div className={`prompt-cell ${hidden ? 'prompt-hidden' : ''} ${character ? 'prompt-attached-cell' : ''}`} aria-label="提示位置">
    {hidden ? <span className="prompt-star">*</span> : character ? <>
      <span className="prompt-input-character prompt-supplement">{character}</span>
      <span className="prompt-pinyin"><span className="prompt-origin">{source}</span><span className="prompt-supplement">{completion}</span></span>
    </> : <span className="prompt-hint">{promptText(cell)}</span>}
  </div>;
}

export function PromptView({ prompt, compact = false, draft = '', draftMatch, feedback = false }: {
  prompt: Prompt; compact?: boolean; draft?: string; draftMatch?: DraftMatch; feedback?: boolean;
}) {
  const characters = [...draft];
  const match = draftMatch && draftMatch.promptId === prompt.id && draftMatch.word === draft && draftMatch.offset !== null && draftMatch.reading
    ? {offset: draftMatch.offset, reading: draftMatch.reading} : null;
  const offset = match?.offset ?? null;
  const attached = match !== null && match.offset + prompt.cells.length <= characters.length;
  const style = {
    '--prompt-offset': String(offset ?? 0),
    '--prompt-count': String(prompt.cells.length),
    '--answer-count': String(characters.length),
    '--prompt-shift': `${offset === null ? 0 : (offset + prompt.cells.length / 2 - characters.length / 2) * 69}px`,
  } as import('react').CSSProperties;
  return <div className={`prompt ${compact ? 'prompt-compact' : ''} ${feedback ? 'prompt-feedback' : ''}`} aria-label="当前提示">
    <div className={`prompt-layer ${attached ? 'prompt-layer-attached' : ''}`} style={style}>
      <div className="prompt-cells">
        {prompt.cells.map((cell, index) => <PromptCellView key={index} cell={cell}
          character={attached ? characters[match!.offset + index] : undefined}
          reading={attached ? match!.reading : undefined} position={attached ? index : undefined} />)}
      </div>
    </div>
    {characters.length > 0 && <div className="answer-cells" aria-label="答案字格">
      {characters.map((character, index) => {
        const inWindow = attached && index >= match!.offset && index < match!.offset + prompt.cells.length;
        return <div className={`answer-cell ${inWindow ? 'answer-cell-attached' : 'answer-cell-outline'}`} key={`${character}:${index}`}>
          <span className="answer-character">{character}</span>
        </div>;
      })}
    </div>}
    <span className="prompt-count">可用答案 {prompt.answerCount.toLocaleString()}</span>
  </div>;
}
