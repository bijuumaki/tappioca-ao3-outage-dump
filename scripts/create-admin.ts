/* Makes an email address the site's admin. If the account doesn't exist yet, Supabase emails an invite
   with a link to set a password. Usage: npx tsx scripts/create-admin.ts you@example.com
   Needs SUPABASE_SECRET_KEY in .env.local. The address is never stored in the repo. */
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const email = process.argv[2];
if (!email) throw new Error("Give the email address: npx tsx scripts/create-admin.ts you@example.com");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: list, error } = await db.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  const { data, error: e } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.SITE_URL ?? "https://tappiocarchive.vercel.app"}/admin/set-password`,
  });
  if (e) throw e;
  user = data.user;
  console.log("Invite sent.");
} else {
  console.log("Account already exists.");
}
const { error: e2 } = await db.from("admins").upsert({ user_id: user.id });
if (e2) throw e2;
console.log("Admin access granted.");
