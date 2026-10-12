import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { RoomView } from '../shared/types';

type Hand = { angle: number; length: number; playerId: string };
type Hands = { x: number; y: number; current: Hand; previous: Hand | null };

function DrumHand({ hand, previous = false }: { hand: Hand; previous?: boolean }) {
  const element = useRef<SVGGElement>(null);
  const arrow = useRef<SVGGElement>(null);
  const target = useRef(hand.angle);
  const animation = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    if (previous) return;
    const node = element.current!;
    const active = animation.current;
    const matrix = new DOMMatrix(getComputedStyle(node).transform);
    const from = active ? Math.atan2(matrix.b, matrix.a) : target.current;
    active?.cancel();
    const delta = Math.atan2(Math.sin(hand.angle - from), Math.cos(hand.angle - from));
    const end = from + delta;
    target.current = end;
    const tween = node.animate([{transform: `rotate(${from}rad)`}, {transform: `rotate(${end}rad)`}],
      { duration: 700, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' });
    animation.current = tween;
    tween.onfinish = () => { animation.current = null; tween.cancel(); };
    return () => {
      if (tween.playState === 'running') {
        const current = new DOMMatrix(getComputedStyle(node).transform);
        target.current = Math.atan2(current.b, current.a);
      }
      animation.current = null;
      tween.cancel();
    };
  }, [hand.angle, hand.playerId, previous]);
  useLayoutEffect(() => {
    if (!previous) return;
    const node = arrow.current!;
    const tween = node.animate([{transform: 'scaleX(1)', fill: '#ffad32'}, {transform: 'scaleX(-1)', fill: '#96908a'}],
      {duration: 700, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both'});
    return () => tween.cancel();
  }, [previous, hand.playerId]);
  const width = 3;
  const head = 10;
  const neck = hand.length - 12;
  const midpoint = (32 + hand.length) / 2;
  return <g ref={element} data-player-id={hand.playerId} className={`drum-hand ${previous ? 'drum-hand-previous' : 'drum-hand-current'}`}
    style={{ transform: `rotate(${hand.angle}rad)` }}>
    <g transform={`translate(${midpoint},0)`}><g ref={arrow} className="drum-hand-shape" style={{transform: `scaleX(${previous ? -1 : 1})`}}>
      <path d={`M${32 - midpoint},-${width} H${neck - midpoint} V-${head} L${hand.length - midpoint},0 L${neck - midpoint},${head} V${width} H${32 - midpoint} Z`} />
    </g></g>
  </g>;
}

export function DrumTransfer({ topology, room }: { topology: RefObject<HTMLDivElement | null>; room: RoomView }) {
  const [hands, setHands] = useState<Hands | null>(null);
  const players = room.players.map(player => player.id).join(':');
  useEffect(() => {
    const root = topology.current!;
    if (room.phase !== 'playing' || !room.currentPlayerId) { setHands(null); return; }
    const measure = () => {
      const bounds = root.getBoundingClientRect();
      const drum = root.querySelector('.topology-center')!.getBoundingClientRect();
      const x = drum.x + drum.width / 2 - bounds.x;
      const y = drum.y + drum.height / 2 - bounds.y;
      const readHand = (playerId: string): Hand => {
        const avatar = [...root.querySelectorAll<HTMLElement>('[data-player-id]')]
          .find(player => player.classList.contains('topology-player') && player.dataset.playerId === playerId)?.querySelector('.topology-avatar');
        if (!avatar) throw new Error('传鼓玩家头像不存在');
        const rect = avatar.getBoundingClientRect();
        const dx = rect.x + rect.width / 2 - bounds.x - x;
        const dy = rect.y + rect.height / 2 - bounds.y - y;
        return { angle: Math.atan2(dy, dx), length: Math.max(35, Math.hypot(dx, dy) - rect.width / 2 - 12), playerId };
      };
      const previous = room.previousPlayerId && room.previousPlayerId !== room.currentPlayerId && room.players.some(player => player.id === room.previousPlayerId)
        ? readHand(room.previousPlayerId) : null;
      const next = { x, y, current: readHand(room.currentPlayerId!), previous };
      setHands(value => JSON.stringify(value) === JSON.stringify(next) ? value : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    const reposition = (event: TransitionEvent) => {
      if (event.propertyName === 'left' || event.propertyName === 'top') measure();
    };
    root.addEventListener('transitionend', reposition);
    return () => { observer.disconnect(); root.removeEventListener('transitionend', reposition); };
  }, [topology, room.currentPlayerId, room.previousPlayerId, room.phase, players]);
  if (!hands) return null;
  return <svg className="drum-transfer" aria-hidden="true"><g transform={`translate(${hands.x},${hands.y})`}>
    {hands.previous && <DrumHand key={`previous:${hands.previous.playerId}`} hand={hands.previous} previous />}
    <DrumHand key="current" hand={hands.current} />
  </g></svg>;
}
