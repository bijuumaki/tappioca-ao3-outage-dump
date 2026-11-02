import { marked } from "marked";
import { htmlToChapter } from "./html";

export type MarkdownMeta = Partial<Record<"title" | "fandom" | "rating" | "relationships" | "characters" | "warnings" | "summary" | "tags", string>>;
const META_KEYS = ["title", "fandom", "rating", "relationships", "characters", "warnings", "summary", "tags"] as const;

/* Lines made only of dashes, stars, tildes or ornament symbols (three or more) are scene breaks. */
const SCENE_LINE = /^[ \t]*(?=(?:[^ \t]*[⁂*•~·_=\-][^ \t]*[ \t]*){3,}$)[⁂*•~·_=\- \t]+$/;

export function markdownToChapter(md: string): { html: string; meta: MarkdownMeta } {
  let text = md.replace(/\r\n?/g, "\n").replace(/^﻿/, "");
  const meta: MarkdownMeta = {};
  const fm = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const key = line.slice(0, i).trim().toLowerCase() as (typeof META_KEYS)[number];
      if ((META_KEYS as readonly string[]).includes(key)) meta[key] = line.slice(i + 1).trim();
    }
    text = text.slice(fm[0].length);
  }
  const lines = text.split("\n").map((l) => (SCENE_LINE.test(l) && l.replace(/[ \t]/g, "").length >= 3 ? "\n---\n" : l));
  const html = marked.parse(lines.join("\n"), { async: false, gfm: true }) as string;
  return { html: htmlToChapter(html), meta };
}
