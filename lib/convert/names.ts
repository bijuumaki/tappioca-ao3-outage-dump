/* "MORIBUND - 2.html" is chapter 2 of "MORIBUND"; any other name is a one-chapter fic named from the file. */
export function parseChapterFilename(name: string): { title: string; n: number | null; ext: string } {
  const m = name.match(/^(.*)\.([A-Za-z0-9]+)$/);
  const base = (m ? m[1] : name).trim();
  const ext = (m ? m[2] : "").toLowerCase();
  const tidy = (s: string) => s.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  const c = base.match(/^(.*\S) - (\d{1,3})$/);
  return c ? { title: tidy(c[1]), n: Number(c[2]), ext } : { title: tidy(base), n: null, ext };
}

export type FileGroup<T extends { name: string }> = { title: string; files: (T & { n: number | null })[] };

/* Files of one fic (same title, with chapter numbers) go together in number order; the rest each stand alone.
   Groups keep the order in which their first file appeared. */
export function groupFiles<T extends { name: string } | string>(files: T[]): FileGroup<{ name: string }>[] {
  const groups: FileGroup<{ name: string }>[] = [];
  const byTitle = new Map<string, FileGroup<{ name: string }>>();
  for (const f of files) {
    const name = typeof f === "string" ? f : f.name;
    const p = parseChapterFilename(name);
    if (p.n === null) { groups.push({ title: p.title, files: [{ name, n: null }] }); continue; }
    const key = p.title.toLowerCase();
    let g = byTitle.get(key);
    if (!g) { g = { title: p.title, files: [] }; byTitle.set(key, g); groups.push(g); }
    g.files.push({ name, n: p.n });
  }
  for (const g of groups) g.files.sort((a, b) => (a.n ?? 0) - (b.n ?? 0));
  return groups;
}
