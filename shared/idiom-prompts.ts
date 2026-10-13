export function stalemateScore(answersWithoutLifeLoss: number): number {
  if (!Number.isInteger(answersWithoutLifeLoss) || answersWithoutLifeLoss < 0) throw new Error('连续有效回合数量无效');
  return Math.min(1, Math.max(0, (answersWithoutLifeLoss - 8) / 12));
}

export function idiomVisiblePositions(score: number): number[] {
  if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error('对局胶着程度无效');
  const selection = Math.random();
  if (selection < score * .1) {
    const first = Math.floor(Math.random() * 4);
    const second = (first + 1 + Math.floor(Math.random() * 3)) % 4;
    return [first, second].sort();
  }
  if ((selection - score * .1) / (1 - score * .1) < .5) return [0];
  const hidden = Math.floor(Math.random() * 4);
  return [0, 1, 2, 3].filter(position => position !== hidden);
}
