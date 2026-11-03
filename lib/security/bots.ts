/* Crawlers that collect text for AI training or answers, plus scraping and SEO harvesters.
   Search engines (Googlebot, Bingbot) and feed readers are not here: readers still find the site and follow the RSS feed. */
export const AI_CRAWLERS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "Claude-User", "Claude-SearchBot", "anthropic-ai",
  "CCBot", "Google-Extended", "GoogleOther", "Google-CloudVertexBot", "Applebot-Extended", "Bytespider", "TikTokSpider",
  "PerplexityBot", "Perplexity-User", "Amazonbot", "cohere-ai", "cohere-training-data-crawler", "Diffbot",
  "FacebookBot", "meta-externalagent", "meta-externalfetcher", "omgili", "omgilibot", "ImagesiftBot", "Timpibot",
  "YouBot", "AI2Bot", "Ai2Bot-Dolma", "DuckAssistBot", "MistralAI-User", "PanguBot", "Webzio", "Kangaroo Bot",
  "PetalBot", "img2dataset", "Scrapy", "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "BLEXBot", "DataForSeoBot",
];

/* Plain scraping tools and headless browsers that announce themselves. */
const TOOL_PATTERN = /scrapy|python-requests|python-urllib|aiohttp|httpx|go-http-client|libwww-perl|wget|httrack|headlesschrome|phantomjs|node-fetch|undici|okhttp/i;

const NAMED_PATTERN = new RegExp(AI_CRAWLERS.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");

/* On the RSS feeds only the named AI crawlers are turned away: some feed readers fetch with a generic tool, and subscribers must never be blocked. */
export function isBlockedBot(userAgent: string | null | undefined, path = "/"): boolean {
  if (!userAgent) return false;
  const onFeed = path === "/feed.xml" || path.startsWith("/feed/");
  return NAMED_PATTERN.test(userAgent) || (!onFeed && TOOL_PATTERN.test(userAgent));
}
