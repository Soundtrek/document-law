import { NextResponse } from "next/server";
import { db } from "../../../lib/database";
import { getStorage } from "../../../lib/storage";
export const dynamic = "force-dynamic";
let cached: { at: number; database: boolean; storage: boolean } | undefined;
let pending: Promise<void> | undefined;
export async function GET() {
  if (!cached || Date.now() - cached.at > 5000) {
    pending ??= (async () => {
      const results = await Promise.allSettled([
        db.$transaction(async tx => { await tx.$executeRaw`SET LOCAL statement_timeout = '3000ms'`; await tx.$queryRaw`SELECT 1`; }, { maxWait: 3000, timeout: 4000 }),
        Promise.resolve().then(() => getStorage().ready()),
      ]);
      cached = { at: Date.now(), database: results[0].status === "fulfilled", storage: results[1].status === "fulfilled" };
    })().finally(() => { pending = undefined; });
    await pending;
  }
  const ready = Boolean(cached?.database && cached?.storage);
  return NextResponse.json({ status: ready ? "ready" : "unavailable", database: cached?.database ?? false, storage: cached?.storage ?? false,
    provider: process.env.SAMMA_STORAGE_DRIVER ?? "unconfigured" }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
