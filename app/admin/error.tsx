"use client";
import Link from "next/link";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="a-page a-narrow">
      <h1 className="a-title">Something went wrong</h1>
      <p>Your last saved writing is safe. Unsaved text is also kept in this browser and comes back when you reopen the chapter.</p>
      <div className="a-row">
        <button type="button" className="a-button-primary" onClick={reset}>Try again</button>
        <Link href="/admin" className="a-button">Back to all stories</Link>
      </div>
    </main>
  );
}
