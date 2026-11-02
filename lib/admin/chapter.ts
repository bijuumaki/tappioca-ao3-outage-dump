import { sanitizeRichText } from "@/lib/richtext/allowlist";
import { countWords } from "@/lib/text/words";

/* What gets stored for a chapter body: the allowed formatting only, plus its word count. */
export function prepareChapter(html: string): { body: string; word_count: number } {
  const body = sanitizeRichText(html);
  return { body, word_count: countWords(body) };
}
