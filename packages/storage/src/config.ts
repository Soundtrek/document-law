import { InMemoryStorageProvider } from "./index";
import { S3StorageProvider, type S3Settings } from "./s3";
export function storageSettings(env: NodeJS.ProcessEnv): { driver: "memory" } | { driver: "s3"; s3: S3Settings } {
  if (env.SAMMA_STORAGE_DRIVER === "memory" && (env.NODE_ENV === "test" || (env.SAMMA_ENV === "development" && env.NODE_ENV !== "production"))) return { driver: "memory" };
  if (env.SAMMA_STORAGE_DRIVER !== "s3") throw new Error("A valid explicit storage driver is required");
  const required = (name: string) => { const value = env[name]?.trim(); if (!value) throw new Error(`Missing ${name}`); return value; };
  const endpoint = env.SAMMA_S3_ENDPOINT?.trim();
  if (endpoint) {
    const url = new URL(endpoint);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || !["https:", "http:"].includes(url.protocol) || (url.protocol === "http:" && env.SAMMA_ENV !== "development")) throw new Error("Invalid S3 endpoint");
  }
  const pathStyle = required("SAMMA_S3_FORCE_PATH_STYLE");
  if (!["true", "false"].includes(pathStyle)) throw new Error("Invalid S3 path style");
  const bucket = required("SAMMA_S3_BUCKET");
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error("Invalid S3 bucket");
  const timeoutMs = Number(env.SAMMA_S3_REQUEST_TIMEOUT_MS ?? 10000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) throw new Error("Invalid S3 timeout");
  return { driver: "s3", s3: { ...(endpoint ? { endpoint } : {}), region: required("SAMMA_S3_REGION"), bucket,
    accessKeyId: required("SAMMA_S3_ACCESS_KEY_ID"), secretAccessKey: required("SAMMA_S3_SECRET_ACCESS_KEY"), forcePathStyle: pathStyle === "true", timeoutMs } };
}
export function createStorageProvider(env: NodeJS.ProcessEnv = process.env) {
  const settings = storageSettings(env);
  return settings.driver === "memory" ? new InMemoryStorageProvider() : new S3StorageProvider(settings.s3);
}
