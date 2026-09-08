import assert from "node:assert/strict";
import { createPrismaClient } from "@samma/database";
assert.equal(process.env.SAMMA_ENV, "development");
assert.equal(process.env.SAMMA_BASE_URL, "https://dev.samma.co.za");
let text = ""; for await (const chunk of process.stdin) text += chunk;
const input = JSON.parse(text);
const db = createPrismaClient();
try {
  if (input.action === "prepare") {
    for (const email of [input.ownerEmail, input.personEmail, input.governanceEmail]) assert.match(email, /^employment-(owner|new|existing)-[a-f0-9]{12}@example\.test$/);
    const owner = await db.account.findUniqueOrThrow({ where: { primaryEmail: input.ownerEmail } });
    const person = await db.person.findFirstOrThrow({ where: { account: { primaryEmail: input.personEmail } } });
    const governance = await db.account.findUniqueOrThrow({ where: { primaryEmail: input.governanceEmail } });
    const relationship = await db.personCompanyRelationship.findFirstOrThrow({ where: { personId: person.id, status: "ACTIVE", company: { name: { startsWith: "Synthetic Employment Introduction " }, members: { some: { accountId: owner.id, status: "ACTIVE" } } } } });
    const role = await db.functionalRoleDefinition.findUniqueOrThrow({ where: { code: "OWNER" } });
    assert.ok(Array.isArray(role.capabilities) && role.capabilities.includes("company.settings.manage"));
    const existing = await db.governanceCapabilityGrant.findFirst({ where: { accountId: governance.id, capability: "platform.definitions.manage", revokedAt: null } });
    const grant = existing ?? await db.governanceCapabilityGrant.create({ data: { accountId: governance.id, capability: "platform.definitions.manage" } });
    const companyB = await db.company.create({ data: { name: "Synthetic Definitions Company B", members: { create: { accountId: governance.id, status: "ACTIVE", roleGrants: { create: { functionalRoleId: role.id } } } } } });
    console.log(JSON.stringify({ companyId: relationship.companyId, relationshipId: relationship.id, companyB: companyB.id, grantId: existing ? null : grant.id }));
  } else if (input.action === "cleanup") {
    if (input.grantId) await db.governanceCapabilityGrant.update({ where: { id: input.grantId }, data: { revokedAt: new Date() } });
    const companyB = await db.company.findUniqueOrThrow({ where: { id: input.companyB } }); assert.equal(companyB.name, "Synthetic Definitions Company B");
    await db.company.delete({ where: { id: companyB.id } });
    console.log("PASS temporary synthetic authority revoked");
  } else if (input.action === "verify") {
    const record = await db.record.findUniqueOrThrow({ where: { id: input.recordId }, include: { definitionVersion: true, files: true } });
    assert.equal(record.definitionVersion.recordDefinitionId, input.definitionId); assert.equal(record.definitionVersion.version, 1);
    assert.deepEqual(record.definitionVersion.allowedCompanyRoles, ["HR"]); assert.equal(record.companyId, input.companyId);
    assert.equal(record.retainUntil, null); assert.equal(record.reviewDueAt, null); assert.equal(record.files[0]!.scanStatus, "NOT_SCANNED_DEV");
    console.log("PASS live version pinning, policy, unset dates and persistent file metadata");
  }
} finally { await db.$disconnect(); }
