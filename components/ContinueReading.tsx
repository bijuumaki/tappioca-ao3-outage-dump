"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { lastPlace } from "@/lib/client/reading-memory";

/* "Continue reading" on Home: the story and chapter this browser opened last. Nothing for a first-time visitor. */
export default function ContinueReading() {
  const [place, setPlace] = useState<ReturnType<typeof lastPlace>>(null);
  useEffect(() => { setPlace(lastPlace()); }, []);
  if (!place) return null;
  return (
    <section aria-labelledby="resume-heading" className="resume-card">
      <div className="resume-text">
        <h2 id="resume-heading">Continue reading</h2>
        <p className="resume-title">{place.title}</p>
        <p className="muted resume-where">Chapter {place.n} of {place.count}</p>
      </div>
      <Link href={`/fics/${place.slug}/${place.n}`} className="story-primary resume-button">Resume</Link>
    </section>
  );
}
