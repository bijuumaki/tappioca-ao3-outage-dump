/* Chapter notes are written as plain text in the admin and stored as simple HTML for the reader. */
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Blank lines start a new paragraph; single line breaks stay line breaks; < & > stay text. */
export function notesToHtml(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim().split(/\n\s*\n/).filter((p) => p.trim())
    .map((p) => `<p>${p.split("\n").map((line) => escape(line)).join("<br />")}</p>`).join("");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", "#x27": "'", nbsp: " " };

/* Back to plain text for the textarea; older rich notes lose their formatting but keep their words. */
export function htmlToNotes(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x27|#39|amp|lt|gt|quot|nbsp);/g, (_m, e: string) => ENTITIES[e])
    .trim();
}
