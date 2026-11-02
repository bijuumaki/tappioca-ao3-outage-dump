import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/* Reader-side client: publishable key, no session. Row-level security decides what it can see. */
export function createReaderClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase URL and publishable key must be set (see .env.example).");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
