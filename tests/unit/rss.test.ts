import { describe, expect, it } from "vitest";
import { buildFeed, xmlEscape } from "@/lib/feed/rss";

const fics = [
  { slug: "a-b", title: "A & B", chapters: [{ n: 1, title: null, publishAt: "2026-01-02T00:00:00Z" }, { n: 2, title: "Two <2>", publishAt: "2026-01-03T00:00:00Z" }, { n: 3, title: "Draft", publishAt: null }] },
];

describe("rss feed", () => {
  it("escapes xml characters", () => expect(xmlEscape(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&apos;"));
  it("lists visible chapters newest first with links", () => {
    const xml = buildFeed("https://x.test", { title: "A & B", path: "/feed/a-b.xml", link: "/fics/a-b", fics, withStory: false });
    expect(xml.indexOf("2. Two &lt;2&gt;")).toBeLessThan(xml.indexOf("Chapter 1"));
    expect(xml).toContain("https://x.test/fics/a-b/2");
    expect(xml).not.toContain("Draft");
  });
  it("names the story in the site-wide feed", () => {
    expect(buildFeed("https://x.test", { title: "Site", path: "/feed.xml", link: "/", fics, withStory: true })).toContain("A &amp; B: Chapter 1");
  });
});
