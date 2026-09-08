import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { createPrismaClient } from "@samma/database";
import { InMemoryStorageProvider } from "@samma/storage";
import { NotScannedDevScanner, RecordIntakeService, InMemoryRecordRepository, FixedClock, SequenceIdGenerator } from "@samma/application";
import { allowedRelationshipDefinitions, persistRelationshipUpload, uploadContext } from "../../apps/web/lib/record-service";
import { authoriseUploadRequest } from "../../apps/web/lib/record-upload-request";
import { canReadStoredRecord, domainDefinition, isDownloadableFile } from "../../apps/web/lib/record-access";
import { personRecords, relationshipRecords } from "../../apps/web/lib/record-queries";

assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_employment_test");
const db = createPrismaClient(), prefix = `sharing-${randomUUID()}`, id = (name: string) => `${prefix}-${name}`;
const accounts = ["person", "outsider", "hr", "owner", "other-hr", "unlinked"];
const bytes = Buffer.from("%PDF-1.4\nSynthetic Person sharing fixture only.\n%%EOF\n");
const source = { sizeBytes: bytes.length, checksumSha256: createHash("sha256").update(bytes).digest("hex"), open: async function* () { yield bytes; } };
const policy = { environment: "development", allowUnscannedDev: true };
const input = () => ({ accountId: id("person"), relationshipId: id("relationship"), definitionId: id("version-PERSON_TO_COMPANY"),
  actorKind: "PERSON" as const, title: "Synthetic sharing", filename: "synthetic.pdf", contentType: "application/pdf", source, sessionToken: id("session") });
const stored = (recordId: string) => db.record.findUniqueOrThrow({ where: { id: recordId }, include: { definitionVersion: true } });
const context = (account = "person", version = "PERSON_TO_COMPANY") => uploadContext(db, id(account), id("relationship"), id(`version-${version}`), undefined, "PERSON");

before(async () => {
  for (const name of accounts) await db.account.create({ data: { id: id(name), primaryEmail: `${id(name)}@example.test`, emailVerified: true,
    ...(name !== "unlinked" ? { person: { create: { id: id(`person-${name}`), displayName: `Synthetic ${name}` } } } : {}) } });
  await db.accountIdentity.create({ data: { id: id("identity"), accountId: id("person"), provider: "https://synthetic.invalid", providerSubject: id("subject") } });
  await db.authSession.create({ data: { sessionToken: id("session"), accountId: id("person"), identityId: id("identity"), expires: new Date(Date.now() + 3600000) } });
  for (const role of ["HR", "OWNER"]) await db.functionalRoleDefinition.create({ data: { id: id(role), code: id(role), label: role, capabilities: [] } });
  for (const company of ["company", "other-company"]) await db.company.create({ data: { id: id(company), name: `Synthetic ${company}` } });
  for (const [account, company, role] of [["hr", "company", "HR"], ["owner", "company", "OWNER"], ["other-hr", "other-company", "HR"]]) {
    await db.companyMember.create({ data: { id: id(`member-${account}`), accountId: id(account!), companyId: id(company!), status: "ACTIVE",
      roleGrants: { create: { id: id(`grant-${account}`), functionalRoleId: id(role!) } } } });
  }
  await db.personCompanyRelationship.create({ data: { id: id("relationship"), companyId: id("company"), personId: id("person-person"), status: "ACTIVE", relationshipType: "EMPLOYMENT" } });
  for (const direction of ["PERSON_TO_COMPANY", "COMPANY_TO_PERSON", "INTERNAL_COMPANY", "BIDIRECTIONAL"] as const) {
    await db.recordDefinition.create({ data: { id: id(`definition-${direction}`), key: id(direction), versions: { create: { id: id(`version-${direction}`), version: 1,
      name: `Synthetic ${direction}`, category: "TEST", context: "RELATIONSHIP", direction, classification: "SENSITIVE", personVisible: true, allowedCompanyRoles: [id("HR")] } } } });
  }
});

after(async () => {
  await db.activityEvent.deleteMany({ where: { actorAccountId: { in: accounts.map(id) } } });
  await db.record.deleteMany({ where: { companyId: { in: [id("company"), id("other-company")] } } });
  await db.personCompanyRelationship.deleteMany({ where: { id: id("relationship") } });
  await db.company.deleteMany({ where: { id: { in: [id("company"), id("other-company")] } } });
  await db.recordDefinitionVersion.deleteMany({ where: { recordDefinitionId: { startsWith: prefix } } });
  await db.recordDefinition.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.functionalRoleDefinition.deleteMany({ where: { id: { in: [id("HR"), id("OWNER")] } } });
  await db.person.deleteMany({ where: { accountId: { in: accounts.map(id) } } });
  await db.account.deleteMany({ where: { id: { in: accounts.map(id) } } });
  await db.$disconnect();
});

