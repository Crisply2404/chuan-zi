import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatPinyin } from '../shared/pinyin';
import type { DraftMatch, Prompt, PromptCell, Reading } from '../shared/types';

type Glyph = { character: string; strokes: string[]; parts: Record<string, number[]> };
const glyphCache = new Map<string, Promise<Glyph>>();

function loadGlyph(character: string): Promise<Glyph> {
  const cached = glyphCache.get(character);
  if (cached) return cached;
  const request = fetch(`${import.meta.env.BASE_URL}glyphs/${character.codePointAt(0)!.toString(16)}.json`).then(async response => {
    if (!response.ok) throw new Error(`汉字笔画加载失败：${character}`);
    const glyph = await response.json() as Glyph;
    if (glyph.character !== character || !glyph.strokes.length) throw new Error(`汉字笔画资料无效：${character}`);
    return glyph;
  });
  glyphCache.set(character, request);
  return request;
}

function GlyphPart({ glyph, indices, original, attached, hint }: { glyph: Glyph; indices: number[]; original: boolean; attached: boolean; hint?: string }) {
  const vector = useRef<SVGSVGElement>(null);
  const hintText = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!original) return;
    animateOpacity(vector.current!, attached ? 1 : 0);
    animateOpacity(hintText.current!, attached ? 0 : 1);
  }, [attached, original, indices.join(':')]);
  return <span className={`stroke-glyph ${original ? 'prompt-glyph-origin' : 'prompt-glyph-supplement'}`} aria-hidden="true">
    {original && <span ref={hintText} className="stroke-glyph-hint" style={{opacity: attached ? 0 : 1}}>{hint}</span>}
    <svg ref={vector} className="stroke-glyph-vector" viewBox="0 0 1024 1024" style={{opacity: original && !attached ? 0 : 1}}>
      <g transform="scale(1,-1) translate(0,-900)">{indices.map(index => <path key={index} data-stroke-index={index} d={glyph.strokes[index]} fill="currentColor" />)}</g>
    </svg>
  </span>;
}

