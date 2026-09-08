import React from "react";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createPrismaClient } from "@samma/database";
import { RecordList } from "../components/record-list";
import { RelationshipRecords } from "../components/relationship-records";
import { CompanyPersonCard } from "../components/company-people";
import { companyPersonDetail } from "./company-people";
import { personRecords, relationshipRecords } from "./record-queries";
import { allowedRelationshipDefinitions } from "./record-service";
import { authoriseRecordAccess, canReadStoredRecord, isDownloadableFile } from "./record-access";

assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_employment_test");
const db = createPrismaClient(), prefix = `document-views-${randomUUID()}`;
const id = (name: string) => `${prefix}-${name}`;
const accounts = ["hr", "owner", "person", "outsider", "other-hr", "legal"];
const stored = (name: string) => db.record.findUniqueOrThrow({ where: { id: id(name) }, include: { definitionVersion: true } });

before(async () => {
  for (const name of accounts) await db.account.create({ data: { id: id(name), primaryEmail: `${id(name)}@example.test`, emailVerified: true,
    person: { create: { id: id(`person-${name}`), displayName: `Synthetic ${name}` } } } });
  for (const name of ["HR", "OWNER"]) await db.functionalRoleDefinition.create({ data: { id: id(name), code: id(name), label: name, capabilities: [] } });
  for (const name of ["company", "other-company"]) await db.company.create({ data: { id: id(name), name: name === "company" ? "Synthetic Document Company" : "Other Company" } });
  for (const [account, company, role] of [["hr", "company", "HR"], ["owner", "company", "OWNER"], ["other-hr", "other-company", "HR"]]) {
    await db.companyMember.create({ data: { id: id(`member-${account}`), accountId: id(account!), companyId: id(company!), status: "ACTIVE",
      roleGrants: { create: { functionalRoleId: id(role!) } } } });
  }
  for (const name of ["relationship", "empty"]) await db.personCompanyRelationship.create({ data: { id: id(name), companyId: id("company"), personId: id("person-person"), status: "ACTIVE", relationshipType: "EMPLOYMENT" } });
  for (const name of ["visible", "hidden"]) {
    await db.recordDefinition.create({ data: { id: id(`definition-${name}`), key: id(name), versions: { create: {
      id: id(`version-${name}`), version: 1, name: name === "visible" ? "Synthetic employee document" : "Synthetic internal HR note", category: "TEST",
      context: "RELATIONSHIP", direction: name === "visible" ? "COMPANY_TO_PERSON" : "INTERNAL_COMPANY", classification: "PERSONAL", personVisible: name === "visible", allowedCompanyRoles: [id("HR")],
    } } } });
    await db.record.create({ data: { id: id(name), definitionVersionId: id(`version-${name}`), title: name === "visible" ? "September Test Payslip" : "Hidden title canary",
      context: "RELATIONSHIP", personId: id("person-person"), companyId: id("company"), relationshipId: id("relationship"), uploadedByAccountId: id("hr"),
      createdAt: new Date("2026-09-01T12:00:00Z"), reviewDueAt: new Date("2026-09-03T12:00:00Z"),
      files: { create: { id: id(`file-${name}`), storageKey: randomUUID(), originalFilename: "synthetic.pdf", contentType: "application/pdf", sizeBytes: 40,
        checksumSha256: "a".repeat(64), scanStatus: "ACCEPTED", acceptedAt: new Date(), isCurrent: true } },
    } });
  }
});

after(async () => {
  await db.activityEvent.deleteMany({ where: { actorAccountId: { in: accounts.map(id) } } });
  await db.legalAccessGrant.deleteMany({ where: { relationshipId: id("relationship") } });
  await db.record.deleteMany({ where: { companyId: id("company") } });
  await db.personCompanyRelationship.deleteMany({ where: { companyId: id("company") } });
  await db.companyMember.deleteMany({ where: { companyId: { in: [id("company"), id("other-company")] } } });
  await db.company.deleteMany({ where: { id: { in: [id("company"), id("other-company")] } } });
  await db.recordDefinitionVersion.deleteMany({ where: { recordDefinitionId: { in: [id("definition-visible"), id("definition-hidden")] } } });
  await db.recordDefinition.deleteMany({ where: { id: { in: [id("definition-visible"), id("definition-hidden")] } } });
  await db.functionalRoleDefinition.deleteMany({ where: { id: { in: [id("HR"), id("OWNER")] } } });
  await db.person.deleteMany({ where: { accountId: { in: accounts.map(id) } } });
  await db.account.deleteMany({ where: { id: { in: accounts.map(id) } } });
  await db.$disconnect();
});

