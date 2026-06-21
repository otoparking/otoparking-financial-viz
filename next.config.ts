import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "http://localhost:8080/api/:path*",
      },
      {
        source: "/api/admin/:path*",
        destination: "http://localhost:8082/api/admin/:path*",
      },
    ];
  },
};

export default nextConfig;
