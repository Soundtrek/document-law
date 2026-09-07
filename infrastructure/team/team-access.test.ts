import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test, after } from "node:test";
import { createPrismaClient } from "@samma/database";
import { companyTeam, saveCompanyMemberRoles, TeamAccessError } from "../../apps/web/lib/company-team";
import { allowedRelationshipDefinitions } from "../../apps/web/lib/record-service";
import { teamCsrf, validTeamCsrf, teamRoleInput } from "../../apps/web/lib/team-security";
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
test("OWNER opens team; employee, non-manager, Governance-only and cross-company actors denied", async () => {
  const f = await fixture();
  const team = await companyTeam(db, f.owner.actor, f.company.id);
  assert.equal(team.members.length, 2); assert.equal(team.members[0]!.email, f.owner.primaryEmail);
  assert.ok(!team.members.some(m => m.email === f.employee.primaryEmail));
  for (const actor of [f.employee.actor, f.operator.actor]) {
    await assert.rejects(companyTeam(db, actor, f.company.id), denied);
    await assert.rejects(f.save([f.hr.id], f.member.id, actor), denied);
  }
  await db.governanceCapabilityGrant.create({ data: { accountId: f.employee.id, capability: "platform.roles.manage" } });
  await assert.rejects(companyTeam(db, f.employee.actor, f.company.id), denied);
  const other = await fixture();
  await assert.rejects(f.save([f.hr.id], other.member.id), denied);
  await assert.rejects(companyTeam(db, other.owner.actor, f.company.id), denied);
});
test("self HR persists, appears in team and enables existing Add record; revoke removes it with audited history", async () => {
  const f = await fixture();
  const definition = await db.recordDefinition.create({ data: { key: randomUUID(), versions: { create: { version: 1, name: "Synthetic HR record", category: "TEST", context: "RELATIONSHIP", direction: "BIDIRECTIONAL", classification: "PERSONAL", allowedCompanyRoles: ["HR"] } } }, include: { versions: true } });
  const before = await Promise.all([db.person.count(), db.personCompanyRelationship.count(), db.companyMember.count()]);
  assert.equal((await allowedRelationshipDefinitions(db, f.owner.id, f.relationship.id)).length, 0);
  await f.save([f.ownerRole.id, f.hr.id]);
  await f.save([f.ownerRole.id, f.hr.id]);
  const hrGrant = await db.companyRoleGrant.findMany({ where: { companyMemberId: f.member.id, functionalRoleId: f.hr.id, revokedAt: null } });
  assert.equal(hrGrant.length, 1);
  assert.deepEqual((await companyTeam(db, f.owner.actor, f.company.id)).members.find(m => m.id === f.member.id)!.roles.map(r => r.code).sort(), ["HR", "OWNER"]);
  assert.ok((await allowedRelationshipDefinitions(db, f.owner.id, f.relationship.id)).some(d => d.id === definition.versions[0]!.id));
  await f.save([f.ownerRole.id]);
  assert.equal((await allowedRelationshipDefinitions(db, f.owner.id, f.relationship.id)).length, 0);
  assert.ok((await db.companyRoleGrant.findUniqueOrThrow({ where: { id: hrGrant[0]!.id } })).revokedAt);
  const events = await db.activityEvent.findMany({ where: { companyId: f.company.id }, orderBy: { occurredAt: "asc" } });
  assert.deepEqual(events.map(e => e.type), ["COMPANY_ROLE_GRANTED", "COMPANY_ROLE_REVOKED"]);
  for (const event of events) { assert.equal(event.actorAccountId, f.owner.id); assert.deepEqual(JSON.parse(event.summary), { companyMemberId: f.member.id, targetAccountId: f.owner.id, roleCode: "HR" }); }
  await f.save([f.ownerRole.id, f.hr.id]);
  assert.equal(await db.companyRoleGrant.count({ where: { companyMemberId: f.member.id, functionalRoleId: f.hr.id } }), 2);
  assert.deepEqual(await Promise.all([db.person.count(), db.personCompanyRelationship.count(), db.companyMember.count()]), before);
});
test("last OWNER rejects atomically; a second active OWNER allows self revoke and immediately removes manage permission", async () => {
  const f = await fixture();
  await assert.rejects(f.save([f.hr.id]), lastOwner);
  assert.equal(await db.activityEvent.count({ where: { companyId: f.company.id } }), 0);
  const second = f.company.members.find(m => m.accountId === f.operator.id)!;
  await f.save([f.ownerRole.id], second.id);
  await f.save([]);
  await assert.rejects(companyTeam(db, f.owner.actor, f.company.id), denied);
  await assert.rejects(f.save([f.ownerRole.id]), denied);
  await assert.rejects(f.save([], second.id, f.operator.actor), lastOwner);
});
test("concurrent OWNER removals leave exactly one OWNER; duplicate grants stay singular", async () => {
  const f = await fixture(), second = f.company.members.find(m => m.accountId === f.operator.id)!;
  await f.save([f.ownerRole.id], second.id);
  const results = await Promise.allSettled([f.save([]), f.save([], second.id, f.operator.actor)]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(await db.companyMember.count({ where: { companyId: f.company.id, roleGrants: { some: { functionalRoleId: f.ownerRole.id, revokedAt: null } } } }), 1);
  const g = await fixture();
  await Promise.all([g.save([g.ownerRole.id, g.hr.id]), g.save([g.ownerRole.id, g.hr.id])]);
  assert.equal(await db.companyRoleGrant.count({ where: { companyMemberId: g.member.id, functionalRoleId: g.hr.id, revokedAt: null } }), 1);
});
test("inactive membership/account/company, revoked management, inactive role and invalid sessions deny", async () => {
  for (const mode of ["membership", "account", "company", "grant", "catalogue", "session", "issuer"] as const) {
    const f = await fixture();
    if (mode === "membership") await db.companyMember.update({ where: { id: f.member.id }, data: { status: "REMOVED" } });
    if (mode === "account") await db.account.update({ where: { id: f.owner.id }, data: { status: "SUSPENDED" } });
    if (mode === "company") await db.company.update({ where: { id: f.company.id }, data: { status: "SUSPENDED" } });
    if (mode === "grant") await db.companyRoleGrant.updateMany({ where: { companyMemberId: f.member.id }, data: { revokedAt: new Date() } });
    if (mode === "catalogue") await db.functionalRoleDefinition.update({ where: { id: f.ownerRole.id }, data: { active: false } });
    if (mode === "session") await db.authSession.update({ where: { sessionToken: f.owner.actor.sessionToken }, data: { expires: new Date(0) } });
    const actor = mode === "issuer" ? { ...f.owner.actor, issuer: "https://wrong.example.test" } : f.owner.actor;
    try { await assert.rejects(companyTeam(db, actor, f.company.id), denied); await assert.rejects(f.save([f.ownerRole.id, f.hr.id], f.member.id, actor), denied); }
    finally { if (mode === "catalogue") await db.functionalRoleDefinition.update({ where: { id: f.ownerRole.id }, data: { active: true } }); }
  }
});
test("inactive target cannot be edited; inactive/unknown/duplicate roles rejected; inactive owners do not count", async () => {
  const f = await fixture(), second = f.company.members.find(m => m.accountId === f.operator.id)!;
  await f.save([f.ownerRole.id], second.id);
  await db.companyMember.update({ where: { id: second.id }, data: { status: "REMOVED" } });
  await assert.rejects(f.save([], second.id), denied); await assert.rejects(f.save([]), lastOwner);
  const inactive = await db.functionalRoleDefinition.create({ data: { code: randomUUID(), label: "Inactive", capabilities: [], active: false } });
  assert.ok(!(await companyTeam(db, f.owner.actor, f.company.id)).roles.some(r => r.id === inactive.id));
  for (const ids of [[f.ownerRole.id, inactive.id], [f.ownerRole.id, "missing"], [f.ownerRole.id, f.ownerRole.id]]) await assert.rejects(f.save(ids), (e: unknown) => e instanceof TeamAccessError && e.code === "invalid_roles");
});
test("CSRF is session/purpose bound and request input rejects forged fields", () => {
  const token = teamCsrf("secret", "session");
  assert.ok(validTeamCsrf("secret", "session", token));
  assert.ok(!validTeamCsrf("secret", "other", token)); assert.ok(!validTeamCsrf("secret", "session", null));
  assert.ok(teamRoleInput({ companyId: "c", memberId: "m", roleIds: [] }));
  for (const input of [null, [], { companyId: "c", memberId: "m", roleIds: [null] }, { companyId: "c", memberId: "m", roleIds: [], accountId: "forged" }]) assert.ok(!teamRoleInput(input));
});
