import type { Metadata } from "next";
import { IM_Fell_English_SC, Inclusive_Sans } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import { PREFS_BOOT_SCRIPT } from "@/lib/client/prefs";
import "./tokens.css";
import "./globals.css";

const fancy = IM_Fell_English_SC({ weight: "400", subsets: ["latin"], variable: "--nf-fancy", display: "swap" });
const body = Inclusive_Sans({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--nf-body", display: "swap" });

export const metadata: Metadata = { title: { default: "Tappioca’s reader", template: "%s · Tappioca’s reader" } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fancy.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }} />
      </head>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
