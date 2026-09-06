import type { NextConfig } from "next";

import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";
import { buildSnapshot } from "./lib/build-metadata";

const nextConfig = (phase: string): NextConfig => ({
  env: phase === PHASE_PRODUCTION_BUILD || phase === PHASE_DEVELOPMENT_SERVER
    ? { SAMMA_COMPILED_BUILD: JSON.stringify(buildSnapshot(process.env)) } : {},
  devIndicators: false,
  allowedDevOrigins: ["samma.co.za", "127.0.0.1"],
  transpilePackages: ["@samma/domain", "@samma/identity", "@samma/storage", "@samma/database", "@samma/application"],
});

export default nextConfig;
