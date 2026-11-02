import { htmlToChapter } from "@/lib/convert/html";
import { countWords } from "@/lib/text/words";

/* What gets stored for a chapter body: cleaned into the allowed formatting (the editor, pasted HTML and uploads all
   come through here), plus its word count. */
export function prepareChapter(html: string): { body: string; word_count: number } {
  const body = htmlToChapter(html);
  return { body, word_count: countWords(body) };
}
