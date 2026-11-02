"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [["/", "Home"], ["/disclaimer", "Disclaimer"], ["/about", "About"], ["/fics", "Fic List"], ["/links", "Links"]] as const;

export default function SiteNav() {
  const path = usePathname();
  return (
    <nav aria-label="Site" className="site-nav">
      {ITEMS.map(([href, label]) => {
        const current = href === "/" ? path === "/" : path === href;
        return <Link key={href} href={href} aria-current={current ? "page" : undefined}>{label}</Link>;
      })}
    </nav>
  );
}
