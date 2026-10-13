import {useCallback, useLayoutEffect, useRef, type RefObject} from 'react';

export function useAnswerVisibility(region: RefObject<HTMLElement | null>, input: RefObject<HTMLInputElement | null>, enabled: boolean) {
  const frame = useRef(0);
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
      const bottom = top + height - 12;
      const bounds = element.getBoundingClientRect();
      const delta = bounds.bottom > bottom ? bounds.bottom - bottom : bounds.top < top + 12 ? bounds.top - top - 12 : 0;
      if (Math.abs(delta) > 1) window.scrollBy({top: delta, behavior: 'instant'});
    });
  }, [enabled, input, region]);
  useLayoutEffect(() => {
    if (!enabled) return;
    const element = region.current;
    const editor = input.current;
    if (!element || !editor) return;
    const viewport = window.visualViewport;
    if (!viewport) throw new Error('浏览器缺少 VisualViewport');
    const update = () => {
      const shell = element.closest<HTMLElement>('.room-game-shell');
      if (shell) shell.style.setProperty('--visible-height', `${viewport.height}px`);
      reveal();
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', reveal);
    window.addEventListener('resize', update);
    editor.addEventListener('focus', update);
    editor.addEventListener('pointerup', reveal);
    update();
    return () => {
      cancelAnimationFrame(frame.current);
      observer.disconnect();
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', reveal);
      window.removeEventListener('resize', update);
      editor.removeEventListener('focus', update);
      editor.removeEventListener('pointerup', reveal);
      element.closest<HTMLElement>('.room-game-shell')?.style.removeProperty('--visible-height');
    };
  }, [enabled, input, region, reveal]);
  return reveal;
}
