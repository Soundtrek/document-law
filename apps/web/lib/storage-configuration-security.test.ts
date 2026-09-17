import assert from "node:assert/strict";
import test from "node:test";
import { storageConfigurationCsrf, validStorageConfigurationCsrf } from "./storage-configuration-security";

test("storage configuration CSRF is session-bound and rejects malformed values", () => {
  const value = storageConfigurationCsrf("synthetic-secret", "session-a");
  assert.equal(validStorageConfigurationCsrf("synthetic-secret", "session-a", value), true);
  assert.equal(validStorageConfigurationCsrf("synthetic-secret", "session-b", value), false);
  assert.equal(validStorageConfigurationCsrf("other-secret", "session-a", value), false);
  assert.equal(validStorageConfigurationCsrf("synthetic-secret", "session-a", null), false);
  assert.equal(validStorageConfigurationCsrf("synthetic-secret", "session-a", "not-a-token"), false);
});
