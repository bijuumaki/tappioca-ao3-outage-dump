/* Text files are read as UTF-8; an old Windows-1252 file (Word's "Save as HTML") is read as that instead of turning
   curly quotes into garbage. A byte-order mark is removed. */
export function decodeText(buffer: ArrayBuffer): string {
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch { text = new TextDecoder("windows-1252").decode(buffer); }
  return text.replace(/^\uFEFF/, "");
}
