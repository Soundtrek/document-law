import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "samma-web",
    mode: process.env.SAMMA_ENV ?? "development",
    storage: process.env.SAMMA_STORAGE_DRIVER ?? "memory",
  });
}
