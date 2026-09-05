import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createPrismaClient } from "@samma/database";
import { createStorageProvider } from "@samma/storage";
const db = createPrismaClient();
const result = JSON.parse(readFileSync("/validation/result.json", "utf8"));
try {
  const companies = await db.company.findMany({ where: { id: { in: [result.companyA, result.companyB] } }, orderBy: { id: "asc" }, include: { members: { orderBy: { id: "asc" }, include: { roleGrants: { orderBy: { id: "asc" } } } }, relationships: { orderBy: { id: "asc" } }, invitations: { orderBy: { id: "asc" } } } });
  const records = await db.record.findMany({ where: { id: { in: result.records.map((record: { recordId: string }) => record.recordId) } }, orderBy: { id: "asc" }, include: { files: { orderBy: { id: "asc" } } } });
  assert.equal(companies.length, 2); assert.equal(records.length, 3);
  for (const company of companies) {
    assert.ok(company.members.some(member => member.status === "ACTIVE"));
    assert.ok(company.relationships.some(relationship => relationship.status === "ACTIVE"));
    assert.ok(company.invitations.some(invitation => invitation.acceptedAt && invitation.relationshipId && invitation.acceptedByAccountId));
  }
  const personIds = companies.flatMap(company => company.relationships.map(relationship => relationship.personId));
  const people = await db.person.findMany({ where: { id: { in: personIds } }, orderBy: { id: "asc" }, include: { account: { include: { identities: { orderBy: { id: "asc" } } } } } });
  assert.ok(people.every(person => person.account.identities.length && person.account.emailVerified));
  assert.equal(process.env.SAMMA_STORAGE_DRIVER, "s3");
  const storage = createStorageProvider();
  for (const record of records) {
    assert.equal(record.files.filter(file => file.isCurrent).length, 1);
    for (const file of record.files) {
      assert.equal(file.scanStatus, "NOT_SCANNED_DEV"); assert.equal(file.checksumSha256, result.checksum);
      assert.match(file.storageKey, /^records\/[0-9a-f-]{36}\/files\/[0-9a-f-]{36}$/);
      const metadata = await storage.metadata(file.storageKey); assert.ok(metadata); assert.equal(metadata.checksumSha256, file.checksumSha256); assert.equal(metadata.sizeBytes, file.sizeBytes);
      const stream = await storage.readAcceptedStream(file.storageKey); assert.ok(stream); const hash = createHash("sha256"); for await (const chunk of stream) hash.update(chunk); assert.equal(hash.digest("hex"), file.checksumSha256);
    }
  }
  const state = createHash("sha256").update(JSON.stringify({ companies, records, people })).digest("hex");
  if (process.argv[2] === "snapshot") writeFileSync("/validation/state.sha256", state, { mode: 0o600 });
  else assert.equal(state, readFileSync("/validation/state.sha256", "utf8"));
  console.log("PASS stable Account/Person identities, companies, memberships, roles, relationships, accepted invitations, Records and RecordFiles; Garage persistent bytes/checksum/opaque keys/NOT_SCANNED_DEV" + (process.argv[2] === "snapshot" ? " (snapshot)" : " unchanged after restart"));
} finally { await db.$disconnect(); }
