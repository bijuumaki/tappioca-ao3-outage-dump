"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [["/admin", "Stories"], ["/admin/comments", "Comments"], ["/admin/uploads", "Uploads"], ["/admin/pages", "Pages"]] as const;

/* The row of section links under every admin header. The current one is filled. */
export default function AdminSections() {
  const path = usePathname();
  const current = (href: string) => (href === "/admin" ? path === "/admin" || path.startsWith("/admin/stories") : path.startsWith(href));
  return (
    <nav aria-label="Admin sections" className="a-sections">
      {SECTIONS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={current(href) ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
