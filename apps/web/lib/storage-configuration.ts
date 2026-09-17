import "server-only";
import { randomUUID } from "node:crypto";
import { createRecordObjectKey, decryptStorageCredentials, encryptStorageCredentials, S3StorageProvider, storageConfigurationFingerprint,
  storageLocationChangeBlocked, storageSettings, validatedS3Settings, type S3Settings, type StorageProvider } from "@samma/storage";
import type { createPrismaClient } from "@samma/database";

type Database = ReturnType<typeof createPrismaClient>;
type StorageRow = Awaited<ReturnType<Database["storageConfiguration"]["findUnique"]>>;

export type StorageConfigurationInput = {
  label: string;
  endpoint?: string | undefined;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  requestTimeoutMs: number;
};

export class StorageConfigurationError extends Error {
  constructor(readonly code: "invalid" | "not_found" | "test_required" | "migration_required" | "connection_failed") { super(code); }
}

const allowedHosts = (env: NodeJS.ProcessEnv) => (env.SAMMA_S3_ALLOWED_HOSTS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);

function settingsFromInput(input: StorageConfigurationInput, env: NodeJS.ProcessEnv): S3Settings {
  const label = input.label.trim();
  if (!label || label.length > 100) throw new StorageConfigurationError("invalid");
  try {
    return validatedS3Settings({ endpoint: input.endpoint, region: input.region, bucket: input.bucket,
      accessKeyId: input.accessKeyId, secretAccessKey: input.secretAccessKey, forcePathStyle: input.forcePathStyle,
      timeoutMs: input.requestTimeoutMs }, { development: env.SAMMA_ENV === "development", allowedHosts: allowedHosts(env) });
  } catch { throw new StorageConfigurationError("invalid"); }
}

function settingsFromRow(row: NonNullable<StorageRow>, env: NodeJS.ProcessEnv): S3Settings {
  const credentials = decryptStorageCredentials(row.id, row.encryptedCredentials, env);
  try {
    return validatedS3Settings({ endpoint: row.endpoint ?? undefined, region: row.region, bucket: row.bucket, ...credentials,
      forcePathStyle: row.forcePathStyle, timeoutMs: row.requestTimeoutMs },
    { development: env.SAMMA_ENV === "development", allowedHosts: allowedHosts(env) });
  } catch { throw new StorageConfigurationError("invalid"); }
}

const publicRow = (row: NonNullable<StorageRow>) => ({ id: row.id, label: row.label, provider: row.provider,
  endpoint: row.endpoint, region: row.region, bucket: row.bucket, forcePathStyle: row.forcePathStyle,
  requestTimeoutMs: row.requestTimeoutMs, status: row.status, lastTestedAt: row.lastTestedAt,
  activatedAt: row.activatedAt, updatedAt: row.updatedAt });

export async function storageConfigurationOverview(db: Database, env: NodeJS.ProcessEnv = process.env) {
  const rows = await db.storageConfiguration.findMany({ where: { status: { in: ["ACTIVE", "DRAFT"] } }, orderBy: { updatedAt: "desc" }, take: 20 });
  let environment: ReturnType<typeof publicRow> | { id: "environment"; label: string; provider: string; endpoint: string | null; region: string; bucket: string; forcePathStyle: boolean; requestTimeoutMs: number; status: "ACTIVE"; lastTestedAt: null; activatedAt: null; updatedAt: null } | null = null;
  if (!rows.some(row => row.status === "ACTIVE")) {
    const configured = storageSettings(env);
    if (configured.driver === "s3") environment = { id: "environment", label: "Environment configuration", provider: "S3",
      endpoint: configured.s3.endpoint ?? null, region: configured.s3.region, bucket: configured.s3.bucket,
      forcePathStyle: configured.s3.forcePathStyle, requestTimeoutMs: configured.s3.timeoutMs, status: "ACTIVE",
      lastTestedAt: null, activatedAt: null, updatedAt: null };
  }
  return { active: rows.find(row => row.status === "ACTIVE") ? publicRow(rows.find(row => row.status === "ACTIVE")!) : environment,
    drafts: rows.filter(row => row.status === "DRAFT").map(publicRow), allowedHosts: allowedHosts(env) };
}

export async function saveStorageConfiguration(db: Database, actorAccountId: string, input: StorageConfigurationInput, env: NodeJS.ProcessEnv = process.env) {
  const settings = settingsFromInput(input, env);
  const id = randomUUID();
  const encryptedCredentials = encryptStorageCredentials(id, settings, env);
  const row = await db.$transaction(async tx => {
    const created = await tx.storageConfiguration.create({ data: { id, label: input.label.trim(), endpoint: settings.endpoint ?? null,
      region: settings.region, bucket: settings.bucket, forcePathStyle: settings.forcePathStyle, requestTimeoutMs: settings.timeoutMs,
      encryptedCredentials, createdByAccountId: actorAccountId } });
    await tx.activityEvent.create({ data: { type: "STORAGE_CONFIGURATION_CREATED", actorAccountId, summary: "Storage configuration draft created." } });
    return created;
  });
  return publicRow(row);
}

