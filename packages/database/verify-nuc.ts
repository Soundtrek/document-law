import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createPrismaClient } from "./src/client";

if (process.env.SAMMA_ENV !== "development") {
  throw new Error("This synthetic integration check is development-only.");
}

const id = `nuc-check-${randomUUID()}`;
const db = createPrismaClient();
const reader = createPrismaClient();
let created = false;
try {
  await db.$transaction(async (tx) => {
    await tx.account.create({ data: { id, primaryEmail: `${id}@example.test` } });
    await tx.accountIdentity.create({ data: { id, accountId: id, provider: "development", providerSubject: id } });
    await tx.person.create({ data: { id, accountId: id, displayName: "Synthetic NUC Integration Person" } });
    await tx.company.create({ data: { id, name: "Synthetic NUC Integration Company" } });
    await tx.personCompanyRelationship.create({ data: { id, personId: id, companyId: id, relationshipType: "EMPLOYEE", status: "ACTIVE" } });
    await tx.recordDefinition.create({ data: { id, key: id } });
    await tx.recordDefinitionVersion.create({ data: {
      id, recordDefinitionId: id, version: 1, name: "Synthetic integration record", category: "Integration",
      context: "RELATIONSHIP", direction: "PERSON_TO_COMPANY", classification: "INTERNAL", allowedCompanyRoles: ["HR"],
    } });
    await tx.record.create({ data: {
      id, definitionVersionId: id, context: "RELATIONSHIP", personId: id, companyId: id,
      relationshipId: id, title: "Synthetic database integration proof", uploadedByAccountId: id,
    } });
    await tx.activityEvent.create({ data: { id, type: "NUC_SYNTHETIC_CHECK", actorAccountId: id, companyId: id, personId: id, relationshipId: id, recordId: id, summary: "Synthetic deployment integration check" } });
  });
  created = true;
  const record = await reader.record.findUniqueOrThrow({
    where: { id }, include: { relationship: { include: { person: { include: { account: { include: { identities: true } } } }, company: true } }, definitionVersion: true },
  });
  assert.equal(record.relationship?.person.account.id, id);
  assert.equal(record.relationship?.person.account.identities[0]?.providerSubject, id);
  assert.equal(record.relationship?.company.id, id);
  assert.equal(record.definitionVersion.version, 1);
  assert.equal(await reader.activityEvent.count({ where: { id } }), 1);
  console.log("PASS: committed Account/Identity/Person/Company/Relationship/Record/Audit data read through a separate Prisma client.");
} finally {
  if (created) {
    await db.$transaction(async (tx) => {
      await tx.activityEvent.delete({ where: { id } });
      await tx.record.delete({ where: { id } });
      await tx.recordDefinitionVersion.delete({ where: { id } });
      await tx.recordDefinition.delete({ where: { id } });
      await tx.personCompanyRelationship.delete({ where: { id } });
      await tx.person.delete({ where: { id } });
      await tx.company.delete({ where: { id } });
      await tx.account.delete({ where: { id } });
    });
    assert.equal(await reader.account.count({ where: { id } }), 0);
    console.log("PASS: only this check's synthetic rows were removed.");
  }
  await reader.$disconnect();
  await db.$disconnect();
}
