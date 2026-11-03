import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/* Server-only client with the secret key. It ignores row-level security, so it is used only where the server has already
   checked the rules itself (posting a comment). Never import this from a client component. */
export function createSecretClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY must be set on the server.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
