"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createStory } from "@/lib/admin/actions";

/* Creates the draft only once this page is actually open (never from a link prefetch), then opens it. */
export default function CreateStory() {
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    createStory().then((id) => router.replace(`/admin/stories/${id}`)).catch(() => setFailed(true));
  }, [router]);
  return <p className="a-muted" role="status">{failed ? "Couldn’t start a new story. Reload to try again." : "Starting a new story…"}</p>;
}
