export const HOME_FANDOM_LIMIT = 5;

/* The fandoms with the most stories (ties A to Z), so The Archive box on Home stays a steady height. */
export function topFandoms<T extends { name: string; count: number }>(fandoms: T[], limit = HOME_FANDOM_LIMIT): { shown: T[]; hidden: number } {
  const ranked = [...fandoms].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { shown: ranked.slice(0, limit), hidden: Math.max(ranked.length - limit, 0) };
}
