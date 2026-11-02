export type ImageKind = { type: string; ext: string };

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);
const ascii = (b: Uint8Array, at: number, len: number) => String.fromCharCode(...b.slice(at, at + len));

/* What a file really is, from its first bytes (never from its name or declared type). Only these five are allowed. */
export function sniffImage(b: Uint8Array): ImageKind | null {
  if (b.length < 12) return null;
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { type: "image/png", ext: "png" };
  if (startsWith(b, [0xff, 0xd8, 0xff])) return { type: "image/jpeg", ext: "jpg" };
  if (ascii(b, 0, 4) === "GIF8") return { type: "image/gif", ext: "gif" };
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return { type: "image/webp", ext: "webp" };
  if (ascii(b, 4, 4) === "ftyp" && /^(avif|avis)$/.test(ascii(b, 8, 4))) return { type: "image/avif", ext: "avif" };
  return null;
}

export type Uploader = (bytes: Uint8Array, ext: string) => Promise<string>;

/* Pictures embedded in a document (data: addresses) are stored as image files and replaced by their address.
   An "image" whose bytes aren't really one of the allowed image types is removed. */
export async function extractDataUriImages(html: string, upload: Uploader): Promise<string> {
  const re = /<img\b[^>]*?\bsrc="(data:[^"]*)"[^>]*>/gi;
  const found = [...html.matchAll(re)];
  let out = html;
  for (const m of found) {
    const comma = m[1].indexOf(",");
    const bytes = comma > 0 && /;base64$/i.test(m[1].slice(0, comma)) ? new Uint8Array(Buffer.from(m[1].slice(comma + 1), "base64")) : new Uint8Array();
    const kind = sniffImage(bytes);
    if (!kind || bytes.length > 8 * 1024 * 1024) { out = out.replace(m[0], ""); continue; }
    let url: string;
    try { url = await upload(bytes, kind.ext); } catch { out = out.replace(m[0], ""); continue; }
    out = out.replace(m[0], m[0].replace(m[1], url));
  }
  return out;
}
