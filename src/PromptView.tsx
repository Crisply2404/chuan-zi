import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatPinyin } from '../shared/pinyin';
import type { DraftMatch, Prompt, PromptCell, Reading } from '../shared/types';

function ToneMark({ tone }: { tone: number }) {
  const paths = ['', 'M5 12H27', 'M7 20L25 6', 'M5 7L16 21L27 7', 'M7 6L25 20'];
  return <svg className="prompt-tone" viewBox="0 0 32 28" role="img" aria-label={formatPinyin(undefined, undefined, tone)}>
    {tone === 5 ? <circle cx="16" cy="14" r="2.5" fill="currentColor" /> : <path d={paths[tone]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>;
}

function toneLetterIndex(pinyin: string): number {
  const letters = [...pinyin.normalize('NFD')];
  const markIndex = letters.findIndex(letter => /[\u0304\u0301\u030c\u0300]/u.test(letter));
  return markIndex < 0 ? -1 : letters.slice(0, markIndex).filter(letter => !/\p{Mark}/u.test(letter)).length - 1;
}

function displayPinyin(value: string, start: number, toneIndex: number): string {
  return [...value].map((letter, index) => {
    return start + index === toneIndex && letter.toLowerCase() === 'i' ? 'ı' : letter;
  }).join('');
}

function PromptCellView({ cell, character, reading, position, cellIndex }: {
  cell: PromptCell; character?: string; reading?: Reading; position?: number; cellIndex: number;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<Record<string, CSSProperties>>({});
  const hidden = Object.keys(cell).length === 0;
  const initial = reading && position !== undefined ? reading.initials[position] : cell.initial ?? '';
  const final = reading && position !== undefined ? reading.finals[position] : cell.final ?? '';
  const tone = reading && position !== undefined ? reading.tones[position] : cell.tone;
  const fullPinyin = reading && position !== undefined
    ? formatPinyin(reading.initials[position], reading.finals[position], reading.tones[position])
    : '';
  const toneIndex = toneLetterIndex(fullPinyin);
  const hintToneIndex = cell.final !== undefined ? toneLetterIndex(formatPinyin(cell.initial, cell.final, cell.tone)) : -1;
  const displayToneIndex = reading && position !== undefined ? toneIndex : hintToneIndex;
  const displayInitial = displayPinyin(initial, 0, displayToneIndex);
  const displayFinal = displayPinyin(final, initial.length, displayToneIndex);
  const parts = [
    { field: 'initial', content: displayInitial, original: cell.initial !== undefined },
    { field: 'final', content: displayFinal, original: cell.final !== undefined },
    { field: 'tone', content: tone !== undefined ? <ToneMark tone={tone} /> : null, original: cell.tone !== undefined },
    { field: 'radical', content: cell.radical, original: true },
    { field: 'component', content: cell.component, original: true },
    { field: 'character', content: cell.contains ?? character, original: cell.contains !== undefined },
  ].filter(part => part.content !== undefined && part.content !== null && part.content !== '');

  useLayoutEffect(() => {
    const root = element.current!;
    const measure = () => {
      const bounds = root.getBoundingClientRect();
      const next: Record<string, CSSProperties> = {};
      for (const part of root.querySelectorAll<HTMLElement>('.prompt-part')) {
        const field = part.dataset.field!;
        const source = root.querySelector<HTMLElement>(`.prompt-hint-layout [data-field="${field}"]`);
        const target = root.querySelector<HTMLElement>(`.prompt-complete-layout [data-field="${field}"]`);
        const sourceBounds = source?.getBoundingClientRect();
        const targetBounds = target?.getBoundingClientRect();
        const width = part.offsetWidth;
        const height = part.offsetHeight;
        if (!width || !height) continue;
        const destination = targetBounds ?? sourceBounds;
        if (!destination) continue;
        const start = sourceBounds ?? destination;
        next[field] = {
          '--hint-x': `${start.x - bounds.x - root.clientLeft}px`, '--hint-y': `${start.y - bounds.y - root.clientTop}px`,
          '--hint-scale-x': start.width / width, '--hint-scale-y': start.height / height,
          '--complete-x': `${destination.x - bounds.x - root.clientLeft}px`, '--complete-y': `${destination.y - bounds.y - root.clientTop}px`,
          '--complete-scale-x': destination.width / width, '--complete-scale-y': destination.height / height,
        } as CSSProperties;
      }
      setGeometry(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [cell, character, fullPinyin, initial, final, tone]);

  const pinyinTargets = (value: string, field: string, start: number, anchor = toneIndex, mark = tone) => <span data-field={field}>
    {[...value].map((letter, index) => <span className="prompt-letter" data-tone-anchor={start + index === anchor ? 'true' : undefined} key={index}>
      <span className={start + index === anchor && letter.toLowerCase() === 'i' ? 'prompt-letter-base prompt-letter-dotless' : 'prompt-letter-base'}>{start + index === anchor && letter.toLowerCase() === 'i' ? 'ı' : letter}</span>
      {start + index === anchor && mark !== undefined && <span className="prompt-tone-target" data-field="tone"><ToneMark tone={mark} /></span>}
    </span>)}
  </span>;
  return <div ref={element} data-cell-index={cellIndex} className={`prompt-cell ${hidden ? 'prompt-hidden' : ''} ${character ? 'prompt-attached-cell' : ''}`} aria-label={character ? `${character} ${fullPinyin}` : '提示位置'}>
    <div className="prompt-hint-layout" aria-hidden="true">
      <span className="prompt-hint-pinyin">
        {cell.initial !== undefined && pinyinTargets(cell.initial, 'initial', 0, hintToneIndex, cell.tone)}
        {cell.final !== undefined && pinyinTargets(cell.final, 'final', cell.initial?.length ?? 0, hintToneIndex, cell.tone)}
        {cell.tone !== undefined && (cell.final === undefined || cell.tone === 5) && <span className="prompt-tone-source" data-field="tone"><ToneMark tone={cell.tone} /></span>}
      </span>
      {cell.radical !== undefined && <span data-field="radical">{cell.radical}</span>}
      {cell.component !== undefined && <span data-field="component">{cell.component}</span>}
      {cell.contains !== undefined && <span data-field="character">{cell.contains}</span>}
    </div>
    {character && <div className="prompt-complete-layout" aria-hidden="true">
      <span className="prompt-attached-hint">
        {cell.radical !== undefined && <span data-field="radical">{cell.radical}</span>}
        {cell.radical !== undefined && cell.component !== undefined && ' '}
        {cell.component !== undefined && <span data-field="component">{cell.component}</span>}
      </span>
      <span className="prompt-input-character" data-field="character">{character}</span>
      <span className={`prompt-pinyin ${fullPinyin.length > 6 ? 'prompt-pinyin-long' : ''}`}>
        {pinyinTargets(initial, 'initial', 0)}{pinyinTargets(final, 'final', initial.length)}
        {!final && tone !== undefined && tone !== 5 && <span className="prompt-tone-source prompt-tone-complete-target" data-field="tone"><ToneMark tone={tone} /></span>}
        {tone === 5 && <span className="prompt-neutral-target" data-field="tone"><ToneMark tone={5} /></span>}
      </span>
    </div>}
    <div className="prompt-complete">
      {parts.map(part => <span key={part.field} data-field={part.field}
        className={`prompt-part prompt-part-${part.field} ${part.original ? 'prompt-origin' : 'prompt-supplement'}`} style={geometry[part.field]}>{part.content}</span>)}
    </div>
    {hidden && <span className="prompt-star">*</span>}
  </div>;
}

const flipAnimations = new WeakMap<HTMLElement, Animation>();
const opacityAnimations = new WeakMap<HTMLElement, Animation>();
const easing = 'cubic-bezier(.16, 1, .3, 1)';

function transformValue(element: HTMLElement): string {
  const value = getComputedStyle(element).transform;
  return value === 'none' ? 'matrix(1, 0, 0, 1, 0, 0)' : value;
}

function animateFlip(element: HTMLElement, previousTransform: string | undefined, reducedMotion: boolean): string {
  const active = flipAnimations.get(element);
  const from = active ? transformValue(element) : previousTransform;
  active?.cancel();
  flipAnimations.delete(element);
  const currentTransform = transformValue(element);
  if (!from || reducedMotion || from === currentTransform) return currentTransform;
  const animation = element.animate([
    { transform: from },
    { transform: currentTransform },
  ], { duration: 700, easing, fill: 'both' });
  flipAnimations.set(element, animation);
  animation.onfinish = () => {
    if (flipAnimations.get(element) === animation) flipAnimations.delete(element);
    animation.cancel();
  };
  return currentTransform;
}

function animateOpacity(element: HTMLElement, target: number, reducedMotion: boolean) {
  const active = opacityAnimations.get(element);
  const computed = Number.parseFloat(getComputedStyle(element).opacity);
  const from = active ? computed : (element.dataset.opacityTarget ? Number(element.dataset.opacityTarget) : computed);
  active?.cancel();
  opacityAnimations.delete(element);
  element.dataset.opacityTarget = String(target);
  if (reducedMotion || !Number.isFinite(from) || Math.abs(from - target) < 0.001) return;
  const animation = element.animate([
    { opacity: from },
    { opacity: target },
  ], { duration: 700, easing, fill: 'both' });
  opacityAnimations.set(element, animation);
  animation.onfinish = () => {
    if (opacityAnimations.get(element) === animation) opacityAnimations.delete(element);
    animation.cancel();
  };
}

export function PromptView({ prompt, compact = false, draft = '', draftMatch, feedback = false, maxLength, cursor = 0, focused = false, answerInput, onSelectCharacter }: {
  prompt: Prompt; compact?: boolean; draft?: string; draftMatch?: DraftMatch; feedback?: boolean;
  maxLength?: number; cursor?: number; focused?: boolean; answerInput?: ReactNode; onSelectCharacter?: (index: number) => void;
}) {
  const characters = [...draft];
  const match = draftMatch && draftMatch.promptId === prompt.id && draftMatch.word === draft && draftMatch.offset !== null && draftMatch.reading
    ? {offset: draftMatch.offset, reading: draftMatch.reading} : null;
  const attached = match !== null && match.offset + prompt.cells.length <= characters.length;
  const [visualAttached, setVisualAttached] = useState(false);
  useEffect(() => {
    if (!attached) { setVisualAttached(false); return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVisualAttached(true); return; }
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => { nextFrame = requestAnimationFrame(() => setVisualAttached(true)); });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame); };
  }, [attached, prompt.id]);
  const [previousMatch, setPreviousMatch] = useState<{ offset: number; reading: Reading; characters: string[]; promptId: string } | null>(null);
  useEffect(() => {
    if (attached) {
      setPreviousMatch({ offset: match.offset, reading: match.reading, characters, promptId: prompt.id });
      return;
    }
    const timer = window.setTimeout(() => setPreviousMatch(null), 700);
    return () => window.clearTimeout(timer);
  }, [draft, attached, draftMatch, prompt.id]);
  const completion = attached ? { ...match, characters } : previousMatch?.promptId === prompt.id ? previousMatch : null;
  const answerCount = maxLength === undefined ? characters.length : Math.min(characters.length + 1, maxLength);
  const style = {
    '--slot-count': Math.max(prompt.cells.length, answerCount),
    '--answer-count': answerCount,
    '--prompt-shift': attached ? match.offset + prompt.cells.length / 2 - answerCount / 2 : 0,
    '--input-index': Math.min(cursor, Math.max(0, answerCount - 1)),
  } as CSSProperties;
  const flipRoot = useRef<HTMLDivElement>(null);
  const flipTransforms = useRef(new Map<string, string>());
  useLayoutEffect(() => {
    const root = flipRoot.current;
    if (!root) return;
    const nodes = [
      ...Array.from(root.querySelectorAll<HTMLElement>('.prompt-layer, .answer-editor')),
      ...Array.from(root.querySelectorAll<HTMLElement>('.prompt-part')),
    ];
    const next = new Map<string, string>();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nodes.forEach(node => {
      const cellIndex = node.closest<HTMLElement>('.prompt-cell')?.dataset.cellIndex ?? '';
      const key = node.classList.contains('prompt-part') ? `part:${cellIndex}:${node.dataset.field}` : node.classList.contains('prompt-layer') ? 'prompt-layer' : 'answer-editor';
      next.set(key, animateFlip(node, flipTransforms.current.get(key), reducedMotion));
    });
    const targetAttached = attached && visualAttached;
    root.querySelectorAll<HTMLElement>('.prompt-supplement').forEach(node => {
      animateOpacity(node, targetAttached ? 1 : 0, reducedMotion);
    });
    flipTransforms.current = next;
  }, [draft, visualAttached, prompt.id, completion?.offset, answerCount]);
  return <div ref={flipRoot} className={`prompt ${compact ? 'prompt-compact' : ''} ${answerCount > 0 ? 'prompt-with-answer' : ''} ${feedback ? 'prompt-feedback' : ''}`} style={style} aria-label="当前提示">
    <div className={`prompt-layer ${attached && visualAttached ? 'prompt-layer-attached' : ''}`}>
      <div className="prompt-cells">
        {prompt.cells.map((cell, index) => <PromptCellView key={`${prompt.id}:${index}`} cell={cell}
          character={completion?.characters[completion.offset + index]}
          reading={completion?.reading} position={completion ? index : undefined} cellIndex={index} />)}
      </div>
    </div>
    {answerCount > 0 && <div className={`answer-editor ${attached && visualAttached ? 'answer-editor-attached' : ''}`}>
      <div className="answer-cells" aria-label="答案字格">
      {Array.from({ length: answerCount }, (_, index) => {
        const character = characters[index];
        const inWindow = attached && visualAttached && index >= match!.offset && index < match!.offset + prompt.cells.length;
        return <div className={`answer-cell ${inWindow ? 'answer-cell-attached' : 'answer-cell-outline'} ${focused && (cursor === index || cursor === answerCount && index === cursor - 1) ? 'answer-cell-caret' : ''} ${!character ? 'answer-cell-empty' : ''}`} key={index}
          onPointerDown={event => { event.preventDefault(); onSelectCharacter?.(Math.min(index + 1, characters.length)); }}>
          <span className="answer-cell-surface" aria-hidden="true" />
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
