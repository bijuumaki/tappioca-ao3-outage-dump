import Link from "next/link";

/* The site title as a link home. Home hides it with CSS (its big heading is the link), so the server and the browser
   always render the same thing and nothing has to guess the page address. */
export default function SiteTitle() {
  return (
    <div className="site-title-wrap">
      <Link href="/" className="site-title">Tappioca’s Fic Archive</Link>
    </div>
  );
}
