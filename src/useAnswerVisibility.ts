import {useCallback, useLayoutEffect, useRef, type RefObject} from 'react';

export function useAnswerVisibility(region: RefObject<HTMLElement | null>, input: RefObject<HTMLInputElement | null>, enabled: boolean) {
  const frame = useRef(0);
  const expandedHeight = useRef(window.visualViewport?.height ?? window.innerHeight);
  const reveal = useCallback(() => {
    if (!enabled || !(matchMedia('(max-width: 700px)').matches || matchMedia('(pointer: coarse)').matches) || document.activeElement !== input.current) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const element = region.current;
      if (!element) return;
      const viewport = window.visualViewport;
      if (!viewport) throw new Error('浏览器缺少 VisualViewport');
      const top = viewport.offsetTop;
      const height = viewport.height;
      const bottom = top + height - 24;
      const bounds = element.getBoundingClientRect();
      const delta = bounds.bottom > bottom ? bounds.bottom - bottom : bounds.top < top + 12 ? bounds.top - top - 12 : 0;
      if (Math.abs(delta) > 1) window.scrollBy({top: delta, behavior: 'instant'});
    });
  }, [enabled, input, region]);
  useLayoutEffect(() => {
    if (!enabled) return;
    const viewport = window.visualViewport;
    if (!viewport) throw new Error('浏览器缺少 VisualViewport');
    const update = () => {
      const shell = region.current?.closest<HTMLElement>('.room-game-shell');
      expandedHeight.current = Math.max(expandedHeight.current, viewport.height);
      if (shell) {
        shell.style.setProperty('--visible-height', `${viewport.height}px`);
        shell.dataset.keyboardVisible = String(expandedHeight.current - viewport.height > 100);
        const answer=region.current;
        if(answer)shell.style.setProperty('--answer-top',`${viewport.offsetTop+viewport.height-24-answer.offsetHeight}px`);
      }
      reveal();
    };
    const observer = new ResizeObserver(update);
    if (region.current) observer.observe(region.current);
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('focusin', update);
    window.addEventListener('focusout', update);
    window.addEventListener('pointerup', reveal);
    update();
    let tracking = 0;
    const track = () => {
      update();tracking = requestAnimationFrame(track);
    };
    tracking = requestAnimationFrame(track);
    return () => {
      cancelAnimationFrame(tracking);
      cancelAnimationFrame(frame.current);
      observer.disconnect();
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('focusin', update);
      window.removeEventListener('focusout', update);
      window.removeEventListener('pointerup', reveal);
      region.current?.closest<HTMLElement>('.room-game-shell')?.style.removeProperty('--visible-height');
      region.current?.closest<HTMLElement>('.room-game-shell')?.removeAttribute('data-keyboard-visible');
      region.current?.closest<HTMLElement>('.room-game-shell')?.style.removeProperty('--answer-top');
    };
  }, [enabled, input, region, reveal]);
  return reveal;
}
