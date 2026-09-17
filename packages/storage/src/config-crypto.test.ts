import assert from "node:assert/strict";
import test from "node:test";
import { decryptStorageCredentials, encryptStorageCredentials, storageConfigurationFingerprint, storageLocation, storageLocationChangeBlocked } from "./config-crypto";

const env = { SAMMA_STORAGE_CONFIG_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64") };
const settings = { endpoint: "https://storage.example.test/", region: "test", bucket: "synthetic-bucket",
  accessKeyId: "synthetic-access", secretAccessKey: "synthetic-secret", forcePathStyle: true, timeoutMs: 1000 };

test("storage credentials encrypt with authenticated configuration binding", () => {
  const encrypted = encryptStorageCredentials("configuration-a", settings, env);
  assert.equal(encrypted.includes(settings.accessKeyId), false);
  assert.equal(encrypted.includes(settings.secretAccessKey), false);
  assert.deepEqual(decryptStorageCredentials("configuration-a", encrypted, env), {
    accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey,
  });
  assert.throws(() => decryptStorageCredentials("configuration-b", encrypted, env));
  assert.throws(() => decryptStorageCredentials("configuration-a", encrypted.replace(/.$/, "x"), env));
});

test("test fingerprint covers credentials while location identity does not", () => {
  const rotated = { ...settings, accessKeyId: "rotated", secretAccessKey: "rotated" };
  assert.notEqual(storageConfigurationFingerprint(settings, env), storageConfigurationFingerprint({ ...settings, secretAccessKey: "rotated" }, env));
  assert.equal(storageLocation(settings), storageLocation(rotated));
  assert.notEqual(storageLocation(settings), storageLocation({ ...settings, bucket: "other-bucket" }));
});

test("storage encryption key must be a valid 32-byte value", () => {
  assert.throws(() => encryptStorageCredentials("configuration-a", settings, {}));
  assert.throws(() => encryptStorageCredentials("configuration-a", settings, { SAMMA_STORAGE_CONFIG_ENCRYPTION_KEY: Buffer.alloc(16).toString("base64") }));
});

test("an existing RecordFile blocks physical storage location changes", () => {
  assert.equal(storageLocationChangeBlocked(settings, settings, 1), false);
  assert.equal(storageLocationChangeBlocked(settings, { ...settings, bucket: "other-bucket" }, 0), false);
  assert.equal(storageLocationChangeBlocked(settings, { ...settings, bucket: "other-bucket" }, 1), true);
  assert.equal(storageLocationChangeBlocked(settings, { ...settings, endpoint: "https://other.example.test/" }, 10), true);
});
