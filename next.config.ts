import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "puppeteer"],
  experimental: {
    serverActions: {
      // Uploads (plans, fittings, photos) go through server actions. Next's
      // default cap is 1 MB, which silently 413s anything bigger; plans allow
      // 50 MB (see MAX_PLAN_BYTES) so give the transport headroom above that.
      bodySizeLimit: "60mb",
    },
  },
};

export default nextConfig;
