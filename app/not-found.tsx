import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page" id="main">
      <h1 className="page-title">Page not found</h1>
      <p>This page doesn’t exist, or it isn’t published yet.</p>
      <p><Link href="/">Back to the home page</Link> or <Link href="/browse">browse everything</Link>.</p>
    </main>
  );
}
