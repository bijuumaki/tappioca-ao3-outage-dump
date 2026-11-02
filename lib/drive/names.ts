const clean = (s: string) => s.replace(/[\/\\]+/g, "-").replace(/\.{2,}/g, ".").replace(/\s+/g, " ").replace(/^[.\s]+/, "").trim();
/* Cut to a length counted the way the Drive bridge counts it (JavaScript string length), without ever splitting an
   emoji or other two-part character in half. */
function cut(s: string, max: number): string {
  let out = "";
  for (const ch of s) { if (out.length + ch.length > max) break; out += ch; }
  return out;
}

/* The Drive folder for a fic: its fandom, or "Unsorted". Safe for the bridge (no slashes, no "..", at most 80 characters). */
export function fandomFolderName(fandom: string | null | undefined): string {
  return cut(clean(fandom ?? ""), 80).trim() || "Unsorted";
}

/* A file name the bridge will accept: slashes and ".." removed, no leading dot, no dots or spaces left hanging before the
   extension ("Title....md" becomes "Title.md"), at most 150 characters, extension kept. */
export function safeDriveName(name: string): string {
  const m = name.match(/^(.*)\.([A-Za-z0-9]+)$/);
  const ext = m ? m[2].toLowerCase() : "";
  const room = 150 - (ext ? ext.length + 1 : 0);
  const base = cut(clean(m ? m[1] : name), room).replace(/[.\s]+$/, "") || "file";
  return base + (ext ? `.${ext}` : "");
}
