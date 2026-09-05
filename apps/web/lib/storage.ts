import "server-only";
import { createStorageProvider, type StorageProvider } from "@samma/storage";
import { NotScannedDevScanner } from "@samma/application";
let provider: StorageProvider | undefined;
export function scanPolicy() {
  if (process.env.SAMMA_ENV !== "development" || process.env.SAMMA_SCAN_POLICY !== "not-scanned-dev") throw new Error("A supported explicit scanner policy is required");
  return { environment: "development", allowUnscannedDev: true };
}
export function getStorage() { scanPolicy(); return provider ??= createStorageProvider(); }
export function getScanner() { scanPolicy(); return new NotScannedDevScanner(); }
