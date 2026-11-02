/* Readers see visible chapters numbered 1, 2, 3 in position order, with no gaps for hidden ones. */
export function numberVisibleChapters<T extends { position: number }>(rows: T[]): (T & { n: number })[] {
  return [...rows].sort((a, b) => a.position - b.position).map((row, i) => ({ ...row, n: i + 1 }));
}
