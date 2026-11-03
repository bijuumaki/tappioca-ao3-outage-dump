import type { MetadataRoute } from "next";
import { AI_CRAWLERS } from "@/lib/security/bots";

/* Search engines may index the public pages; named AI and scraping crawlers are told to stay out entirely. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: ["/admin", "/admin-login", "/preview"] },
    ],
  };
}
