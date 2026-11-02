import { createClient } from "@supabase/supabase-js";

/* Browser client with the public key only. Used to send files straight to storage with a one-time upload address. */
export function browserClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
