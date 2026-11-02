import type { Metadata } from "next";
import AdminHeader from "@/components/admin/AdminHeader";
import CreateStory from "@/components/admin/CreateStory";
import { requireAdmin } from "@/lib/supabase/session";

export const metadata: Metadata = { title: "New Story" };
export const dynamic = "force-dynamic";

export default async function NewStoryPage() {
  await requireAdmin();
  return (
    <main className="a-page">
      <AdminHeader title="New Story" />
      <CreateStory />
    </main>
  );
}