async function probe(settings: S3Settings) {
  const provider = new S3StorageProvider(settings);
  await provider.ready();
  const marker = randomUUID().replaceAll("-", "");
  const key = createRecordObjectKey(`storagetest${marker}`, `probe${marker}`);
  let created = false;
  try {
    await provider.putQuarantined({ key, contentType: "application/octet-stream", bytes: new TextEncoder().encode("SAMMA synthetic storage readiness probe") });
    created = true;
    await provider.accept(key);
    if (!await provider.readAccepted(key)) throw new Error("Storage probe read failed");
  } finally {
    if (created) await provider.delete(key);
  }
}

export async function testStorageConfiguration(db: Database, actorAccountId: string, id: string, env: NodeJS.ProcessEnv = process.env) {
  const row = await db.storageConfiguration.findUnique({ where: { id } });
  if (!row || row.status !== "DRAFT") throw new StorageConfigurationError("not_found");
  const settings = settingsFromRow(row, env);
  try {
    await probe(settings);
    const testedAt = new Date();
    await db.$transaction(async tx => {
      await tx.storageConfiguration.update({ where: { id }, data: { lastTestedAt: testedAt, lastTestFingerprint: storageConfigurationFingerprint(settings, env) } });
      await tx.activityEvent.create({ data: { type: "STORAGE_CONFIGURATION_TEST_PASSED", actorAccountId, summary: "Storage configuration connection and object-operation test passed." } });
    });
    return { testedAt };
  } catch {
    await db.activityEvent.create({ data: { type: "STORAGE_CONFIGURATION_TEST_FAILED", actorAccountId, summary: "Storage configuration connection test failed." } });
    throw new StorageConfigurationError("connection_failed");
  }
}

export async function activateStorageConfiguration(db: Database, actorAccountId: string, id: string, env: NodeJS.ProcessEnv = process.env) {
  const candidate = await db.storageConfiguration.findUnique({ where: { id } });
  if (!candidate || candidate.status !== "DRAFT") throw new StorageConfigurationError("not_found");
  const settings = settingsFromRow(candidate, env);
  const fingerprint = storageConfigurationFingerprint(settings, env);
  if (!candidate.lastTestedAt || candidate.lastTestFingerprint !== fingerprint || Date.now() - candidate.lastTestedAt.getTime() > 15 * 60 * 1000) {
    throw new StorageConfigurationError("test_required");
  }
  await db.$transaction(async tx => {
    const fresh = await tx.storageConfiguration.findUnique({ where: { id } });
    if (!fresh || fresh.status !== "DRAFT" || fresh.lastTestFingerprint !== fingerprint || !fresh.lastTestedAt ||
        Date.now() - fresh.lastTestedAt.getTime() > 15 * 60 * 1000) throw new StorageConfigurationError("test_required");
    const current = await tx.storageConfiguration.findFirst({ where: { status: "ACTIVE" } });
    let currentSettings: S3Settings;
    if (current) currentSettings = settingsFromRow(current, env);
    else {
      const configured = storageSettings(env);
      if (configured.driver !== "s3") throw new StorageConfigurationError("invalid");
      currentSettings = configured.s3;
    }
    if (storageLocationChangeBlocked(currentSettings, settings, await tx.recordFile.count())) throw new StorageConfigurationError("migration_required");
    if (current) await tx.storageConfiguration.update({ where: { id: current.id }, data: { status: "RETIRED" } });
    await tx.storageConfiguration.update({ where: { id }, data: { status: "ACTIVE", activatedAt: new Date(), activatedByAccountId: actorAccountId } });
    await tx.activityEvent.create({ data: { type: "STORAGE_CONFIGURATION_ACTIVATED", actorAccountId, summary: "Tested storage configuration activated." } });
  }, { isolationLevel: "Serializable" });
}

let cached: { key: string; provider: StorageProvider } | undefined;
export async function configuredStorageProvider(db: Database, env: NodeJS.ProcessEnv = process.env): Promise<StorageProvider> {
  const row = await db.storageConfiguration.findFirst({ where: { status: "ACTIVE" } });
  if (!row) {
    if (cached?.key === "environment") return cached.provider;
    const configured = storageSettings(env);
    const provider = configured.driver === "memory" ? (() => { throw new Error("Deployed storage cannot use memory"); })() : new S3StorageProvider(configured.s3);
    cached = { key: "environment", provider };
    return provider;
  }
  const cacheKey = `${row.id}:${row.updatedAt.toISOString()}`;
  if (cached?.key === cacheKey) return cached.provider;
  const provider = new S3StorageProvider(settingsFromRow(row, env));
  cached = { key: cacheKey, provider };
  return provider;
}
