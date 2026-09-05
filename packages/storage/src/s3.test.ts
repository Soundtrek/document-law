import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, CopyObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { S3StorageProvider, type S3Settings } from "./s3";
import { collect, createRecordObjectKey, createStorageProvider, sha256, storageSettings } from "./index";
const settings: S3Settings = { endpoint: "http://storage.test:3900", region: "garage", bucket: "synthetic-bucket", accessKeyId: "synthetic", secretAccessKey: "synthetic", forcePathStyle: true, timeoutMs: 1000 };
function harness() {
  const objects = new Map<string, { bytes: Uint8Array; Metadata: Record<string, string>; ContentType: string }>();
  let unavailable = false, corrupt = false;
  const calls: string[] = [];
  const client = { async send(command: PutObjectCommand | GetObjectCommand | HeadObjectCommand | CopyObjectCommand | DeleteObjectCommand | HeadBucketCommand) {
    calls.push(command.constructor.name);
    if (unavailable) throw new Error("Unavailable");
    if (command instanceof HeadBucketCommand) return {};
    const key = command.input.Key!;
    if (command instanceof PutObjectCommand) {
      const bytes = await collect(command.input.Body as AsyncIterable<Uint8Array>);
      objects.set(key, { bytes, Metadata: command.input.Metadata!, ContentType: command.input.ContentType! }); return {};
    }
    if (command instanceof DeleteObjectCommand) { objects.delete(key); return {}; }
    const row = objects.get(key);
    if (!row) throw { $metadata: { httpStatusCode: 404 } };
    if (command instanceof HeadObjectCommand) return { ...row, ContentLength: row.bytes.byteLength };
    if (command instanceof GetObjectCommand) return { Body: Readable.from([corrupt ? Buffer.from("corrupt") : row.bytes]) };
    if (command instanceof CopyObjectCommand) { row.Metadata = command.input.Metadata!; return {}; }
    throw new Error("Unexpected command");
  } } as unknown as S3Client;
  return { provider: new S3StorageProvider(settings, client), objects, calls, fail: () => { unavailable = true; }, corrupt: () => { corrupt = true; } };
}
const key = createRecordObjectKey("c54c3e53-e798-47fd-ae17-84ec8fba4b38", "ad078a0a-f57e-4076-ae1e-9e1a9259e208");
const bytes = new TextEncoder().encode("%PDF-1.4 Synthetic only");
test("S3 streaming put/readback, quarantine, acceptance, immutable payload, checksum, get and delete", async () => {
  const h = harness(); await h.provider.ready();
  const source = { sizeBytes: bytes.byteLength, checksumSha256: sha256(bytes), async *open() { yield bytes.subarray(0, 5); yield bytes.subarray(5); } };
  assert.equal((await h.provider.putQuarantined({ key, contentType: "application/pdf", source })).checksumSha256, sha256(bytes));
  assert.equal(await h.provider.readAccepted(key), null);
  await assert.rejects(() => h.provider.putQuarantined({ key, contentType: "application/pdf", bytes }), /already exists/);
  await h.provider.accept(key);
  assert.deepEqual(await h.provider.readAccepted(key), Buffer.from(bytes));
  await assert.rejects(() => h.provider.reject(key), /transition/);
  const second = createRecordObjectKey("c54c3e53-e798-47fd-ae17-84ec8fba4b38", "ee4ae980-f91e-4c79-8246-de3cc56b5d45");
  await h.provider.putQuarantined({ key: second, contentType: "application/pdf", bytes }); await h.provider.accept(second);
  assert.equal(h.objects.size, 2); assert.equal((await h.provider.metadata(key))?.state, "ACCEPTED");
  await h.provider.delete(second); assert.equal(await h.provider.metadata(second), null);
  assert.ok(!key.includes("pdf") && !key.includes("@"));
});
test("S3 corrupted quarantine readback cleans the fresh object", async () => {
  const h = harness(); h.corrupt();
  await assert.rejects(() => h.provider.putQuarantined({ key, contentType: "application/pdf", bytes }), /mismatch/);
  assert.equal(h.objects.size, 0);
});
test("S3 failures propagate without memory fallback; malformed metadata fails closed", async () => {
  const h = harness(); h.fail();
  await assert.rejects(() => h.provider.ready(), /Unavailable/);
  await assert.rejects(() => h.provider.putQuarantined({ key, contentType: "application/pdf", bytes }), /Unavailable/);
  await assert.rejects(() => h.provider.readAccepted(key), /Unavailable/);
  assert.equal(h.objects.size, 0);
  const valid = harness(); valid.objects.set(key, { bytes, ContentType: "application/pdf", Metadata: { state: "ACCEPTED" } });
  await assert.rejects(() => valid.provider.readAccepted(key), /metadata/);
});
const env = { SAMMA_ENV: "development", SAMMA_STORAGE_DRIVER: "s3", SAMMA_S3_ENDPOINT: settings.endpoint!, SAMMA_S3_BUCKET: settings.bucket, SAMMA_S3_REGION: "garage", SAMMA_S3_ACCESS_KEY_ID: "test", SAMMA_S3_SECRET_ACCESS_KEY: "test", SAMMA_S3_FORCE_PATH_STYLE: "true" };
test("strict explicit configuration, no production memory, no missing-key or unknown-driver fallback", () => {
  assert.equal(storageSettings(env).driver, "s3");
  for (const name of ["SAMMA_STORAGE_DRIVER", "SAMMA_S3_BUCKET", "SAMMA_S3_REGION", "SAMMA_S3_ACCESS_KEY_ID", "SAMMA_S3_SECRET_ACCESS_KEY", "SAMMA_S3_FORCE_PATH_STYLE"]) {
    const broken: NodeJS.ProcessEnv = { ...env }; delete broken[name]; assert.throws(() => createStorageProvider(broken));
  }
  for (const values of [{ SAMMA_STORAGE_DRIVER: "other" }, { SAMMA_S3_FORCE_PATH_STYLE: "yes" }, { SAMMA_S3_ENDPOINT: "https://user:secret@storage.test" }, { SAMMA_S3_REQUEST_TIMEOUT_MS: "NaN" }, { SAMMA_ENV: "production" }]) assert.throws(() => storageSettings({ ...env, ...values }));
  assert.throws(() => createStorageProvider({ SAMMA_STORAGE_DRIVER: "memory", NODE_ENV: "production", SAMMA_ENV: "development" }));
});
