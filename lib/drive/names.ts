const clean = (s: string) => s.replace(/[\/\\]+/g, "-").replace(/\.{2,}/g, ".").replace(/\s+/g, " ").replace(/^[.\s]+/, "").trim();

/* The Drive folder for a fic: its fandom, or "Unsorted". Safe for the bridge (no slashes, no "..", at most 80 characters). */
export function fandomFolderName(fandom: string | null | undefined): string {
  return clean(fandom ?? "").slice(0, 80).trim() || "Unsorted";
}

/* A file name the bridge will accept: slashes and ".." removed, no leading dot, at most 150 characters, extension kept. */
export function safeDriveName(name: string): string {
  const m = name.match(/^(.*)\.([A-Za-z0-9]+)$/);
  const ext = m ? m[2].toLowerCase() : "";
  const base = clean(m ? m[1] : name) || "file";
  const room = 150 - (ext ? ext.length + 1 : 0);
  return base.slice(0, room).trim() + (ext ? `.${ext}` : "");
}
