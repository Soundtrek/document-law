import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "juanity-law-web",
    mode: process.env.JUANITY_ENV ?? "development",
    storage: process.env.JUANITY_STORAGE_DRIVER ?? "memory",
  });
}
