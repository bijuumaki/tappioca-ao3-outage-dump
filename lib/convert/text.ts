const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Plain text: blank lines start a new paragraph, single line breaks stay line breaks, symbols stay text. */
export function textToChapter(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim().split(/\n\s*\n/).filter((p) => p.trim())
    .map((p) => `<p>${p.split("\n").map(esc).join("<br />")}</p>`).join("");
}
