"use client";
import { useEffect, useState, type ReactNode } from "react";
import { hasAck, setAck } from "@/lib/client/reading-memory";
import { ContentNotice } from "./StoryOverview";

/* On Mature and Explicit stories the chapter text is not shown until the reader has accepted the content notice.
   It is a courtesy notice, not access control: the server still sends the text inside the page data. A browser that cannot save settings sees the notice every time. */
export default function ChapterGate({ slug, adult, ratingLabel, warnings, children }: {
  slug: string; adult: boolean; ratingLabel: string; warnings: string[]; children: ReactNode;
}) {
  const [acked, setAcked] = useState(false);
  useEffect(() => { setAcked(hasAck(slug)); }, [slug]);
  if (!adult || acked) return <>{children}</>;
  return (
    <ContentNotice ratingLabel={ratingLabel} warnings={warnings} backHref={`/fics/${slug}`}
      onAccept={() => { setAck(slug); setAcked(true); }} />
  );
}
