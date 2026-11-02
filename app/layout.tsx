import type { Metadata } from "next";
import { IM_Fell_English, Inclusive_Sans } from "next/font/google";
import DisplayOptions from "@/components/DisplayOptions";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { PREFS_BOOT_SCRIPT } from "@/lib/client/prefs";
import "./tokens.css";
import "./globals.css";

const heading = IM_Fell_English({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--nf-heading", display: "swap" });
const body = Inclusive_Sans({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--nf-body", display: "swap" });

export const metadata: Metadata = { title: { default: "Tappioca’s Fic Archive", template: "%s · Tappioca’s Fic Archive" } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }} />
      </head>
      <body>
        <div className="site">
          <SiteNav />
          <DisplayOptions />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
