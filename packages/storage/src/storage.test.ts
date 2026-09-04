import assert from "node:assert/strict";
import test from "node:test";

import { createRecordObjectKey, InMemoryStorageProvider } from "./index.js";

test("opaque object key contains only technical identifiers", () => {
  assert.equal(createRecordObjectKey("rec_123", "file_456"), "records/rec_123/files/file_456");
  assert.throws(() => createRecordObjectKey("Phil Venter", "file_456"));
});

test("quarantined objects cannot be read before acceptance", async () => {
  const provider = new InMemoryStorageProvider();
  const key = createRecordObjectKey("rec_123", "file_456");
  const bytes = new TextEncoder().encode("synthetic file content");

  const stored = await provider.putQuarantined({ key, contentType: "application/pdf", bytes });
  assert.equal(stored.state, "QUARANTINED");
  assert.equal(await provider.readAccepted(key), null);

  const accepted = await provider.accept(key);
  assert.equal(accepted.state, "ACCEPTED");
  assert.equal(new TextDecoder().decode(await provider.readAccepted(key) ?? new Uint8Array()), "synthetic file content");
});
