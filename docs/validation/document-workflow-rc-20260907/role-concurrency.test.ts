import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test, after } from "node:test";
import { createPrismaClient } from "@samma/database";
import { companyTeam, saveCompanyMemberRoles, TeamAccessError } from "../../../apps/web/lib/company-team";
import { allowedRelationshipDefinitions } from "../../../apps/web/lib/record-service";
import { teamCsrf, validTeamCsrf, teamRoleInput } from "../../../apps/web/lib/team-security";
assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_team_test", "Disposable test database required");
const db = createPrismaClient();
after(() => db.$disconnect());
const issuer = "https://team.example.test";
const denied = (error: unknown) => error instanceof TeamAccessError && error.code === "denied";
const lastOwner = (error: unknown) => error instanceof TeamAccessError && error.code === "last_owner";
async function account() {
  const row = await db.account.create({ data: { primaryEmail: randomUUID() + "@example.test", emailVerified: true,
    person: { create: { displayName: "Synthetic Team Operator" } }, identities: { create: { provider: issuer, providerSubject: randomUUID() } } }, include: { person: true, identities: true } });
  const sessionToken = randomBytes(32).toString("hex");
  await db.authSession.create({ data: { sessionToken, accountId: row.id, identityId: row.identities[0]!.id, expires: new Date(Date.now() + 3600000) } });
  return { ...row, actor: { sessionToken, issuer } };
}
async function fixture() {
  const owner = await account(), employee = await account(), operator = await account();
  const ownerRole = await db.functionalRoleDefinition.upsert({ where: { code: "OWNER" }, update: {}, create: { code: "OWNER", label: "Company Owner", capabilities: ["company.members.manage"] } });
  const hr = await db.functionalRoleDefinition.upsert({ where: { code: "HR" }, update: {}, create: { code: "HR", label: "Human resources", capabilities: [] } });
  const company = await db.company.create({ data: { name: "Synthetic Team Company", members: { create: [
    { accountId: owner.id, status: "ACTIVE", roleGrants: { create: { functionalRoleId: ownerRole.id } } }, { accountId: operator.id, status: "ACTIVE" },
  ] } }, include: { members: true } });
  const member = company.members.find(m => m.accountId === owner.id)!;
  const relationship = await db.personCompanyRelationship.create({ data: { companyId: company.id, personId: employee.person!.id, relationshipType: "EMPLOYMENT", status: "ACTIVE" } });
  const save = (roleIds: string[], memberId = member.id, actor = owner.actor) => saveCompanyMemberRoles(db, actor, { companyId: company.id, memberId, roleIds });
  return { owner, employee, operator, ownerRole, hr, company, member, relationship, save };
}
test("isolated simultaneous role grants across two independent companies", async () => {
 for(let round=0;round<10;round++){
  const f=await fixture(),g=await fixture();
  const results=await Promise.allSettled([f.save([f.ownerRole.id,f.hr.id]),f.save([f.ownerRole.id,f.hr.id]),g.save([g.ownerRole.id,g.hr.id]),g.save([g.ownerRole.id,g.hr.id])]);
  const failures=results.filter(r=>r.status==='rejected');
  if(failures.length){
   console.log(JSON.stringify(failures.map(r=>({name:r.reason.name,message:r.reason.message,code:r.reason.code,cause:r.reason.cause})),null,2));
   assert.fail('Role assignment failed under isolated multi-company concurrency');
  }
  for(const x of [f,g])assert.equal(await db.companyRoleGrant.count({where:{companyMemberId:x.member.id,functionalRoleId:x.hr.id,revokedAt:null}}),1);
 }
});
