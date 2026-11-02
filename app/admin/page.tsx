import { signOut } from "@/lib/admin/auth-actions";
import { requireAdmin } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  await requireAdmin();
  return (
    <main className="a-page">
      <h1 className="a-title">Stories</h1>
      <form action={signOut}><button type="submit" className="a-button">Sign out</button></form>
    </main>
  );
}
