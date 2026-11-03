import { ACCEPTED_EXTENSIONS, MAX_DOCUMENT_BYTES } from "@/lib/convert/index-constants";

/* Turns the flat Drive listing into "fics found", each marked Ready or Needs attention with a one-line reason.
   It only reads names, folders and sizes: it never guesses story details. */
export type LibraryFile = { name: string; path: string; size: number };
export type LibraryFic = { title: string; folder: string; fileLine: string; ready: boolean; note: string };

const CHAPTER_NAME = /^(.*\S)\s+-\s+(\d{1,4})$/;

function parts(f: LibraryFile) {
  const slash = f.path.lastIndexOf("/");
  const folder = slash >= 0 ? f.path.slice(0, slash) : "";
  const dot = f.name.lastIndexOf(".");
  const ext = dot > 0 ? f.name.slice(dot + 1).toLowerCase() : "";
  const base = dot > 0 ? f.name.slice(0, dot) : f.name;
  const m = base.match(CHAPTER_NAME);
  return { folder, ext, title: m ? m[1] : base, chapter: m ? Number(m[2]) : null };
}

export function summarizeLibrary(files: LibraryFile[]): LibraryFic[] {
  const groups = new Map<string, { title: string; folder: string; items: (LibraryFile & ReturnType<typeof parts>)[] }>();
  for (const f of files) {
    const p = parts(f);
    const key = `${p.folder}\u0000${p.title.toLowerCase()}`;
    const g = groups.get(key) ?? { title: p.title, folder: p.folder, items: [] };
    g.items.push({ ...f, ...p });
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => a.folder.localeCompare(b.folder) || a.title.localeCompare(b.title)).map((g) => {
    const exts = [...new Set(g.items.map((i) => i.ext))];
    const chapters = g.items.filter((i) => i.chapter !== null).map((i) => i.chapter as number).sort((a, b) => a - b);
    const fileLine = g.items.length === 1 ? `${g.items[0].name} · ${exts[0] || "no extension"}` : `${g.items.length} files · ${exts.join(", ")}`;
    const bad = g.items.find((i) => !(ACCEPTED_EXTENSIONS as readonly string[]).includes(i.ext));
    const big = g.items.find((i) => i.size > MAX_DOCUMENT_BYTES);
    const dup = chapters.find((n, i) => chapters.indexOf(n) !== i);
    const missing = chapters.length ? Array.from({ length: chapters[chapters.length - 1] }, (_, i) => i + 1).filter((n) => !chapters.includes(n)) : [];
    let note = "";
    if (bad) note = `${bad.name} is a ${bad.ext ? `.${bad.ext}` : "type"} file. The reader reads ${ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(" ")}.`;
    else if (big) note = `${big.name} is over 25 MB.`;
    else if (dup !== undefined) note = `Chapter ${dup} appears more than once.`;
    else if (missing.length) note = `Chapter ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? " and more" : ""} not found.`;
    const ready = note === "";
    if (ready) note = chapters.length > 1 ? `All ${chapters.length} chapters found, in order.` : exts.includes("epub") ? "An epub: the whole fic is read from it." : "Readable.";
    return { title: g.title, folder: g.folder || "Fic Library", fileLine, ready, note };
  });
}
