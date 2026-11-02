import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import "./admin.css";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Tappioca’s Fic Archive" }, robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
