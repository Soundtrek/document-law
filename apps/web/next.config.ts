import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@juanity/domain", "@juanity/storage"],
};

export default nextConfig;
