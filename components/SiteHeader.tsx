import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import TextOptions from "./TextOptions";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="tools">
          <ThemeToggle />
          <TextOptions />
        </div>
        <Link className="site-title" href="/">Tappioca’s reader</Link>
        <nav className="site-nav" aria-label="Site">
          <Link href="/browse">Browse</Link>
          <Link href="/about">About</Link>
          <Link href="/disclaimer">Disclaimer</Link>
          <Link href="/links">Links</Link>
          <Link href="/comms">Comms</Link>
        </nav>
      </div>
    </header>
  );
}
