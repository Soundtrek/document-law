import { NextResponse } from "next/server";

import { builtVersion } from "../../../lib/built-version";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    ...(builtVersion.showOverlay && builtVersion.build ? { build: builtVersion.build } : {}),
    check: "liveness",
    service: "samma-web",
    mode: process.env.SAMMA_ENV ?? "development",
    storage: process.env.SAMMA_STORAGE_DRIVER ?? "unconfigured",
  });
}
