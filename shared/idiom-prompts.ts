export function stalemateScore(answersWithoutLifeLoss: number): number {
  if (!Number.isInteger(answersWithoutLifeLoss) || answersWithoutLifeLoss < 0) throw new Error('连续有效回合数量无效');
  return Math.min(1, Math.max(0, (answersWithoutLifeLoss - 8) / 12));
}

export function idiomVisiblePositions(score: number): number[] {
  if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error('对局胶着程度无效');
  return Math.random() < .5 ? [0] : [0, 1, 2, 3];
}
