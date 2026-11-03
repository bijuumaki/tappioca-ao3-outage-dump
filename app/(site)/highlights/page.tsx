import type { Metadata } from "next";
import HighlightsList from "@/components/HighlightsList";

export const metadata: Metadata = { title: "My highlights", robots: { index: false } };

export default function Highlights() {
  return (
    <main className="page" id="main">
      <h1 className="page-title">My highlights</h1>
      <HighlightsList />
    </main>
  );
}