test("relationship keeps one authorised top Add record action and no action below Records", async () => {
  for (const account of ["hr", "owner", "outsider"]) {
    const records = await relationshipRecords(db, id(account), id("empty"));
    const canAddRecord = (await allowedRelationshipDefinitions(db, id(account), id("empty"))).length > 0;
    const relationship = await companyPersonDetail(db, id(account), id("empty"));
    const html = renderToStaticMarkup(<>{relationship ? <CompanyPersonCard relationship={relationship} canAddRecord={canAddRecord} detail /> : null}<RelationshipRecords records={records} /></>);
    assert.ok(html.includes("No records yet."));
    assert.equal((html.match(/>Add record<\/a>/g) ?? []).length, account === "hr" ? 1 : 0);
    assert.ok(!renderToStaticMarkup(<RelationshipRecords records={records} />).includes("Add record"));
  }
});

test("company list shows both permitted pinned records with visibility and existing actions", async () => {
  const records = await relationshipRecords(db, id("hr"), id("relationship"));
  assert.equal(records.length, 2);
  const html = renderToStaticMarkup(<RelationshipRecords records={records} />);
  for (const value of ["September Test Payslip", "Synthetic employee document", "Synthetic internal HR note", "Person visible: Yes", "Person visible: No", "ACTIVE", "Added", "Review due:"]) assert.ok(html.includes(value), value);
  assert.ok(html.includes(`/records/${id("visible")}`));
  assert.ok(html.includes(`/api/files/${id("file-hidden")}`));
  for (const account of ["owner", "person", "other-hr", "outsider"]) assert.deepEqual(await relationshipRecords(db, id(account), id("relationship")), []);
});

test("My records shows company, definition, actual status and no hidden record", async () => {
  await db.record.update({ where: { id: id("visible") }, data: { status: "ARCHIVED" } });
  try {
    const records = await personRecords(db, id("person-person"));
    assert.equal(records.length, 1);
    const html = renderToStaticMarkup(<RecordList records={records} />);
    for (const value of ["Synthetic Document Company", "Synthetic employee document", "ARCHIVED", "September Test Payslip", "Review due:", `/api/files/${id("file-visible")}`]) assert.ok(html.includes(value), value);
    for (const value of ["Current", "Hidden title canary", "Synthetic internal HR note", id("file-hidden")]) assert.ok(!html.includes(value), value);
    assert.deepEqual(await personRecords(db, id("person-outsider")), []);
  } finally { await db.record.update({ where: { id: id("visible") }, data: { status: "ACTIVE" } }); }
});

test("view/download permit visible Person and HR, deny hidden Person, OWNER and cross-company", async () => {
  for (const operation of ["view", "download"] as const) {
    assert.equal(await authoriseRecordAccess(db, id("person"), await stored("visible"), operation), true);
    for (const name of ["visible", "hidden"]) {
      const row = await stored(name);
      assert.equal(await authoriseRecordAccess(db, id("hr"), row, operation), true);
      for (const account of ["owner", "outsider", "other-hr"]) assert.equal(await authoriseRecordAccess(db, id(account), row, operation), false);
    }
    assert.equal(await authoriseRecordAccess(db, id("person"), await stored("hidden"), operation), false);
  }
  const events = await db.activityEvent.findMany({ where: { actorAccountId: id("person"), recordId: id("hidden") } });
  assert.equal(events.length, 2);
  assert.ok(events.every(event => event.type === "RECORD_ACCESS_DENIED" && event.companyId === id("company") && event.relationshipId === id("relationship")));
  assert.deepEqual(events.map(event => event.summary).sort(), ["Private record file download denied.", "Record metadata access denied."].sort());
  const successful = await db.activityEvent.count({ where: { actorAccountId: id("hr"), type: "RECORD_ACCESS_DENIED" } });
  assert.equal(successful, 0);
  assert.equal(await authoriseRecordAccess(db, id("outsider"), null), false);
  const missing = await db.activityEvent.findFirstOrThrow({ where: { actorAccountId: id("outsider"), recordId: null } });
  assert.equal(missing.companyId, null);
});

