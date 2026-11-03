import { describe, expect, it } from "vitest";
import { isBlockedBot } from "@/lib/security/bots";

describe("isBlockedBot", () => {
  it("blocks named AI crawlers and scraping tools", () => {
    expect(isBlockedBot("Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.2; +https://openai.com/gptbot)")).toBe(true);
    expect(isBlockedBot("Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)")).toBe(true);
    expect(isBlockedBot("CCBot/2.0 (https://commoncrawl.org/faq/)")).toBe(true);
    expect(isBlockedBot("python-requests/2.31.0")).toBe(true);
    expect(isBlockedBot("Scrapy/2.11 (+https://scrapy.org)")).toBe(true);
  });
  it("lets readers, search engines and feed readers through", () => {
    expect(isBlockedBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1")).toBe(false);
    expect(isBlockedBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(false);
    expect(isBlockedBot("Feedly/1.0 (+http://www.feedly.com/fetcher.html)")).toBe(false);
    expect(isBlockedBot("curl/8.4.0")).toBe(false);
    expect(isBlockedBot(null)).toBe(false);
  });
});
