import assert from "node:assert/strict";
import { createPrismaClient } from "@samma/database";
const db = createPrismaClient();
let input = ""; for await (const chunk of process.stdin) input += chunk;
const data = JSON.parse(input) as { companyId: string; emails: string[]; phase: string };
assert.equal(process.env.SAMMA_ENV, "development");
assert.equal(process.env.SAMMA_BASE_URL, "https://dev.samma.co.za");
for (const email of data.emails) assert.match(email, /^(employment-existing|team-new)-[a-f0-9]{12}@example\.test$/);
try {
  const company = await db.company.findUniqueOrThrow({ where: { id: data.companyId } });
  assert.match(company.name, /^Synthetic Employment Introduction /);
  if (data.phase === "before-new") {
    assert.equal(await db.account.count({ where: { primaryEmail: data.emails[1] } }), 0);
    const invitation = await db.companyTeamInvitation.findFirstOrThrow({ where: { companyId: company.id, invitedEmail: data.emails[1], acceptedAt: null, revokedAt: null, declinedAt: null } });
    assert.equal(invitation.invitedAccountId, null); assert.equal(invitation.companyMemberId, null);
  } else {
    for (const email of data.emails) {
      const account = await db.account.findUniqueOrThrow({ where: { primaryEmail: email }, include: { person: true } });
      assert.ok(account.emailVerified);
      const member = await db.companyMember.findUniqueOrThrow({ where: { companyId_accountId: { companyId: company.id, accountId: account.id } }, include: { roleGrants: { where: { revokedAt: null }, include: { functionalRole: true } } } });
      assert.equal(member.status, "ACTIVE"); assert.deepEqual(member.roleGrants.map(g => g.functionalRole.code), ["HR"]);
      const invitation = await db.companyTeamInvitation.findFirstOrThrow({ where: { companyId: company.id, invitedEmail: email, acceptedAt: { not: null } } });
      assert.equal(invitation.companyMemberId, member.id); assert.equal(invitation.invitedAccountId, account.id); assert.match(invitation.tokenHash, /^[a-f0-9]{64}$/);
      const audit = await db.activityEvent.findMany({ where: { companyId: company.id, summary: { contains: invitation.id } } });
      for (const type of ["COMPANY_TEAM_INVITATION_CREATED", "COMPANY_TEAM_INVITATION_ACCEPTED", "COMPANY_MEMBER_CREATED", "COMPANY_ROLE_GRANTED"]) assert.ok(audit.some(e => e.type === type));
      assert.ok(!JSON.stringify(audit).includes(email)); assert.ok(!JSON.stringify(audit).includes(invitation.tokenHash));
      if (email.startsWith("team-new-")) assert.equal(await db.personCompanyRelationship.count({ where: { personId: account.person!.id } }), 0);
      else assert.equal(await db.personCompanyRelationship.count({ where: { personId: account.person!.id, companyId: company.id } }), 1);
    }
  }
  console.log("PASS: synthetic invitation membership, identity, employment separation and audit checks (" + data.phase + ").");
} finally { await db.$disconnect(); }
