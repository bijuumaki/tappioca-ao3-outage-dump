import type { Metadata } from "next";
import { IM_Fell_English, Inclusive_Sans } from "next/font/google";
import { PREFS_BOOT_SCRIPT } from "@/lib/client/prefs";
import NavProgress from "@/components/NavProgress";
import "./tokens.css";
import "./globals.css";

const heading = IM_Fell_English({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--nf-heading", display: "swap" });
const body = Inclusive_Sans({ weight: ["400", "500", "600", "700"], style: ["normal", "italic"], subsets: ["latin"], variable: "--nf-body", display: "swap" });

const DESCRIPTION = "tappioca’s ao3 outage stowage bin";

export const metadata: Metadata = {
  metadataBase: new URL("https://tappiocarchive.vercel.app"),
  title: { default: "Tappioca’s Fic Archive", template: "%s · Tappioca’s Fic Archive" },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "Tappioca’s Fic Archive", description: DESCRIPTION },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html data-scroll-behavior="smooth" lang="en" className={`${heading.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }} />
      </head>
      <body><NavProgress />{children}</body>
    </html>
  );
}
