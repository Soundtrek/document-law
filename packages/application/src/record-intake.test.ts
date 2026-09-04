import assert from "node:assert/strict";
import test from "node:test";

import {
  syntheticDefinitions,
  syntheticOwnerActor,
  syntheticPayrollActor,
  syntheticRelationship,
} from "@juanity/domain";
import { InMemoryStorageProvider } from "@juanity/storage";

import {
  AllowAllSyntheticScanner,
  FixedClock,
  InMemoryRecordRepository,
  RecordIntakeService,
  SequenceIdGenerator,
  type UploadScanner,
} from "./index.js";

const bytes = new TextEncoder().encode("synthetic PDF bytes");

const buildService = (scanner: UploadScanner = new AllowAllSyntheticScanner()) => {
  const storage = new InMemoryStorageProvider();
  const repository = new InMemoryRecordRepository();
  const service = new RecordIntakeService(
    storage,
    scanner,
    repository,
    new SequenceIdGenerator(),
    new FixedClock("2026-09-05T12:00:00.000Z"),
  );
  return { service, storage, repository };
};

test("authorised role creates a quarantined-scanned-accepted relationship record", async () => {
  const { service, storage, repository } = buildService();
  const result = await service.createRelationshipRecord({
    actor: syntheticPayrollActor,
    relationship: syntheticRelationship,
    definition: syntheticDefinitions[0]!,
    title: "September 2026 payslip",
    periodLabel: "2026-09",
    originalFilename: "synthetic.pdf",
    contentType: "application/pdf",
    bytes,
  });

  assert.equal(result.record.relationshipId, syntheticRelationship.id);
  assert.equal(result.record.retainUntil, "2033-09-05T12:00:00.000Z");
  assert.equal(result.file.scanStatus, "ACCEPTED");
  assert.equal((await storage.metadata(result.file.storageKey))?.state, "ACCEPTED");
  assert.equal(repository.records.length, 1);
  assert.equal(repository.activities.at(-1)?.type, "RECORD_CREATED");
});

test("unauthorised functional role is rejected before storage", async () => {
  const { service, repository } = buildService();
  await assert.rejects(() => service.createRelationshipRecord({
    actor: syntheticPayrollActor,
    relationship: syntheticRelationship,
    definition: syntheticDefinitions[1]!,
    title: "Proof of address",
    originalFilename: "synthetic.pdf",
    contentType: "application/pdf",
    bytes,
  }), /not authorised/);
  assert.equal(repository.records.length, 0);
});

test("rejected scan never creates record metadata", async () => {
  const rejectingScanner: UploadScanner = { async scan() { return "REJECTED"; } };
  const { service, repository } = buildService(rejectingScanner);
  await assert.rejects(() => service.createRelationshipRecord({
    actor: syntheticOwnerActor,
    relationship: syntheticRelationship,
    definition: syntheticDefinitions[1]!,
    title: "Proof of address",
    originalFilename: "synthetic.pdf",
    contentType: "application/pdf",
    bytes,
  }), /failed upload safety checks/);
  assert.equal(repository.records.length, 0);
  assert.equal(repository.activities.at(-1)?.type, "RECORD_FILE_REJECTED");
});
