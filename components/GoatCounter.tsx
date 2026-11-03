"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SITE = "https://tappioca.goatcounter.com";

declare global {
  interface Window { goatcounter?: { count?: (vars: { path: string }) => void } }
}

/* GoatCounter visitor counting for the reader pages only (never the admin). The page counts itself once on load,
   and every move to another page inside the site is counted here, because the browser doesn't reload for those. */
export default function GoatCounter() {
  const path = usePathname();
  useEffect(() => {
    const send = () => window.goatcounter?.count?.({ path });
    if (window.goatcounter?.count) send();
    else window.addEventListener("goatcounter-ready", send, { once: true });
    return () => window.removeEventListener("goatcounter-ready", send);
  }, [path]);
  return (
    <Script
      src="https://gc.zgo.at/count.js" strategy="afterInteractive" data-goatcounter={`${SITE}/count`}
      data-goatcounter-settings='{"no_onload": true}'
      onLoad={() => window.dispatchEvent(new Event("goatcounter-ready"))}
    />
  );
}
