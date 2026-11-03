"use client";
import { useRouter } from "next/navigation";

/* The Fandom select on the Stories list. It filters as soon as it changes, like the status tabs. */
export default function FandomFilter({ fandoms, value, status }: { fandoms: [string, string][]; value: string; status: string }) {
  const router = useRouter();
  function change(next: string) {
    const q = new URLSearchParams({ ...(status !== "all" ? { status } : {}), ...(next ? { fandom: next } : {}) }).toString();
    router.push(q ? `/admin?${q}` : "/admin");
  }
  return (
    <div className="a-filter">
      <label htmlFor="fandom-filter">Fandom</label>
      <select id="fandom-filter" value={value} onChange={(e) => change(e.target.value)}>
        <option value="">All fandoms</option>
        {fandoms.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
      </select>
    </div>
  );
}