test("Person selector contains only active PERSON_TO_COMPANY; company selector excludes Person direction", async () => {
  assert.deepEqual((await allowedRelationshipDefinitions(db, id("person"), id("relationship"), "PERSON")).map(d => d.direction), ["PERSON_TO_COMPANY"]);
  assert.equal((await allowedRelationshipDefinitions(db, id("hr"), id("relationship"))).length, 3);
  assert.equal((await allowedRelationshipDefinitions(db, id("owner"), id("relationship"))).length, 0);
  for (const direction of ["COMPANY_TO_PERSON", "INTERNAL_COMPANY", "BIDIRECTIONAL"]) await assert.rejects(() => context("person", direction));
});

test("unrelated and unlinked Accounts cannot use Person context", async () => {
  for (const name of ["outsider", "hr", "unlinked"]) await assert.rejects(() => context(name));
});

for (const status of ["PENDING", "FORMER", "ENDED"] as const) test(`${status} relationship denies selector and upload`, async () => {
  await db.personCompanyRelationship.update({ where: { id: id("relationship") }, data: { status } });
  try {
    assert.deepEqual(await allowedRelationshipDefinitions(db, id("person"), id("relationship"), "PERSON"), []);
    await assert.rejects(() => context());
  } finally { await db.personCompanyRelationship.update({ where: { id: id("relationship") }, data: { status: "ACTIVE" } }); }
});

test("inactive Account, unverified email, company, definition and version deny Person upload", async () => {
  const changes = [
    { apply: () => db.account.update({ where: { id: id("person") }, data: { status: "SUSPENDED" } }), restore: () => db.account.update({ where: { id: id("person") }, data: { status: "ACTIVE" } }) },
    { apply: () => db.account.update({ where: { id: id("person") }, data: { emailVerified: false } }), restore: () => db.account.update({ where: { id: id("person") }, data: { emailVerified: true } }) },
    { apply: () => db.company.update({ where: { id: id("company") }, data: { status: "SUSPENDED" } }), restore: () => db.company.update({ where: { id: id("company") }, data: { status: "ACTIVE" } }) },
    { apply: () => db.recordDefinition.update({ where: { id: id("definition-PERSON_TO_COMPANY") }, data: { active: false } }), restore: () => db.recordDefinition.update({ where: { id: id("definition-PERSON_TO_COMPANY") }, data: { active: true } }) },
    { apply: () => db.recordDefinitionVersion.update({ where: { id: id("version-PERSON_TO_COMPANY") }, data: { active: false } }), restore: () => db.recordDefinitionVersion.update({ where: { id: id("version-PERSON_TO_COMPANY") }, data: { active: true } }) },
    { apply: () => db.recordDefinitionVersion.update({ where: { id: id("version-PERSON_TO_COMPANY") }, data: { context: "PERSON" } }), restore: () => db.recordDefinitionVersion.update({ where: { id: id("version-PERSON_TO_COMPANY") }, data: { context: "RELATIONSHIP" } }) },
  ];
  for (const change of changes) { await change.apply(); try { await assert.rejects(() => context()); } finally { await change.restore(); } }
});

test("early upload denial audits only safe Account attribution, including malformed actor/encoding", async () => {
  for (const headers of [{ "X-Samma-Definition": id("version-INTERNAL_COMPANY") }, { "X-Samma-Actor": "OWNER" }, { "X-Samma-Title": "%invalid" }]) {
    const request = new Request("https://synthetic.invalid/api/records/upload", { method: "POST", headers: { "X-Samma-Actor": "PERSON", "X-Samma-Relationship": id("relationship"),
      "X-Samma-Definition": id("version-PERSON_TO_COMPANY"), "X-Samma-Title": "private-title-canary", "X-Samma-Filename": "private-name-canary.pdf", ...headers } });
    await assert.rejects(() => authoriseUploadRequest(db, id("person"), request));
  }
  const events = await db.activityEvent.findMany({ where: { actorAccountId: id("person"), type: "RECORD_UPLOAD_DENIED" } });
  assert.equal(events.length, 3);
  for (const event of events) { assert.equal(event.relationshipId, null); assert.equal(event.personId, null); assert.equal(event.companyId, null); assert.ok(!JSON.stringify(event).includes("canary")); }
});

