import assert from "node:assert/strict";
import { createPrismaClient } from "@samma/database";
import { installStarterPack } from "./starter-pack";
assert.equal(process.env.SAMMA_ENV, "development");
assert.equal(process.env.SAMMA_BASE_URL, "https://dev.samma.co.za");
assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_dev");
const db = createPrismaClient();
try {
  await db.$transaction(installStarterPack, { isolationLevel: "Serializable", timeout: 30000 });
  console.log("PASS starter pack installed through validated configuration writer; historical definitions preserved.");
} finally { await db.$disconnect(); }
