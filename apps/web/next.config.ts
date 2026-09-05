import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@samma/domain", "@samma/identity", "@samma/storage"],
};

export default nextConfig;