test("ACTIVE Person upload derives IDs, commits one opaque file with checksum and actor audit", async () => {
  const request = new Request("https://synthetic.invalid/api/records/upload", { method: "POST", headers: { "X-Samma-Actor": "PERSON", "X-Samma-Relationship": id("relationship"),
    "X-Samma-Definition": id("version-PERSON_TO_COMPANY"), "X-Samma-Title": "Synthetic sharing", "X-Samma-Person": id("person-outsider"), "X-Samma-Company": id("other-company") } });
  const authorised = await authoriseUploadRequest(db, id("person"), request);
  const storage = new InMemoryStorageProvider();
  const result = await persistRelationshipUpload(db, storage, new NotScannedDevScanner(), policy, { ...input(), ...authorised });
  assert.equal(result.record.personId, id("person-person")); assert.equal(result.record.companyId, id("company"));
  assert.equal(result.record.uploadedByAccountId, id("person"));
  assert.match(result.file.storageKey, /^records\/[0-9a-f-]{36}\/files\/[0-9a-f-]{36}$/);
  assert.equal(result.file.checksumSha256, source.checksumSha256); assert.equal(result.file.scanStatus, "NOT_SCANNED_DEV");
  assert.deepEqual(Buffer.from((await storage.readAccepted(result.file.storageKey))!), bytes);
  assert.equal(await db.recordFile.count({ where: { recordId: result.record.id, isCurrent: true } }), 1);
  const audit = await db.activityEvent.findFirstOrThrow({ where: { recordId: result.record.id, type: "RECORD_CREATED" } });
  assert.equal(audit.actorAccountId, id("person")); assert.equal(audit.relationshipId, id("relationship"));
  const record = await stored(result.record.id);
  for (const operation of ["view", "download"] as const) {
    for (const account of ["person", "hr"]) assert.equal(await canReadStoredRecord(db, id(account), record, operation), true);
    for (const account of ["owner", "outsider", "other-hr"]) assert.equal(await canReadStoredRecord(db, id(account), record, operation), false);
  }
  assert.equal(isDownloadableFile({ acceptedAt: new Date(), scanStatus: result.file.scanStatus }), true);
  assert.ok((await personRecords(db, id("person-person"))).some(row => row.record.id === record.id));
  assert.ok((await relationshipRecords(db, id("hr"), id("relationship"))).some(row => row.record.id === record.id));
  assert.deepEqual(await relationshipRecords(db, id("owner"), id("relationship")), []);
  assert.deepEqual(await personRecords(db, id("person-outsider")), []);
  await assert.rejects(() => uploadContext(db, id("person"), id("relationship"), input().definitionId, record.id, "PERSON"));
  // A new policy version must not change this record's visibility/role policy.
  await db.recordDefinitionVersion.create({ data: { recordDefinitionId: id("definition-PERSON_TO_COMPANY"), version: 2,
    name: "Synthetic new policy", category: "TEST", context: "RELATIONSHIP", direction: "INTERNAL_COMPANY", classification: "SENSITIVE", personVisible: false, allowedCompanyRoles: [id("OWNER")] } });
  try {
    assert.deepEqual(await allowedRelationshipDefinitions(db, id("person"), id("relationship"), "PERSON"), []);
    assert.equal(await canReadStoredRecord(db, id("person"), await stored(record.id)), true);
    assert.equal(await canReadStoredRecord(db, id("owner"), await stored(record.id)), false);
  } finally { await db.recordDefinitionVersion.deleteMany({ where: { recordDefinitionId: id("definition-PERSON_TO_COMPANY"), version: 2 } }); }
  // Existing revocation continues to govern reverse-flow reads/downloads.
  await db.companyRoleGrant.update({ where: { id: id("grant-hr") }, data: { revokedAt: new Date() } });
  try { assert.equal(await canReadStoredRecord(db, id("hr"), record, "download"), false); }
  finally { await db.companyRoleGrant.update({ where: { id: id("grant-hr") }, data: { revokedAt: null } }); }
  const hidden = { ...record, definitionVersion: { ...record.definitionVersion, personVisible: false } };
  assert.equal(await canReadStoredRecord(db, id("person"), hidden), false);
});

