import "server-only";
import { NotScannedDevScanner } from "@samma/application";
import { db } from "./database";
import { configuredStorageProvider } from "./storage-configuration";
export function scanPolicy() {
  if (process.env.SAMMA_ENV !== "development" || process.env.SAMMA_SCAN_POLICY !== "not-scanned-dev") throw new Error("A supported explicit scanner policy is required");
  return { environment: "development", allowUnscannedDev: true };
}
export async function getStorage() { scanPolicy(); return configuredStorageProvider(db); }
export function getScanner() { scanPolicy(); return new NotScannedDevScanner(); }
