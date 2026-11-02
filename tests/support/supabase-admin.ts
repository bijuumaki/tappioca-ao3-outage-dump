import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/* Test-only helpers. They use the secret key, which bypasses row-level security: never import from app code. */
export const TEST_ADMIN = { email: "e2e-admin@tappioca.test", password: process.env.E2E_ADMIN_PASSWORD ?? "" };
export const TEST_READER = { email: "e2e-reader@tappioca.test", password: process.env.E2E_ADMIN_PASSWORD ?? "" };

export const hasSecret = () => !!process.env.SUPABASE_SECRET_KEY && !!process.env.E2E_ADMIN_PASSWORD;

export function secretClient(): SupabaseClient<Database> {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/* Creates the user if missing (email already confirmed) and returns its id. */
export async function ensureUser(email: string, password: string): Promise<string> {
  const db = secretClient();
  const { data: list, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const found = list.users.find((u) => u.email === email);
  if (found) {
    await db.auth.admin.updateUserById(found.id, { password });
    return found.id;
  }
  const { data, error: e2 } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (e2) throw e2;
  return data.user.id;
}

export async function ensureAdmin(email: string, password: string): Promise<string> {
  const id = await ensureUser(email, password);
  const { error } = await secretClient().from("admins").upsert({ user_id: id });
  if (error) throw error;
  return id;
}

/* A client signed in as the given user, using the publishable key (so row-level security applies). */
export async function signedInClient(email: string, password: string): Promise<SupabaseClient<Database>> {
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return db;
}
