"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* The site title as a link home, on every page except Home (where the big heading is the link). */
export default function SiteTitle() {
  if (usePathname() === "/") return null;
  return (
    <div className="site-title-wrap">
      <Link href="/" className="site-title">Tappioca’s Fic Archive</Link>
    </div>
  );
}