function ToneMark({ tone }: { tone: number }) {
  // 声调布局参考 Han Dou，MIT 许可见 licenses/HanDou.txt。
  const paths = [
    '',
    'M3 11H17',
    'M4 15L16 5',
    'M3 7L10 15L17 7',
    'M4 5L16 15',
  ];
  return <svg className="prompt-tone" viewBox="0 0 20 20" role="img" aria-label={formatPinyin(undefined, undefined, tone)}>
    {tone === 5 ? <circle cx="10" cy="10" r="2" fill="currentColor" /> : <path d={paths[tone]} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
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

function PromptCellView({ cell, character, reading, position, cellIndex, attached }: {
  cell: PromptCell; character?: string; reading?: Reading; position?: number; cellIndex: number; attached: boolean;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<Record<string, CSSProperties>>({});
  const transforms = useRef(new Map<string, LayoutFrame>());
  const hidden = Object.keys(cell).length === 0;
  const zeroInitial = cell.initial === '';
  const emptyPhonetic = zeroInitial || cell.final === '';
  const combinedHint = [cell.radical, cell.component, cell.contains].some(value => value !== undefined)
    && [cell.initial, cell.final, cell.tone].some(value => value !== undefined);
  const hintGlyphCount = Math.max(1, [cell.radical, cell.component, cell.contains].reduce((total, value) => total + [...(value ?? '')].length, 0));
  const [loadedGlyph, setGlyph] = useState<Glyph | null>(null);
  const glyph = loadedGlyph?.character === character ? loadedGlyph : null;
  useEffect(() => {
    if (!character || (cell.radical === undefined && cell.component === undefined)) { setGlyph(null); return; }
    let current = true;
    loadGlyph(character).then(value => { if (current) setGlyph(value); });
    return () => { current = false; };
  }, [character, cell.radical, cell.component]);
  if (glyph && [cell.radical, cell.component].some(part => part !== undefined && !glyph.parts[part]?.length)) throw new Error(`提示笔画映射缺失：${character}`);
  const radicalStrokes = glyph && cell.radical !== undefined ? glyph.parts[cell.radical] ?? [] : [];
  const componentStrokes = glyph && cell.component !== undefined ? (glyph.parts[cell.component] ?? []).filter(index => !radicalStrokes.includes(index)) : [];
  const originalStrokes = [...radicalStrokes, ...componentStrokes];
  const vector = glyph !== null && originalStrokes.length > 0;
  const supplementStrokes = glyph?.strokes.flatMap((_, index) => !originalStrokes.includes(index) ? [index] : []) ?? [];
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
  const visiblePinyin = (value: string, field: string, start: number) => pinyinTargets(value, field, start, -1, undefined);
  const parts = [
    { field: 'initial', content: initial ? visiblePinyin(displayInitial, 'initial', 0) : null, original: cell.initial !== undefined },
    { field: 'final', content: final ? visiblePinyin(displayFinal, 'final', initial.length) : null, original: cell.final !== undefined },
    { field: 'tone', content: tone !== undefined && (tone !== 5 || cell.tone === 5 && cell.final === undefined) ? <ToneMark tone={tone} /> : null, original: cell.tone !== undefined },
    { field: 'radical', content: vector && radicalStrokes.length ? <GlyphPart glyph={glyph!} indices={radicalStrokes} hint={cell.radical} original attached={attached} /> : cell.radical, original: true, vector: vector && radicalStrokes.length > 0 },
    { field: 'component', content: vector ? componentStrokes.length ? <GlyphPart glyph={glyph!} indices={componentStrokes} hint={cell.component} original attached={attached} /> : null : cell.component, original: true, vector: vector && componentStrokes.length > 0 },
    { field: 'character', content: vector && cell.contains === undefined ? <GlyphPart glyph={glyph!} indices={supplementStrokes} original={false} attached={attached} /> : cell.contains ?? character, original: cell.contains !== undefined, vector },
    { field: 'zero', content: emptyPhonetic ? '∅' : null, original: true },
  ].filter(part => part.content !== undefined && part.content !== null && part.content !== '');

  useLayoutEffect(() => {
    const root = element.current!;
    const measure = () => {
      const bounds = root.getBoundingClientRect();
      const next: Record<string, CSSProperties> = {};
      for (const part of root.querySelectorAll<HTMLElement>('.prompt-part')) {
        const field = part.dataset.field!;
        const source = root.querySelector<HTMLElement>(`.prompt-hint-layout [data-field="${field}"]`);
        const target = root.querySelector<HTMLElement>(`.prompt-complete-layout [data-field="${vector && ['radical', 'component'].includes(field) ? 'character' : field}"]`);
        const sourceBounds = source?.getBoundingClientRect();
        const targetBounds = target?.getBoundingClientRect();
        const destination = targetBounds ?? sourceBounds;
        if (!destination) continue;
        const start = sourceBounds ?? destination;
        const sourceStyle = getComputedStyle(source ?? target!);
        const targetStyle = getComputedStyle(target ?? source!);
        next[field] = {
          '--hint-x': `${start.x - bounds.x - root.clientLeft}px`, '--hint-y': `${start.y - bounds.y - root.clientTop}px`,
          '--complete-x': `${destination.x - bounds.x - root.clientLeft}px`, '--complete-y': `${destination.y - bounds.y - root.clientTop}px`,
          '--hint-font-size': sourceStyle.fontSize, '--complete-font-size': targetStyle.fontSize,
          '--hint-line-height': sourceStyle.lineHeight, '--complete-line-height': targetStyle.lineHeight,
          '--hint-width': `${start.width}px`, '--complete-width': `${destination.width}px`,
          '--hint-height': `${start.height}px`, '--complete-height': `${destination.height}px`,
        } as CSSProperties;
      }
      setGeometry(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [cell, character, fullPinyin, initial, final, tone, glyph, vector]);

  useLayoutEffect(() => {
    if (!Object.keys(geometry).length) return;
    const root = element.current!;
    const next = new Map<string, LayoutFrame>();
    root.querySelectorAll<HTMLElement>('.prompt-part').forEach(part => {
      const field = part.dataset.field!;
      next.set(field, animateFlip(part, transforms.current.get(field), true));
      if (part.classList.contains('prompt-supplement')) animateOpacity(part, attached ? 1 : 0);
      if (part.classList.contains('prompt-empty-phonetic')) animateOpacity(part, attached ? 0 : 1);
      if (part.classList.contains('prompt-neutral-tone')) animateOpacity(part, attached ? 0 : 1);
    });
    transforms.current = next;
  }, [geometry, attached]);

  function pinyinTargets(value: string, field: string, start: number, anchor = toneIndex, mark = tone) {
    return <span data-field={field}>
      {[...value].map((letter, index) => <span className="prompt-letter" data-diaeresis={letter === 'ü' ? 'true' : undefined} data-tone-anchor={start + index === anchor ? 'true' : undefined} key={index}>
        <span className={start + index === anchor && letter.toLowerCase() === 'i' ? 'prompt-letter-base prompt-letter-dotless' : 'prompt-letter-base'}>{start + index === anchor && letter.toLowerCase() === 'i' ? 'ı' : letter}</span>
        {start + index === anchor && mark !== undefined && <span className="prompt-tone-target" data-field="tone"><ToneMark tone={mark} /></span>}
      </span>)}
    </span>;
  }
  return <div ref={element} data-cell-index={cellIndex} data-glyph-ready={!character || (cell.radical === undefined && cell.component === undefined) || glyph !== null} style={{ '--pinyin-length': Math.max(initial.length + final.length, 3), '--hint-glyph-count': hintGlyphCount } as CSSProperties} className={`prompt-cell ${hidden ? 'prompt-hidden' : ''} ${character ? 'prompt-attached-cell' : ''}`} aria-label={character ? `${character} ${fullPinyin}` : hidden ? '不限条件' : zeroInitial ? '零声母' : emptyPhonetic ? '无韵母' : '提示位置'}>
    <div className={`prompt-hint-layout ${combinedHint ? 'prompt-hint-combined' : ''}`} aria-hidden="true">
      <span className="prompt-hint-character">
        {cell.radical !== undefined && <span data-field="radical">{cell.radical}</span>}
        {cell.component !== undefined && <span data-field="component">{cell.component}</span>}
        {cell.contains !== undefined && <span data-field="character">{cell.contains}</span>}
      </span>
      <span className="prompt-hint-pinyin">
        {emptyPhonetic && <span data-field="zero">∅</span>}
        {cell.initial !== undefined && pinyinTargets(cell.initial, 'initial', 0, hintToneIndex, cell.tone)}
        {cell.final !== undefined && pinyinTargets(cell.final, 'final', cell.initial?.length ?? 0, hintToneIndex, cell.tone)}
        {cell.tone !== undefined && cell.final === undefined && <span className="prompt-tone-source" data-field="tone"><ToneMark tone={cell.tone} /></span>}
      </span>
    </div>
    {character && <div className="prompt-complete-layout" aria-hidden="true">
      <span className="prompt-attached-hint">
        {!vector && cell.radical !== undefined && <span data-field="radical">{cell.radical}</span>}
        {!vector && cell.radical !== undefined && cell.component !== undefined && ' '}
        {!vector && cell.component !== undefined && <span data-field="component">{cell.component}</span>}
      </span>
      <span className="prompt-input-character" data-field="character">{character}</span>
      <span className={`prompt-pinyin ${fullPinyin.length > 6 ? 'prompt-pinyin-long' : ''}`}>
        {pinyinTargets(initial, 'initial', 0)}{pinyinTargets(final, 'final', initial.length)}
        {!final && tone !== undefined && tone !== 5 && <span className="prompt-tone-source prompt-tone-complete-target" data-field="tone"><ToneMark tone={tone} /></span>}
      </span>
    </div>}
    <div className="prompt-complete">
      {parts.map(part => <span key={part.field} data-field={part.field}
        className={`prompt-part prompt-part-${part.field} ${part.original ? 'prompt-origin' : 'prompt-supplement'} ${part.vector ? 'prompt-part-vector' : ''} ${part.field === 'zero' ? 'prompt-empty-phonetic' : ''} ${part.field === 'tone' && tone === 5 ? 'prompt-neutral-tone' : ''}`} style={geometry[part.field]}>{part.content}</span>)}
    </div>
    {hidden && <span className="prompt-unrestricted">*</span>}
  </div>;
}

const flipAnimations = new WeakMap<HTMLElement, Animation>();
const opacityAnimations = new WeakMap<HTMLElement | SVGElement, Animation>();
const easing = 'cubic-bezier(.16, 1, .3, 1)';

type LayoutFrame = { transform: string; fontSize?: string; lineHeight?: string; width?: string; height?: string };

function layoutValue(element: HTMLElement, includeSize: boolean): LayoutFrame {
  const style = getComputedStyle(element);
  return {
    transform: style.transform === 'none' ? 'matrix(1, 0, 0, 1, 0, 0)' : style.transform,
    ...(includeSize ? { fontSize: style.fontSize, lineHeight: style.lineHeight, width: style.width, height: style.height } : {}),
  };
}

function animateFlip(element: HTMLElement, previous: LayoutFrame | undefined, includeSize = false): LayoutFrame {
  const active = flipAnimations.get(element);
  const from = active ? layoutValue(element, includeSize) : previous;
  active?.cancel();
  flipAnimations.delete(element);
  const current = layoutValue(element, includeSize);
  if (!from || JSON.stringify(from) === JSON.stringify(current)) return current;
  const animation = element.animate([from, current], { duration: 700, easing, fill: 'both' });
  flipAnimations.set(element, animation);
  animation.onfinish = () => {
    if (flipAnimations.get(element) === animation) flipAnimations.delete(element);
    animation.cancel();
  };
  return current;
}

function animateOpacity(element: HTMLElement | SVGElement, target: number) {
  const active = opacityAnimations.get(element);
  const computed = Number.parseFloat(getComputedStyle(element).opacity);
  const from = active ? computed : (element.dataset.opacityTarget ? Number(element.dataset.opacityTarget) : 0);
  active?.cancel();
  opacityAnimations.delete(element);
  element.dataset.opacityTarget = String(target);
  if (!Number.isFinite(from) || Math.abs(from - target) < 0.001) return;
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

export function PromptView({ prompt, compact = false, draft = '', draftMatch, feedback = false, maxLength, cursor = 0, focused = false, answerInput, onSelectCharacter, supplementColor = '#ffad32', settled = false, submitting = false, onCombined }: {
  prompt: Prompt; compact?: boolean; draft?: string; draftMatch?: DraftMatch; feedback?: boolean;
  maxLength?: number; cursor?: number; focused?: boolean; answerInput?: ReactNode; onSelectCharacter?: (index: number) => void;
  supplementColor?: string; settled?: boolean; submitting?: boolean; onCombined?: () => void;
}) {
  const characters = [...draft];
  const match = draftMatch && draftMatch.promptId === prompt.id && draftMatch.word === draft && draftMatch.offset !== null && draftMatch.reading
    ? {offset: draftMatch.offset, reading: draftMatch.reading} : null;
  const attached = match !== null && match.offset + prompt.cells.length <= characters.length;
  const [visualAttached, setVisualAttached] = useState(settled);
  useLayoutEffect(() => {if (submitting && attached) setVisualAttached(true);}, [submitting, attached]);
  useEffect(() => {
    if (!attached) { setVisualAttached(false); return; }
    if (submitting) return;
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => { nextFrame = requestAnimationFrame(() => setVisualAttached(true)); });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame); };
  }, [attached, prompt.id, submitting]);
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
    '--supplement-color': supplementColor,
  } as CSSProperties;
  const flipRoot = useRef<HTMLDivElement>(null);
  const flipTransforms = useRef(new Map<string, LayoutFrame>());
  useLayoutEffect(() => {
    const root = flipRoot.current;
    if (!root) return;
    const nodes = [
      ...Array.from(root.querySelectorAll<HTMLElement>('.prompt-layer, .answer-editor')),
    ];
    const next = new Map<string, LayoutFrame>();
    nodes.forEach(node => {
      const key = node.classList.contains('prompt-layer') ? 'prompt-layer' : 'answer-editor';
      next.set(key, animateFlip(node, flipTransforms.current.get(key)));
    });
    flipTransforms.current = next;
  }, [draft, visualAttached, prompt.id, completion?.offset, answerCount]);
  useLayoutEffect(() => {
    if (!submitting || !attached || !visualAttached) return;
    const root = flipRoot.current!;
    const finish = () => {
      const active = root.getAnimations({subtree: true}).filter(animation =>
        animation.effect?.getComputedTiming().iterations !== Infinity && (animation.playState === 'running' || animation.pending)
      );
      active.forEach(animation => animation.finish());
      return active.length;
    };
    finish();
    let frame = 0;
    let stableFrames = 0;
    const advance = () => {
      const active = finish();
      stableFrames = active || root.querySelector('.prompt-cell[data-glyph-ready="false"]') ? 0 : stableFrames + 1;
      if (stableFrames >= 2) { onCombined?.(); return; }
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [submitting, attached, visualAttached, onCombined]);
  return <div ref={flipRoot} className={`prompt ${compact ? 'prompt-compact' : ''} ${answerCount > 0 ? 'prompt-with-answer' : ''} ${feedback ? 'prompt-feedback' : ''}`} style={style} aria-label="当前提示">
    <div className={`prompt-layer ${attached && visualAttached ? 'prompt-layer-attached' : ''}`}>
      <div className="prompt-cells">
        {prompt.cells.map((cell, index) => <PromptCellView key={`${prompt.id}:${index}`} cell={cell}
          character={completion?.characters[completion.offset + index]}
          reading={completion?.reading} position={completion ? index : undefined} cellIndex={index} attached={attached && visualAttached} />)}
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
