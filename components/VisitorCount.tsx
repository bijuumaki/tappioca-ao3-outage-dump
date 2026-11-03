"use client";
import { useEffect, useState } from "react";

/* The site-wide visitor total from GoatCounter. Shows nothing until it arrives, and nothing at all if it can't be read
   (GoatCounter's setting "Allow adding visitor counts on your website" has to be on). */
export default function VisitorCount() {
  const [count, setCount] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch("https://tappioca.goatcounter.com/counter/TOTAL.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { count?: string } | null) => { if (live && j?.count) setCount(j.count); })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);
  if (!count) return null;
  return <span className="visitor-count muted">{count === "1" ? "1 visitor" : `${count} visitors`}</span>;
}
