import type { CSSProperties, ReactNode } from 'react';
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
  const initialLength = cell.initial?.length ?? 0;
  const readingInitialLength = reading && position !== undefined ? reading.initials[position].length : 0;
  let letterIndex = 0;
  let previousOriginal = false;
  const pinyinParts = [...fullPinyin.normalize('NFD')].map((letter, index) => {
    const mark = /\p{Mark}/u.test(letter);
    const tone = /[\u0304\u0301\u030c\u0300]/u.test(letter);
    const original = tone ? cell.tone !== undefined : mark ? previousOriginal : letterIndex < readingInitialLength ? letterIndex < initialLength : cell.final !== undefined;
    if (!mark) { letterIndex += 1; previousOriginal = original; }
    return <span className={original ? 'prompt-origin' : 'prompt-supplement'} key={index}>{letter}</span>;
  });
  return <div className={`prompt-cell ${hidden ? 'prompt-hidden' : ''} ${character ? 'prompt-attached-cell' : ''}`} aria-label="提示位置">
    {character ? <>
      {(cell.radical !== undefined || cell.component !== undefined) && <span className="prompt-attached-hint prompt-origin">{[cell.radical, cell.component].filter(value => value !== undefined).join(' ')}</span>}
      <span className={`prompt-input-character ${cell.contains === character ? 'prompt-origin' : 'prompt-supplement'}`}>{character}</span>
      <span className={`prompt-pinyin ${fullPinyin.length > 6 ? 'prompt-pinyin-long' : ''}`}>{pinyinParts}</span>
    </> : hidden ? <span className="prompt-star">*</span> : <span className="prompt-hint">{promptText(cell)}</span>}
  </div>;
}

export function PromptView({ prompt, compact = false, draft = '', draftMatch, feedback = false, maxLength, cursor = 0, focused = false, answerInput, onSelectCharacter }: {
  prompt: Prompt; compact?: boolean; draft?: string; draftMatch?: DraftMatch; feedback?: boolean;
  maxLength?: number; cursor?: number; focused?: boolean; answerInput?: ReactNode; onSelectCharacter?: (index: number) => void;
}) {
  const characters = [...draft];
  const match = draftMatch && draftMatch.promptId === prompt.id && draftMatch.word === draft && draftMatch.offset !== null && draftMatch.reading
    ? {offset: draftMatch.offset, reading: draftMatch.reading} : null;
  const attached = match !== null && match.offset + prompt.cells.length <= characters.length;
  const answerCount = maxLength === undefined ? characters.length : Math.min(characters.length + 1, maxLength);
  const style = {
    '--slot-count': Math.max(prompt.cells.length, answerCount),
    '--prompt-shift': attached ? match.offset + prompt.cells.length / 2 - answerCount / 2 : 0,
    '--input-index': Math.min(cursor, Math.max(0, answerCount - 1)),
  } as CSSProperties;
  return <div className={`prompt ${compact ? 'prompt-compact' : ''} ${answerCount > 0 ? 'prompt-with-answer' : ''} ${feedback ? 'prompt-feedback' : ''}`} style={style} aria-label="当前提示">
    <div className={`prompt-layer ${attached ? 'prompt-layer-attached' : ''}`}>
      <div className="prompt-cells">
        {prompt.cells.map((cell, index) => <PromptCellView key={index} cell={cell}
          character={attached ? characters[match!.offset + index] : undefined}
          reading={attached ? match!.reading : undefined} position={attached ? index : undefined} />)}
      </div>
    </div>
    {answerCount > 0 && <div className="answer-editor">
      <div className="answer-cells" aria-label="答案字格">
      {Array.from({ length: answerCount }, (_, index) => {
        const character = characters[index];
        const inWindow = attached && index >= match!.offset && index < match!.offset + prompt.cells.length;
        return <div className={`answer-cell ${inWindow ? 'answer-cell-attached' : 'answer-cell-outline'} ${focused && (cursor === index || cursor === answerCount && index === cursor - 1) ? 'answer-cell-caret' : ''} ${!character ? 'answer-cell-empty' : ''}`} key={index}
          onPointerDown={event => { event.preventDefault(); onSelectCharacter?.(Math.min(index + 1, characters.length)); }}>
          {character && <span className="answer-character">{character}</span>}
        </div>;
      })}
      </div>
      {answerInput && <div className="answer-input-anchor" onPointerDown={event => {
        event.preventDefault(); onSelectCharacter?.(Math.min(cursor + 1, characters.length));
      }}>{answerInput}</div>}
    </div>}
    {compact && <span className="prompt-count">可用答案 {prompt.answerCount.toLocaleString()}</span>}
  </div>;
}
