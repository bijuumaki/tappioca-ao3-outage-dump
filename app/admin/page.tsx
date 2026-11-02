import AdminHeader from "@/components/admin/AdminHeader";
import { signOut } from "@/lib/admin/auth-actions";
import { requireAdmin } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  await requireAdmin();
  return (
    <main className="a-page">
      <AdminHeader title="Stories">
        <form action={signOut}><button type="submit" className="a-button">Sign out</button></form>
      </AdminHeader>
    </main>
  );
}
