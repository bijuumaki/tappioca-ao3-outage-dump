import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Cover photos up to 5 MB (plus form overhead) and very long chapters go through server actions. */
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
