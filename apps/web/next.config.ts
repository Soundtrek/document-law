import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["samma.co.za", "127.0.0.1"],
  transpilePackages: ["@samma/domain", "@samma/identity", "@samma/storage", "@samma/database"],
};

export default nextConfig;
