import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Database } from "./database.types";

/* Server client that carries the signed-in session in cookies. Row-level security still applies. */
export async function createSessionClient(): Promise<SupabaseClient<Database>> {
  const store = await cookies();
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* read-only during render */ }
      },
    },
  });
}

/* For admin pages and actions: the signed-in admin, or a redirect to the sign-in page. */
export async function requireAdmin(): Promise<{ db: SupabaseClient<Database>; userId: string }> {
  const db = await createSessionClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/admin-login");
  const { data } = await db.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!data) {
    await db.auth.signOut();
    redirect("/admin-login?error=not-admin");
  }
  return { db, userId: user.id };
}
