import JSZip from "jszip";
import mammoth from "mammoth";
import { ConvertError } from "./errors";
import { htmlToChapter } from "./html";
import { extractDataUriImages, type Uploader } from "./images";
import { assertZipSafe } from "./zip";

/* Word documents: bold, italics, underline, headings, lists, links and pictures are kept. */
export async function docxToChapter(buffer: ArrayBuffer, upload: Uploader): Promise<string> {
  let html: string;
  try { assertZipSafe(await JSZip.loadAsync(buffer)); }
  catch (e) { if (e instanceof ConvertError) throw e; throw new ConvertError("That .docx file couldn’t be opened. Is it a real Word document?"); }
  try {
    html = (await mammoth.convertToHtml({ buffer: Buffer.from(buffer) }, { styleMap: ["u => u"] })).value;
  } catch {
    throw new ConvertError("That .docx file couldn’t be opened. Is it a real Word document?");
  }
  return htmlToChapter(await extractDataUriImages(html, upload));
}
