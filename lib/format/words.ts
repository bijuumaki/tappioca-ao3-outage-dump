export function formatWords(n: number): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? "word" : "words"}`;
}
