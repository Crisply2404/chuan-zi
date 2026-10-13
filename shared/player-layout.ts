export const playerColors = ['#47738A', '#A05F3E', '#5D7E68', '#84668A', '#A56A69', '#797840', '#507D80', '#9B7653', '#6577A0', '#957457', '#628A83', '#98709A', '#9D665B', '#748753', '#67778D', '#9B7D65', '#825848'];

export function playerAngle(index: number, count: number): number {
  return (count === 2 ? Math.PI : -Math.PI / 2) + index * Math.PI * 2 / count;
}
