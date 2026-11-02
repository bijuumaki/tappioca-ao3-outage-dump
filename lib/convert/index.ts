import { countWords } from "@/lib/text/words";
import { docxToChapter } from "./docx";
import { epubToFic } from "./epub";
import { ConvertError } from "./errors";
import { htmlToChapter } from "./html";
import { extractDataUriImages, type Uploader } from "./images";
import { markdownToChapter, type MarkdownMeta } from "./markdown";
import { parseChapterFilename } from "./names";
import { ACCEPTED_EXTENSIONS } from "./index-constants";
import { textToChapter } from "./text";

export { ConvertError } from "./errors";
export { ACCEPTED_EXTENSIONS, MAX_DOCUMENT_BYTES } from "./index-constants";

export type Converted = { title: string; summary?: string; chapters: { title?: string; html: string }[]; meta?: MarkdownMeta };

const decode = (b: ArrayBuffer) => new TextDecoder("utf-8").decode(b).replace(/^﻿/, "");

/* Any accepted file becomes chapter HTML in the site's allowed format. Throws ConvertError with a message to show. */
export async function convertFile(name: string, buffer: ArrayBuffer, upload: Uploader): Promise<Converted> {
  const { title, ext } = parseChapterFilename(name);
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new ConvertError(`“${name}” isn’t a type I can read. Use .html, .md, .txt, .docx or .epub.`);
  }
  let result: Converted;
  if (ext === "epub") {
    const book = await epubToFic(buffer, upload);
    result = { title: book.title ?? title, summary: book.summary, chapters: book.chapters };
  } else if (ext === "docx") {
    result = { title, chapters: [{ html: await docxToChapter(buffer, upload) }] };
  } else if (ext === "md" || ext === "markdown") {
    const { html, meta } = markdownToChapter(decode(buffer));
    result = { title: meta.title ?? title, summary: meta.summary, chapters: [{ html: await extractDataUriImages(html, upload) }], meta };
  } else if (ext === "txt") {
    result = { title, chapters: [{ html: textToChapter(decode(buffer)) }] };
  } else {
    result = { title, chapters: [{ html: htmlToChapter(await extractDataUriImages(decode(buffer), upload)) }] };
  }
  if (!result.chapters.some((c) => countWords(c.html) > 0 || /<img\b/.test(c.html))) throw new ConvertError(`“${name}” has no text in it.`);
  return result;
}
