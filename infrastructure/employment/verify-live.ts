import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPrismaClient } from "@samma/database";
const input = JSON.parse(readFileSync(0, "utf8"));
for (const user of Object.values(input.users) as { email: string }[]) assert.match(user.email, /^employment-(owner|existing|new)-[a-f0-9]{12}@example\.test$/);
const db = createPrismaClient();
try {
  const company = await db.company.findUniqueOrThrow({ where: { id: input.companyId } });
  assert.equal(company.name, input.companyName);
  if (process.argv[2] === "before-new") {
    assert.equal(await db.account.count({ where: { primaryEmail: input.users.new.email } }), 0);
    const invitation = await db.employmentInvitation.findFirstOrThrow({ where: { companyId: company.id, invitedEmail: input.users.new.email } });
    assert.equal(invitation.invitedAccountId, null);
  } else assert.equal(process.argv[2], "complete");
  for (const label of process.argv[2] === "before-new" ? ["existing"] : ["existing", "new"]) {
    const account = await db.account.findUniqueOrThrow({ where: { id: input[label].accountId }, include: { person: true } });
    assert.equal(account.primaryEmail, input.users[label].email); assert.equal(account.emailVerified, true);
    const active = await db.personCompanyRelationship.findMany({ where: { companyId: company.id, personId: account.person!.id, status: "ACTIVE" } });
    assert.equal(active.length, 1); assert.equal(active[0]!.relationshipType, "EMPLOYMENT");
    assert.equal(await db.companyMember.count({ where: { accountId: account.id } }), 0);
    assert.equal(await db.employmentInvitation.count({ where: { companyId: company.id, invitedEmail: account.primaryEmail, acceptedAt: { not: null }, relationshipId: active[0]!.id } }), 1);
  }
  if (process.argv[2] === "complete") {
    assert.equal(await db.employmentInvitation.count({ where: { companyId: company.id, declinedAt: { not: null } } }), 1);
    assert.equal(await db.employmentInvitation.count({ where: { companyId: company.id, revokedAt: { not: null } } }), 1);
    assert.equal(await db.companyMember.count({ where: { companyId: company.id } }), 1);
  }
  console.log("PASS: live synthetic relationship/membership/database invariants");
} finally { await db.$disconnect(); }
