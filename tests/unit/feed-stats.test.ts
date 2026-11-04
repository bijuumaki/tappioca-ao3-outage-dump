import { describe, expect, it } from "vitest";
import { feedKey, parseFeedAgent, summarize, type FeedHit } from "@/lib/feed/stats";

describe("feed stats", () => {
  it("reads the app and its follower count", () => {
    expect(parseFeedAgent("Feedly/1.0 (+http://www.feedly.com/fetcher.html; 12 subscribers; like FeedFetcher-Google)")).toEqual({ app: "Feedly", subs: 12 });
    expect(parseFeedAgent("Mozilla/5.0 (Macintosh) Safari/605").app).toBe("Web browser");
    expect(parseFeedAgent("NetNewsWire (RSS Reader; https://netnewswire.com/)").app).toBe("NetNewsWire");
  });
  it("names feeds", () => {
    expect(feedKey("/feed.xml")).toBe("all");
    expect(feedKey("/feed/my-fic.xml")).toBe("my-fic");
    expect(feedKey("/fics/x")).toBeNull();
  });
  it("counts repeat readers and reported followers", () => {
    const h = (day: string, visitor: string, app = "Other feed reader", subs = 0, feed = "all"): FeedHit => ({ day, feed, visitor, app, subs });
    const r = summarize([
      h("2026-11-01", "a"), h("2026-11-02", "a"), h("2026-11-02", "b"), h("2026-11-02", "c", "Web browser"),
      h("2026-11-01", "f", "Feedly", 3), h("2026-11-02", "f", "Feedly", 5),
    ]);
    expect(r.total.regular).toBe(1);
    expect(r.total.claimed).toBe(5);
    expect(r.total.subscribers).toBe(6);
    expect(r.total.seenOnce).toBe(1);
    expect(r.total.browsers).toBe(1);
  });
});
