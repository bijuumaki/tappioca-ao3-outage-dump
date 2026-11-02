import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <div className="site">
      <main className="page" id="main">
        <h1 className="page-title">Page not found</h1>
        <p>This page doesn’t exist, or it isn’t published yet.</p>
        <p><Link href="/">Back to the home page</Link> or <Link href="/fics">see the fic list</Link>.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
