import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Tappioca’s Fic Archive" }, robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin">{children}</div>;
}
