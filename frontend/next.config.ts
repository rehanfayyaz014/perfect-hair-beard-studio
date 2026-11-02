import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  allowedDevOrigins: ["192.168.0.114", "192.168.18.22"],
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${process.env.CATALOG_API_PROXY_TARGET ?? "http://127.0.0.1:8000/api"}/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