test("intake itself enforces Person direction and ownership before touching storage", async () => {
  const ctx = await context(), definition = domainDefinition(ctx.definition);
  const relationship = { id: ctx.relationship.id, personId: ctx.relationship.personId, companyId: ctx.relationship.companyId,
    status: ctx.relationship.status, relationshipType: ctx.relationship.relationshipType, createdAt: ctx.relationship.createdAt.toISOString() };
  const repository = new InMemoryRecordRepository(), storage = new InMemoryStorageProvider();
  storage.putQuarantined = async () => { assert.fail("Unauthorised input reached storage"); };
  const service = new RecordIntakeService(storage, new NotScannedDevScanner(), repository, new SequenceIdGenerator(), new FixedClock(new Date().toISOString()), policy);
  for (const direction of ["COMPANY_TO_PERSON", "INTERNAL_COMPANY", "BIDIRECTIONAL"] as const) {
    await assert.rejects(() => service.createRelationshipRecord({ actor: ctx.actor, relationship,
      definition: { ...definition, direction }, title: "Synthetic", originalFilename: "synthetic.pdf", contentType: "application/pdf", bytes }), /not authorised/);
  }
  await assert.rejects(() => service.createRelationshipRecord({ actor: { kind: "PERSON", accountId: id("outsider"), personId: id("person-outsider") },
    relationship, definition, title: "Synthetic", originalFilename: "synthetic.pdf", contentType: "application/pdf", bytes }), /not authorised/);
});

test("commit rechecks account, linkage, relationship, company, direction, definition, session and prepared IDs", async () => {
  const changes = [
    { apply: () => db.account.update({ where: { id: id("person") }, data: { status: "SUSPENDED" } }), restore: () => db.account.update({ where: { id: id("person") }, data: { status: "ACTIVE" } }) },
    { apply: () => db.account.update({ where: { id: id("person") }, data: { emailVerified: false } }), restore: () => db.account.update({ where: { id: id("person") }, data: { emailVerified: true } }) },
    { apply: () => db.person.update({ where: { id: id("person-person") }, data: { accountId: id("unlinked") } }), restore: () => db.person.update({ where: { id: id("person-person") }, data: { accountId: id("person") } }) },
    { apply: () => db.personCompanyRelationship.update({ where: { id: id("relationship") }, data: { status: "ENDED" } }), restore: () => db.personCompanyRelationship.update({ where: { id: id("relationship") }, data: { status: "ACTIVE" } }) },
    { apply: () => db.company.update({ where: { id: id("company") }, data: { status: "SUSPENDED" } }), restore: () => db.company.update({ where: { id: id("company") }, data: { status: "ACTIVE" } }) },
    { apply: () => db.recordDefinitionVersion.update({ where: { id: input().definitionId }, data: { direction: "COMPANY_TO_PERSON" } }), restore: () => db.recordDefinitionVersion.update({ where: { id: input().definitionId }, data: { direction: "PERSON_TO_COMPANY" } }) },
    { apply: () => db.recordDefinitionVersion.update({ where: { id: input().definitionId }, data: { active: false } }), restore: () => db.recordDefinitionVersion.update({ where: { id: input().definitionId }, data: { active: true } }) },
    { apply: () => db.recordDefinition.update({ where: { id: id("definition-PERSON_TO_COMPANY") }, data: { active: false } }), restore: () => db.recordDefinition.update({ where: { id: id("definition-PERSON_TO_COMPANY") }, data: { active: true } }) },
    { apply: () => db.authSession.update({ where: { sessionToken: id("session") }, data: { expires: new Date(0) } }), restore: () => db.authSession.update({ where: { sessionToken: id("session") }, data: { expires: new Date(Date.now() + 3600000) } }) },
    { apply: () => db.personCompanyRelationship.update({ where: { id: id("relationship") }, data: { companyId: id("other-company") } }), restore: () => db.personCompanyRelationship.update({ where: { id: id("relationship") }, data: { companyId: id("company") } }) },
  ];
  for (const change of changes) {
    const storage = new InMemoryStorageProvider(), accept = storage.accept.bind(storage);
    let key = "";
    storage.accept = async value => { key = value; const accepted = await accept(value); await change.apply(); return accepted; };
    const count = await db.record.count({ where: { relationshipId: id("relationship") } });
    try {
      await assert.rejects(() => persistRelationshipUpload(db, storage, new NotScannedDevScanner(), policy, input()), /rolled back/);
      assert.equal(await db.record.count({ where: { relationshipId: id("relationship") } }), count);
      assert.ok(key); assert.equal(await storage.metadata(key), null);
    } finally { await change.restore(); }
  }
});
