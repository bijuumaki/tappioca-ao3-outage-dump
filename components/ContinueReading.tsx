"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { liveMarks } from "@/lib/client/notes-store";
import { lastPlace } from "@/lib/client/reading-memory";

/* "Continue reading" (the story and chapter this browser opened last) and "My highlights" on Home, side by side.
   Both are for returning readers: nothing shows for a first-time visitor. My highlights also shows once someone has highlighted something. */
export default function ContinueReading() {
  const [place, setPlace] = useState<ReturnType<typeof lastPlace>>(null);
  const [hasMarks, setHasMarks] = useState(false);
  useEffect(() => { setPlace(lastPlace()); setHasMarks(liveMarks().length > 0); }, []);
  if (!place && !hasMarks) return null;
  return (
    <div className="resume-row">
      {place && (
        <section aria-labelledby="resume-heading" className="resume-card">
          <div className="resume-text">
            <h2 id="resume-heading"><Link href={`/fics/${place.slug}/${place.n}`} className="card-link">Continue reading</Link></h2>
            <p className="resume-title">{place.title}</p>
            <p className="muted resume-where">Chapter {place.n} of {place.count}</p>
          </div>
        </section>
      )}
      <section aria-labelledby="highlights-heading" className="resume-card">
        <div className="resume-text">
          <h2 id="highlights-heading"><Link href="/highlights" className="card-link">My highlights</Link></h2>
          <p className="muted resume-where">Your highlights and notes</p>
        </div>
      </section>
    </div>
  );
}
