import mammoth from "mammoth";
import { ConvertError } from "./errors";
import { htmlToChapter } from "./html";
import { extractDataUriImages, type Uploader } from "./images";

/* Word documents: bold, italics, underline, headings, lists, links and pictures are kept. */
export async function docxToChapter(buffer: ArrayBuffer, upload: Uploader): Promise<string> {
  let html: string;
  try {
    html = (await mammoth.convertToHtml({ buffer: Buffer.from(buffer) }, { styleMap: ["u => u"] })).value;
  } catch {
    throw new ConvertError("That .docx file couldn’t be opened. Is it a real Word document?");
  }
  return htmlToChapter(await extractDataUriImages(html, upload));
}
