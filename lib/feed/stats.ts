/* Reading the RSS feed's visitors. A feed reader checks the feed again and again, so someone seen on several different days is
   very likely a subscriber; a big service (Feedly and others) says in its name how many people follow through it. */
export type FeedHit = { day: string; feed: string; visitor: string; app: string; subs: number };

const APPS: [RegExp, string][] = [
  [/feedly/i, "Feedly"], [/inoreader/i, "Inoreader"], [/newsblur/i, "NewsBlur"], [/feedbin/i, "Feedbin"], [/miniflux/i, "Miniflux"],
  [/netnewswire/i, "NetNewsWire"], [/reeder/i, "Reeder"], [/freshrss/i, "FreshRSS"], [/tiny ?tiny ?rss|tt-rss/i, "Tiny Tiny RSS"],
  [/theoldreader/i, "The Old Reader"], [/feeder\b/i, "Feeder"], [/flipboard/i, "Flipboard"], [/thunderbird/i, "Thunderbird"],
  [/newsboat/i, "Newsboat"], [/feedspot/i, "Feedspot"], [/feedreader|rss ?reader|rssbot|feedfetcher|feed/i, "Other feed reader"],
];
export const BROWSER = "Web browser";

/* The reader app's name and how many followers it says it has ("Feedly/1.0 (… 12 subscribers)"). */
export function parseFeedAgent(userAgent: string | null | undefined): { app: string; subs: number } {
  const ua = userAgent ?? "";
  const subs = Number(/(\d{1,7})\s+(?:subscribers?|followers?|readers?)/i.exec(ua)?.[1] ?? 0);
  for (const [re, name] of APPS) if (re.test(ua)) return { app: name, subs };
  return { app: /mozilla|chrome|safari|firefox|edg\//i.test(ua) ? BROWSER : "Other", subs };
}

export const feedKey = (path: string): string | null => {
  if (path === "/feed.xml") return "all";
  const m = /^\/feed\/([a-z0-9-]+)(?:\.xml)?$/i.exec(path);
  return m ? m[1].toLowerCase() : null;
};

export type FeedSummary = {
  feed: string; subscribers: number; regular: number; claimed: number; seenOnce: number; browsers: number;
  apps: { app: string; people: number }[];
};

/* `hits` should already be limited to the recent window. A "regular" is a visitor (not a browser) seen on 2 or more days. */
export function summarize(hits: FeedHit[]): { total: FeedSummary; feeds: FeedSummary[]; days: { day: string; readers: number }[] } {
  const one = (feed: string, rows: FeedHit[]): FeedSummary => {
    const days = new Map<string, Set<string>>();
    const appOf = new Map<string, string>();
    const claim = new Map<string, { day: string; subs: number }>();
    for (const r of rows) {
      if (!days.has(r.visitor)) days.set(r.visitor, new Set());
      days.get(r.visitor)!.add(r.day);
      appOf.set(r.visitor, r.app);
      if (r.subs > 0) {
        const key = `${r.app}|${r.feed}`;
        const cur = claim.get(key);
        if (!cur || r.day > cur.day || (r.day === cur.day && r.subs > cur.subs)) claim.set(key, { day: r.day, subs: r.subs });
      }
    }
    const claimedApps = new Set([...claim.keys()].map((k) => k.split("|")[0]));
    let regular = 0, seenOnce = 0, browsers = 0;
    const people = new Map<string, number>();
    for (const [v, d] of days) {
      const app = appOf.get(v) ?? "Other";
      if (app === BROWSER) { browsers++; continue; }
      if (claimedApps.has(app)) continue;
      if (d.size >= 2) { regular++; people.set(app, (people.get(app) ?? 0) + 1); } else seenOnce++;
    }
    const claimed = [...claim.values()].reduce((n, c) => n + c.subs, 0);
    for (const k of claim.keys()) { const [app] = k.split("|"); people.set(app, (people.get(app) ?? 0) + claim.get(k)!.subs); }
    return {
      feed, subscribers: regular + claimed, regular, claimed, seenOnce, browsers,
      apps: [...people.entries()].map(([app, n]) => ({ app, people: n })).sort((a, b) => b.people - a.people),
    };
  };
  const byFeed = new Map<string, FeedHit[]>();
  for (const h of hits) byFeed.set(h.feed, [...(byFeed.get(h.feed) ?? []), h]);
  const feeds = [...byFeed.entries()].map(([f, rows]) => one(f, rows)).sort((a, b) => b.subscribers - a.subscribers || a.feed.localeCompare(b.feed));
  const perDay = new Map<string, Set<string>>();
  for (const h of hits) { if (!perDay.has(h.day)) perDay.set(h.day, new Set()); perDay.get(h.day)!.add(h.visitor); }
  const days = [...perDay.entries()].map(([day, s]) => ({ day, readers: s.size })).sort((a, b) => b.day.localeCompare(a.day));
  return { total: one("total", hits), feeds, days };
}
