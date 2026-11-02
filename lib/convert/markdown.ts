import { marked } from "marked";
import { htmlToChapter } from "./html";

export type MarkdownMeta = Partial<Record<"title" | "fandom" | "rating" | "relationships" | "characters" | "warnings" | "summary" | "tags", string>>;
const META_KEYS = ["title", "fandom", "rating", "relationships", "characters", "warnings", "summary", "tags"] as const;

/* A line made only of three or more dashes, stars, tildes or ornament symbols (spaces ignored) is a scene break.
   Checked in one pass, so a very long line can't make it slow. */
const SCENE_ONLY = /^[⁂*•~·_=\-]{3,}$/;

/* Markdown to HTML before cleaning, so pictures embedded in the file can be stored first. */
export function markdownToRaw(md: string): { raw: string; meta: MarkdownMeta } {
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
  const lines = text.split("\n").map((l) => (SCENE_ONLY.test(l.replace(/[ \t]/g, "")) ? "\n---\n" : l));
  return { raw: marked.parse(lines.join("\n"), { async: false, gfm: true }) as string, meta };
}

export function markdownToChapter(md: string): { html: string; meta: MarkdownMeta } {
  const { raw, meta } = markdownToRaw(md);
  return { html: htmlToChapter(raw), meta };
}
