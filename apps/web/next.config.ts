import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  transpilePackages: ["@starter/leaderboard-api"],
  serverExternalPackages: ["@libsql/client"],
  env: {
    NEXT_PUBLIC_BUILD_TIMESTAMP: new Date().toISOString(),
  },
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
