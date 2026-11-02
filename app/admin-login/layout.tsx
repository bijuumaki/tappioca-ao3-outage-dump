import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import "../admin/admin.css";

export const metadata: Metadata = { title: { default: "Sign in", template: "%s · Admin · Tappioca’s Fic Archive" }, robots: { index: false } };

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