test("role revocation, inactive membership/company and deleted records remove company access", async () => {
  const denied = async () => {
    assert.deepEqual(await relationshipRecords(db, id("hr"), id("relationship")), []);
    assert.equal(await canReadStoredRecord(db, id("hr"), await stored("hidden"), "download"), false);
  };
  await db.companyRoleGrant.updateMany({ where: { companyMemberId: id("member-hr") }, data: { revokedAt: new Date() } });
  await denied();
  await db.companyRoleGrant.updateMany({ where: { companyMemberId: id("member-hr") }, data: { revokedAt: null } });
  await db.companyMember.update({ where: { id: id("member-hr") }, data: { status: "REMOVED" } });
  await denied();
  await db.companyMember.update({ where: { id: id("member-hr") }, data: { status: "ACTIVE" } });
  await db.company.update({ where: { id: id("company") }, data: { status: "SUSPENDED" } });
  await denied();
  await db.company.update({ where: { id: id("company") }, data: { status: "ACTIVE" } });
  await db.record.updateMany({ where: { companyId: id("company") }, data: { status: "DELETED" } });
  await denied();
  assert.deepEqual(await personRecords(db, id("person-person")), []);
  assert.equal(await canReadStoredRecord(db, id("person"), await stored("visible")), false);
  await db.record.updateMany({ where: { companyId: id("company") }, data: { status: "ACTIVE" } });
});

test("historic records retain pinned policy when a different active definition version exists", async () => {
  await db.recordDefinitionVersion.update({ where: { id: id("version-visible") }, data: { active: false } });
  await db.recordDefinitionVersion.create({ data: { id: id("version-visible-2"), recordDefinitionId: id("definition-visible"), version: 2,
    name: "New hidden policy", category: "TEST", context: "RELATIONSHIP", direction: "INTERNAL_COMPANY", classification: "PERSONAL", personVisible: false, allowedCompanyRoles: [id("OWNER")] } });
  assert.equal((await personRecords(db, id("person-person")))[0]?.definition.name, "Synthetic employee document");
  assert.equal((await relationshipRecords(db, id("hr"), id("relationship"))).length, 2);
  assert.deepEqual(await relationshipRecords(db, id("owner"), id("relationship")), []);
  assert.equal(await canReadStoredRecord(db, id("person"), await stored("visible"), "download"), true);
});

test("legal view-only grant keeps download denied and scoped/revoked access denied", async () => {
  await db.legalAccessGrant.create({ data: { id: id("legal-grant"), grantedToAccountId: id("legal"), grantedByAccountId: id("hr"), relationshipId: id("relationship"),
    represents: "PERSON", allowedDefinitionIds: [id("definition-visible")], allowedCategories: ["TEST"], canView: true, canDownload: false,
    startsAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 60000), status: "ACTIVE" } });
  assert.equal(await canReadStoredRecord(db, id("legal"), await stored("visible")), true);
  assert.equal(await authoriseRecordAccess(db, id("legal"), await stored("visible"), "download"), false);
  assert.equal(await authoriseRecordAccess(db, id("legal"), await stored("hidden")), false);
  await db.legalAccessGrant.update({ where: { id: id("legal-grant") }, data: { revokedAt: new Date() } });
  assert.equal(await authoriseRecordAccess(db, id("legal"), await stored("visible")), false);
});

test("download action preserves accepted-file and explicit DEV scan gates", () => {
  const acceptedAt = new Date();
  assert.equal(isDownloadableFile({ acceptedAt, scanStatus: "ACCEPTED" }), true);
  assert.equal(isDownloadableFile({ acceptedAt: null, scanStatus: "ACCEPTED" }), false);
  for (const scanStatus of ["PENDING", "REJECTED", "QUARANTINED"]) assert.equal(isDownloadableFile({ acceptedAt, scanStatus }), false);
  assert.equal(isDownloadableFile({ acceptedAt, scanStatus: "NOT_SCANNED_DEV" }), process.env.SAMMA_ENV === "development" && process.env.SAMMA_SCAN_POLICY === "not-scanned-dev");
});
