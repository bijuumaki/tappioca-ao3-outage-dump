import "server-only";
import { createHash } from "node:crypto";
import { createSecretClient } from "@/lib/supabase/secret";
import { feedKey, parseFeedAgent } from "./stats";

/* Notes that a feed reader fetched a feed. Only a salted hash of the address + app is kept (never the address), one row per
   reader per feed per day. A failure here must never slow down or break the feed. */
export async function logFeedHit(path: string, ip: string, userAgent: string | null): Promise<void> {
  try {
    const feed = feedKey(path);
    if (!feed) return;
    const { app, subs } = parseFeedAgent(userAgent);
    const salt = process.env.COMMENT_HASH_SALT ?? process.env.SUPABASE_SECRET_KEY ?? "";
    const visitor = createHash("sha256").update(`${salt}:feed:${ip}:${app}`).digest("hex").slice(0, 32);
    await createSecretClient().from("feed_hits").upsert(
      { day: new Date().toISOString().slice(0, 10), feed, visitor, app, subs },
      { onConflict: "day,feed,visitor", ignoreDuplicates: true },
    );
  } catch { /* the feed still works without it */ }
}
