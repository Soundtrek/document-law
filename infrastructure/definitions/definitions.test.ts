import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { before, after, test } from "node:test";
import { createPrismaClient } from "@samma/database";
import { InMemoryStorageProvider } from "@samma/storage";
import { NotScannedDevScanner } from "@samma/application";
import { deriveRecordDates } from "@samma/domain";
import { mutateDefinition, definitionCatalogue, DefinitionError, type DefinitionActor } from "../../apps/web/lib/record-definitions";
import { parseDefinitionPolicy } from "../../apps/web/lib/definition-policy";
import { allowedRelationshipDefinitions, uploadContext, persistRelationshipUpload } from "../../apps/web/lib/record-service";
import { canReadStoredRecord } from "../../apps/web/lib/record-access";
import { definitionCsrf, validDefinitionCsrf } from "../../apps/web/lib/definition-security";
import { installStarterPack } from "./starter-pack";
assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_definitions_test", "Disposable database required");
const db = createPrismaClient(), issuer = "https://definitions.example.test", tag = randomUUID();
const users: Record<string, { id: string; personId: string; actor: DefinitionActor }> = {};
const roles: Record<string, string> = {};
let company: string, otherCompany: string, relationship: string, otherRelationship: string;
const denied = (e: unknown) => e instanceof DefinitionError && e.code === "denied";
const p = (changes = {}) => ({ code: "TEST_" + randomUUID().replaceAll("-", "").toUpperCase(), name: "Synthetic configurable type", category: "Custom category", description: "Synthetic policy", direction: "COMPANY_TO_PERSON", personVisible: true, classification: "SENSITIVE", roleIds: [roles.HR], reviewMonths: null, retentionMode: "NONE", retentionMonths: null, notificationPolicy: "NONE", active: true, ...changes });
const create = (policy = p(), scope: string | null = null, actor = users.governance!.actor) => mutateDefinition(db, actor, scope, { action: "save", policy });
const latest = (definitionId: string) => db.recordDefinitionVersion.findFirstOrThrow({ where: { recordDefinitionId: definitionId }, orderBy: { version: "desc" } });
const stored = (id: string) => db.record.findUniqueOrThrow({ where: { id }, include: { definitionVersion: true } });
async function upload(definitionId: string, name = "hr", actorKind: "PERSON" | "COMPANY" = "COMPANY") {
  const v = await latest(definitionId), bytes = Buffer.from("%PDF-1.4 Synthetic only");
  return persistRelationshipUpload(db, new InMemoryStorageProvider(), new NotScannedDevScanner(), { environment: "development", allowUnscannedDev: true }, {
    accountId: users[name]!.id, sessionToken: users[name]!.actor.sessionToken, relationshipId: relationship, definitionId: v.id, actorKind,
    title: "Synthetic policy record", filename: "synthetic.pdf", contentType: "application/pdf",
    source: { sizeBytes: bytes.length, checksumSha256: createHash("sha256").update(bytes).digest("hex"), open: async function* () { yield bytes; } },
  });
}
before(async () => {
  for (const role of ["OWNER", "HR", "PAYROLL", "LEGAL", "CLERK", "MANAGER", "BILLING"]) {
    const row = await db.functionalRoleDefinition.upsert({ where: { code: role }, update: {}, create: { code: role, label: role, capabilities: role === "OWNER" ? ["company.settings.manage"] : [] } }); roles[role] = row.id;
  }
  for (const name of ["governance", "owner", "otherOwner", "hr", "payroll", "legal", "person", "outsider"]) {
    const row = await db.account.create({ data: { primaryEmail: `${tag}-${name}@example.test`, emailVerified: true, person: { create: { displayName: "Synthetic " + name } }, identities: { create: { provider: issuer, providerSubject: randomUUID() } } }, include: { person: true, identities: true } });
    const sessionToken = randomUUID();
    await db.authSession.create({ data: { sessionToken, accountId: row.id, identityId: row.identities[0]!.id, mfaSatisfied: name === "governance", expires: new Date(Date.now() + 3600000) } });
    users[name] = { id: row.id, personId: row.person!.id, actor: { sessionToken, issuer, mfaRequired: true } };
  }
  await db.governanceCapabilityGrant.create({ data: { accountId: users.governance!.id, capability: "platform.definitions.manage" } });
  company = (await db.company.create({ data: { name: "Synthetic Company A" } })).id;
  otherCompany = (await db.company.create({ data: { name: "Synthetic Company B" } })).id;
  for (const [name, role, companyId] of [["owner", "OWNER", company], ["otherOwner", "OWNER", otherCompany], ["hr", "HR", company], ["payroll", "PAYROLL", company], ["legal", "LEGAL", company]]) await db.companyMember.create({ data: { companyId, accountId: users[name!]!.id, status: "ACTIVE", roleGrants: { create: { functionalRoleId: roles[role!]! } } } });
  relationship = (await db.personCompanyRelationship.create({ data: { companyId: company, personId: users.person!.personId, status: "ACTIVE", relationshipType: "EMPLOYMENT" } })).id;
  otherRelationship = (await db.personCompanyRelationship.create({ data: { companyId: otherCompany, personId: users.person!.personId, status: "ACTIVE", relationshipType: "EMPLOYMENT" } })).id;
});
after(() => db.$disconnect());
test("Governance CRUD, append-only history, stale version rejection and policy dates", async () => {
  const policy = p({ retentionMode: "FIXED_FROM_CREATED", retentionMonths: 18, reviewMonths: 2, roleIds: [roles.HR, roles.PAYROLL] });
  const d = await create(policy), v1 = await latest(d.definitionId);
  const uploaded = await upload(d.definitionId), row = await stored(uploaded.record.id);
  assert.equal(row.definitionVersionId, v1.id); assert.equal(row.definitionVersion.classification, "SENSITIVE");
  const dates = deriveRecordDates({ retentionMonths: 18, reviewMonths: 2 }, row.createdAt.toISOString());
  assert.equal(row.retainUntil?.toISOString(), dates.retainUntil); assert.equal(row.reviewDueAt?.toISOString(), dates.reviewDueAt);
  await mutateDefinition(db, users.governance!.actor, null, { action: "save", definitionId: d.definitionId, expectedVersion: 1, policy: { ...policy, roleIds: [roles.LEGAL], personVisible: false, reviewMonths: null, retentionMonths: 36 } });
  assert.deepEqual(await db.recordDefinitionVersion.findUniqueOrThrow({ where: { id: v1.id } }), v1);
  assert.equal((await stored(row.id)).definitionVersionId, v1.id);
  for (const name of ["hr", "payroll", "person"]) assert.equal(await canReadStoredRecord(db, users[name]!.id, row), true);
  for (const name of ["owner", "legal", "otherOwner", "outsider", "governance"]) assert.equal(await canReadStoredRecord(db, users[name]!.id, row), false);
  await assert.rejects(uploadContext(db, users.hr!.id, relationship, v1.id));
  const newRecord = await upload(d.definitionId, "legal"); assert.equal(newRecord.record.definitionVersionId, (await latest(d.definitionId)).id);
  assert.equal(await canReadStoredRecord(db, users.person!.id, await stored(newRecord.record.id)), false);
  await mutateDefinition(db, users.governance!.actor, null, { action: "deactivate", definitionId: d.definitionId, expectedVersion: 2 });
  assert.equal((await allowedRelationshipDefinitions(db, users.legal!.id, relationship)).some(v => v.definitionId === d.definitionId), false);
  assert.equal(await canReadStoredRecord(db, users.hr!.id, row), true);
  await mutateDefinition(db, users.governance!.actor, null, { action: "activate", definitionId: d.definitionId, expectedVersion: 2 });
  assert.equal((await allowedRelationshipDefinitions(db, users.legal!.id, relationship)).some(v => v.definitionId === d.definitionId), true);
});
test("Company custom type uses same engine and cannot cross scope or alter system definitions", async () => {
  const policy = p({ code: "SAFETY_INDUCTION_FORM", name: "Safety Induction Form" });
  const a = await create(policy, company, users.owner!.actor), b = await create(policy, otherCompany, users.otherOwner!.actor);
  assert.notEqual(a.definitionId, b.definitionId);
  const catalogue = await definitionCatalogue(db, users.owner!.actor, company);
  assert.ok(catalogue.definitions.some(d => d.id === a.definitionId)); assert.ok(!catalogue.definitions.some(d => d.id === b.definitionId));
  assert.deepEqual((await latest(a.definitionId)).allowedCompanyRoles, ["HR"]);
  assert.ok((await allowedRelationshipDefinitions(db, users.hr!.id, relationship)).some(v => v.definitionId === a.definitionId));
  assert.ok(!(await allowedRelationshipDefinitions(db, users.owner!.id, relationship)).some(v => v.definitionId === a.definitionId));
  const localPerson = await create(p({ direction: "PERSON_TO_COMPANY" }), company, users.owner!.actor);
  assert.ok((await allowedRelationshipDefinitions(db, users.person!.id, relationship, "PERSON")).some(v => v.definitionId === localPerson.definitionId));
  assert.ok(!(await allowedRelationshipDefinitions(db, users.person!.id, otherRelationship, "PERSON")).some(v => v.definitionId === localPerson.definitionId));
  await assert.rejects(uploadContext(db, users.person!.id, otherRelationship, (await latest(localPerson.definitionId)).id, undefined, "PERSON"));
  for (const actor of [users.hr!.actor, users.person!.actor, users.governance!.actor, users.otherOwner!.actor]) {
    await assert.rejects(create(p(), company, actor), denied); await assert.rejects(definitionCatalogue(db, actor, company), denied);
  }
  await assert.rejects(mutateDefinition(db, users.owner!.actor, company, { action: "deactivate", definitionId: b.definitionId, expectedVersion: 1 }), denied);
  const system = await create();
  await assert.rejects(mutateDefinition(db, users.owner!.actor, company, { action: "save", definitionId: system.definitionId, expectedVersion: 1, policy }), denied);
  assert.ok(!(await definitionCatalogue(db, users.governance!.actor, null)).definitions.some(d => d.companyId));
});
test("Company/Person selectors filter directions, inactive versions, roles and exact actor", async () => {
  for (const direction of ["COMPANY_TO_PERSON", "PERSON_TO_COMPANY", "INTERNAL_COMPANY"]) {
    const d = await create(p({ direction, personVisible: false })); const v = await latest(d.definitionId);
    assert.equal((await allowedRelationshipDefinitions(db, users.hr!.id, relationship)).some(v => v.definitionId === d.definitionId), direction !== "PERSON_TO_COMPANY");
    assert.equal((await allowedRelationshipDefinitions(db, users.person!.id, relationship, "PERSON")).some(v => v.definitionId === d.definitionId), direction === "PERSON_TO_COMPANY");
    if (direction === "PERSON_TO_COMPANY") { await assert.rejects(uploadContext(db, users.hr!.id, relationship, v.id)); await upload(d.definitionId, "person", "PERSON"); }
    else await assert.rejects(uploadContext(db, users.person!.id, relationship, v.id, undefined, "PERSON"));
    await db.recordDefinitionVersion.update({ where: { id: v.id }, data: { active: false } });
    assert.ok(!(await allowedRelationshipDefinitions(db, users.hr!.id, relationship)).some(v => v.definitionId === d.definitionId));
  }
});
test("OWNER is denied unless explicitly selected; revoked grants immediately deny access", async () => {
  const d = await create(p({ roleIds: [roles.OWNER] })); const record = await upload(d.definitionId, "owner");
  assert.equal(await canReadStoredRecord(db, users.owner!.id, await stored(record.record.id)), true);
  const member = await db.companyMember.findUniqueOrThrow({ where: { companyId_accountId: { companyId: company, accountId: users.hr!.id } } });
  const hrDef = await create(), hrRecord = await upload(hrDef.definitionId);
  await db.companyRoleGrant.updateMany({ where: { companyMemberId: member.id }, data: { revokedAt: new Date() } });
  assert.equal(await canReadStoredRecord(db, users.hr!.id, await stored(hrRecord.record.id)), false);
  await assert.rejects(upload(hrDef.definitionId));
  await db.companyRoleGrant.create({ data: { companyMemberId: member.id, functionalRoleId: roles.HR! } });
});
test("Invalid roles, free-text permissions, code mutations and concurrent edits rejected", async () => {
  for (const changes of [{ roleIds: ["invented"] }, { roleIds: [roles.HR, roles.HR] }, { code: "bad code" }, { retentionMode: "NONE", retentionMonths: 1 }, { reviewMonths: -1 }, { direction: "BIDIRECTIONAL" }, { notificationPolicy: "SEND" }]) await assert.rejects(create(p(changes)));
  const inactive = await db.functionalRoleDefinition.create({ data: { code: "INACTIVE_" + tag, label: "Inactive", capabilities: [], active: false } });
  await assert.rejects(create(p({ roleIds: [inactive.id] })));
  const policy = p(), d = await create(policy);
  await assert.rejects(mutateDefinition(db, users.governance!.actor, null, { action: "save", definitionId: d.definitionId, expectedVersion: 1, policy: { ...policy, code: "CHANGED" } }));
  const results = await Promise.allSettled([1, 2].map(() => mutateDefinition(db, users.governance!.actor, null, { action: "save", definitionId: d.definitionId, expectedVersion: 1, policy })));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(await db.recordDefinitionVersion.count({ where: { recordDefinitionId: d.definitionId } }), 2);
  assert.throws(() => parseDefinitionPolicy({ ...p(), companyId: company }));
});
test("Governance MFA/capability, company revocation and expired sessions deny", async () => {
  await assert.rejects(create(p(), null, users.owner!.actor), denied);
  await assert.rejects(create(p(), null, { ...users.governance!.actor, issuer: "wrong" }), denied);
  await db.authSession.update({ where: { sessionToken: users.governance!.actor.sessionToken }, data: { mfaSatisfied: false } });
  await assert.rejects(create(), denied);
  await db.authSession.update({ where: { sessionToken: users.governance!.actor.sessionToken }, data: { mfaSatisfied: true } });
  const member = await db.companyMember.findUniqueOrThrow({ where: { companyId_accountId: { companyId: company, accountId: users.owner!.id } } });
  await db.companyMember.update({ where: { id: member.id }, data: { status: "REMOVED" } });
  await assert.rejects(create(p(), company, users.owner!.actor), denied);
  await db.companyMember.update({ where: { id: member.id }, data: { status: "ACTIVE" } });
  await db.authSession.update({ where: { sessionToken: users.owner!.actor.sessionToken }, data: { expires: new Date(0) } });
  await assert.rejects(create(p(), company, users.owner!.actor), denied);
});
test("Unset and relationship-end retention remain pending; configured calendar months clamp", async () => {
  const d = await create(p({ retentionMode: "FIXED_FROM_RELATIONSHIP_END", retentionMonths: 24 }));
  const record = await stored((await upload(d.definitionId)).record.id);
  assert.equal(record.retainUntil, null); assert.equal(record.reviewDueAt, null); assert.equal(record.relationshipId, relationship);
  assert.equal(record.definitionVersion.retentionMode, "FIXED_FROM_RELATIONSHIP_END"); assert.equal(record.definitionVersion.retentionMonths, 24);
  assert.deepEqual(deriveRecordDates({ retentionMode: "NONE" }, "2026-01-31T00:00:00.000Z"), {});
  assert.deepEqual(deriveRecordDates({ retentionMode: "FIXED_FROM_RELATIONSHIP_END", retentionMonths: 1, reviewMonths: 1 }, "2026-01-31T00:00:00.000Z", "2028-01-31T00:00:00.000Z"), { retainUntil: "2028-02-29T00:00:00.000Z", reviewDueAt: "2026-02-28T00:00:00.000Z" });
});
test("Starter pack is idempotent, unset dates, matrix projects stored roles, audit contains safe identifiers", async () => {
  await db.$transaction(installStarterPack); const count = await db.recordDefinitionVersion.count();
  await db.$transaction(installStarterPack); assert.equal(await db.recordDefinitionVersion.count(), count);
  const catalogue = await definitionCatalogue(db, users.governance!.actor, null);
  const payslip = catalogue.definitions.find(d => d.code === "PAYSLIP")!.versions[0]!;
  assert.deepEqual(payslip.allowedCompanyRoles, ["HR", "PAYROLL"]); assert.equal(payslip.personVisible, true); assert.equal(payslip.retentionMonths, null); assert.equal(payslip.reviewMonths, null);
  const events = await db.activityEvent.findMany({ where: { type: { contains: "DEFINITION" } } });
  for (const type of ["RECORD_DEFINITION_CREATED", "RECORD_DEFINITION_VERSION_CREATED", "RECORD_DEFINITION_ACTIVATED", "RECORD_DEFINITION_DEACTIVATED", "COMPANY_DOCUMENT_DEFINITION_CREATED"]) assert.ok(events.some(e => e.type === type));
  for (const event of events) assert.deepEqual(Object.keys(JSON.parse(event.summary)).sort(), ["definitionId", "version"]);
  assert.ok(validDefinitionCsrf("secret", "session", definitionCsrf("secret", "session")));
  assert.equal(validDefinitionCsrf("secret", "other", definitionCsrf("secret", "session")), false);
  assert.equal(validDefinitionCsrf("secret", "session", null), false);
});
