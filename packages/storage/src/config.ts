import { InMemoryStorageProvider } from "./index";
import { S3StorageProvider, type S3Settings } from "./s3";

export interface S3ConfigurationInput {
  endpoint?: string | undefined;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  timeoutMs?: number;
}

export function validatedS3Settings(input: S3ConfigurationInput, options: { development: boolean; allowedHosts?: readonly string[] } ): S3Settings {
  const endpoint = input.endpoint?.trim() || undefined;
  if (endpoint) {
    const url = new URL(endpoint);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || !["https:", "http:"].includes(url.protocol) ||
        (url.protocol === "http:" && !options.development)) throw new Error("Invalid S3 endpoint");
    if (options.allowedHosts && !options.allowedHosts.includes(url.hostname.toLowerCase())) throw new Error("S3 endpoint is not approved");
  }
  const required = (value: string, field: string) => { const result = value.trim(); if (!result) throw new Error(`Missing ${field}`); return result; };
  const bucket = required(input.bucket, "bucket");
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error("Invalid S3 bucket");
  const region = required(input.region, "region");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(region)) throw new Error("Invalid S3 region");
  const accessKeyId = required(input.accessKeyId, "access key");
  const secretAccessKey = required(input.secretAccessKey, "secret key");
  if (accessKeyId.length > 512 || secretAccessKey.length > 2048) throw new Error("Invalid S3 credentials");
  const timeoutMs = input.timeoutMs ?? 10000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) throw new Error("Invalid S3 timeout");
  return { ...(endpoint ? { endpoint: new URL(endpoint).href } : {}), region, bucket, accessKeyId, secretAccessKey,
    forcePathStyle: input.forcePathStyle, timeoutMs };
}

export function storageSettings(env: NodeJS.ProcessEnv): { driver: "memory" } | { driver: "s3"; s3: S3Settings } {
  if (env.SAMMA_STORAGE_DRIVER === "memory" && (env.NODE_ENV === "test" || (env.SAMMA_ENV === "development" && env.NODE_ENV !== "production"))) return { driver: "memory" };
  if (env.SAMMA_STORAGE_DRIVER !== "s3") throw new Error("A valid explicit storage driver is required");
  const required = (name: string) => { const value = env[name]?.trim(); if (!value) throw new Error(`Missing ${name}`); return value; };
  const pathStyle = required("SAMMA_S3_FORCE_PATH_STYLE");
  if (!["true", "false"].includes(pathStyle)) throw new Error("Invalid S3 path style");
  return { driver: "s3", s3: validatedS3Settings({ endpoint: env.SAMMA_S3_ENDPOINT, region: required("SAMMA_S3_REGION"),
    bucket: required("SAMMA_S3_BUCKET"), accessKeyId: required("SAMMA_S3_ACCESS_KEY_ID"), secretAccessKey: required("SAMMA_S3_SECRET_ACCESS_KEY"),
    forcePathStyle: pathStyle === "true", timeoutMs: Number(env.SAMMA_S3_REQUEST_TIMEOUT_MS ?? 10000) }, { development: env.SAMMA_ENV === "development" }) };
}
export function createStorageProvider(env: NodeJS.ProcessEnv = process.env) {
  const settings = storageSettings(env);
  return settings.driver === "memory" ? new InMemoryStorageProvider() : new S3StorageProvider(settings.s3);
}
