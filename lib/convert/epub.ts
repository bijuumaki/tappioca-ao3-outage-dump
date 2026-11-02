import JSZip from "jszip";
import { findAll, findOne, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { countWords } from "@/lib/text/words";
import { ConvertError } from "./errors";
import { htmlToChapter } from "./html";
import { sniffImage, type Uploader } from "./images";
import { assertZipSafe } from "./zip";

export type EpubFic = { title?: string; summary?: string; chapters: { title?: string; html: string }[] };

const dirname = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/") + 1) : "");
const safeDecode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
const unescapeText = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
function resolve(base: string, href: string): string {
  const parts = (base + href.split("#")[0].split("?")[0]).split("/");
  const out: string[] = [];
  for (const part of parts) { if (part === "..") out.pop(); else if (part && part !== ".") out.push(part); }
  return out.join("/");
}

/* A book becomes one fic: chapters in reading order, skipping the contents page and short cover/title pages.
   The book's own title and description are used when it has them. */
export async function epubToFic(buffer: ArrayBuffer, upload: Uploader): Promise<EpubFic> {
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(buffer); } catch { throw new ConvertError("That file isn’t a valid .epub book."); }
  assertZipSafe(zip);
  const container = await zip.file("META-INF/container.xml")?.async("string");
  const opfPath = container?.match(/full-path="([^"]+)"/)?.[1];
  const opfFile = opfPath ? zip.file(opfPath) : null;
  if (!opfPath || !opfFile) throw new ConvertError("That .epub is missing its book description, so it can’t be read.");

  const opf = parseDocument(await opfFile.async("string"), { xmlMode: true });
  const items = new Map(findAll((e) => e.name === "item", opf.children).map((e) => [e.attribs.id, e.attribs]));
  const spine = findAll((e) => e.name === "itemref", opf.children).map((e) => e.attribs.idref);
  const text = (name: string) => { const el = findOne((e) => e.name === name, opf.children); return el ? textContent(el).trim() || undefined : undefined; };
  const base = dirname(opfPath);

  const candidates: { title?: string; html: string; words: number }[] = [];
  for (const id of spine) {
    const item = items.get(id);
    if (!item || /\bnav\b/.test(item.properties ?? "") || !/x?html/.test(item["media-type"] ?? "")) continue;
    const path = resolve(base, safeDecode(item.href ?? ""));
    let xhtml = await zip.file(path)?.async("string");
    if (!xhtml) continue;
    const chapterDir = dirname(path);
    for (const m of [...xhtml.matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi)]) {
      const src = m[1];
      let replacement = "";
      if (!/^(https?:|data:)/i.test(src)) {
        const bytes = await zip.file(resolve(chapterDir, safeDecode(src)))?.async("uint8array");
        const kind = bytes ? sniffImage(bytes) : null;
        if (bytes && kind && bytes.length <= 8 * 1024 * 1024) {
          try { const stored = await upload(bytes, kind.ext); replacement = m[0].replace(src, () => stored); } catch { replacement = ""; }
        }
      }
      xhtml = xhtml.replace(m[0], () => replacement);
    }
    let html = htmlToChapter(xhtml);
    let title: string | undefined;
    const heading = html.match(/^\s*<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/);
    if (heading) {
      title = unescapeText(heading[1].replace(/<[^>]*>/g, "")).trim() || undefined;
      html = html.slice(heading[0].length).trim();
    }
    candidates.push({ title, html, words: countWords(html) });
  }
  const real = candidates.filter((c) => c.words >= 30);
  const chosen = real.length ? real : candidates.filter((c) => c.words > 0);
  if (!chosen.length) throw new ConvertError("That .epub has no chapters with text in them.");
  return { title: text("dc:title"), summary: text("dc:description"), chapters: chosen.map(({ title, html }) => ({ title, html })) };
}
