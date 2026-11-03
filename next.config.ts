import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Cover photos up to 5 MB (plus form overhead) and very long chapters go through server actions. */
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  /* Asks AI companies not to train on the text or the pictures (honored by some, ignored by others; proxy.ts blocks the named crawlers). */
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noai, noimageai" }] }];
  },
};

export default nextConfig;
