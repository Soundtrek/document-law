import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import type { S3Settings } from "./s3";

type Credentials = Pick<S3Settings, "accessKeyId" | "secretAccessKey">;

function key(env: NodeJS.ProcessEnv): Buffer {
  const encoded = env.SAMMA_STORAGE_CONFIG_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new Error("Storage configuration encryption is unavailable");
  const decoded = Buffer.from(encoded, "base64");
  if (decoded.byteLength !== 32) throw new Error("Storage configuration encryption key must be 32 bytes");
  return decoded;
}

export function encryptStorageCredentials(configurationId: string, credentials: Credentials, env: NodeJS.ProcessEnv = process.env) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(env), nonce);
  cipher.setAAD(Buffer.from(`samma-storage-configuration-v1\0${configurationId}`));
  const payload: Credentials = { accessKeyId: credentials.accessKeyId, secretAccessKey: credentials.secretAccessKey };
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return ["v1", nonce.toString("base64url"), ciphertext.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(":");
}

export function decryptStorageCredentials(configurationId: string, envelope: string, env: NodeJS.ProcessEnv = process.env): Credentials {
  const [version, nonceValue, ciphertextValue, tagValue, extra] = envelope.split(":");
  if (version !== "v1" || !nonceValue || !ciphertextValue || !tagValue || extra !== undefined) throw new Error("Invalid encrypted storage credentials");
  const decipher = createDecipheriv("aes-256-gcm", key(env), Buffer.from(nonceValue, "base64url"));
  decipher.setAAD(Buffer.from(`samma-storage-configuration-v1\0${configurationId}`));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const parsed: unknown = JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || typeof (parsed as Credentials).accessKeyId !== "string" ||
      typeof (parsed as Credentials).secretAccessKey !== "string" || Object.keys(parsed).some(name => !["accessKeyId", "secretAccessKey"].includes(name))) {
    throw new Error("Invalid encrypted storage credentials");
  }
  return parsed as Credentials;
}

export function storageConfigurationFingerprint(settings: S3Settings, env: NodeJS.ProcessEnv = process.env) {
  const canonical = JSON.stringify({ endpoint: settings.endpoint ?? null, region: settings.region, bucket: settings.bucket,
    accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey, forcePathStyle: settings.forcePathStyle, timeoutMs: settings.timeoutMs });
  return createHmac("sha256", key(env)).update("samma-storage-test-v1\0").update(canonical).digest("hex");
}

export function storageLocation(settings: Pick<S3Settings, "endpoint" | "region" | "bucket" | "forcePathStyle">) {
  return JSON.stringify({ endpoint: settings.endpoint ?? null, region: settings.region, bucket: settings.bucket, forcePathStyle: settings.forcePathStyle });
}

export function storageLocationChangeBlocked(current: Pick<S3Settings, "endpoint" | "region" | "bucket" | "forcePathStyle">,
  candidate: Pick<S3Settings, "endpoint" | "region" | "bucket" | "forcePathStyle">, recordFileCount: number) {
  return recordFileCount > 0 && storageLocation(current) !== storageLocation(candidate);
}
