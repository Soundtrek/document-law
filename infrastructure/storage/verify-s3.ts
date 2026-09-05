import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createStorageProvider, createRecordObjectKey, sha256 } from "@samma/storage";
const provider = createStorageProvider();
const key = createRecordObjectKey(randomUUID(), randomUUID());
const bytes = new TextEncoder().encode("%PDF-1.4 Synthetic private S3 probe\n%%EOF\n");
try {
  await provider.ready();
  const object = await provider.putQuarantined({ key, contentType: "application/pdf", bytes });
  assert.equal(object.checksumSha256, sha256(bytes)); assert.equal(await provider.readAccepted(key), null);
  await provider.accept(key); assert.deepEqual(await provider.readAccepted(key), Buffer.from(bytes));
  await assert.rejects(() => provider.putQuarantined({ key, contentType: "application/pdf", bytes }));
  console.log("PASS real S3 bucket authentication, put/head/get/copy, quarantine read denial, checksum and immutable key");
} finally { await provider.delete(key); assert.equal(await provider.metadata(key), null); }
console.log("PASS real S3 delete and absence check");
