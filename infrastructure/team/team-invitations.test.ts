import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test, after } from "node:test";
import { createPrismaClient } from "@samma/database";
import { sendTeamInvitation, resolveTeamInvitation, recipientTeamInvitations, companyTeamInvitations, TeamInvitationError, type TeamInvitationActor } from "../../apps/web/lib/team-invitations";
import { allowedRelationshipDefinitions } from "../../apps/web/lib/record-service";
import { saveCompanyMemberRoles, TeamAccessError } from "../../apps/web/lib/company-team";
import { teamCsrf, validTeamCsrf, teamInvitationInput } from "../../apps/web/lib/team-security";
import type { MailMessage } from "@samma/integrations";
assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_team_test", "Disposable test database required");
const db = createPrismaClient();
after(() => db.$disconnect());
const issuer = "https://team-invitation.example.test", policy = { baseUrl: "https://dev.samma.co.za", ttlHours: 24 };
const denied = (error: unknown) => error instanceof TeamInvitationError && error.code === "denied";
const unavailable = (error: unknown) => error instanceof TeamInvitationError && error.code === "unavailable";
async function account(email = randomUUID() + "@example.test") {
  const row = await db.account.create({ data: { primaryEmail: email, emailVerified: true, person: { create: { displayName: "Synthetic Team Invite" } },
    identities: { create: { provider: issuer, providerSubject: randomUUID() } } }, include: { person: true, identities: true } });
  const sessionToken = randomBytes(32).toString("hex");
  await db.authSession.create({ data: { sessionToken, accountId: row.id, identityId: row.identities[0]!.id, expires: new Date(Date.now() + 3600000) } });
  return { ...row, actor: { sessionToken, issuer } };
}
async function fixture() {
  const owner = await account(), recipient = await account();
  const ownerRole = await db.functionalRoleDefinition.upsert({ where: { code: "OWNER" }, update: {}, create: { code: "OWNER", label: "Company Owner", capabilities: ["company.members.manage"] } });
  const hr = await db.functionalRoleDefinition.upsert({ where: { code: "HR" }, update: {}, create: { code: "HR", label: "Human resources", capabilities: [] } });
  const company = await db.company.create({ data: { name: "Synthetic Team Invitation Company", members: { create: { accountId: owner.id, status: "ACTIVE", roleGrants: { create: { functionalRoleId: ownerRole.id } } } } }, include: { members: true } });
  const messages: MailMessage[] = [];
  const send = (email: unknown = recipient.primaryEmail, roleIds = [hr.id], actor: TeamInvitationActor = owner.actor) => sendTeamInvitation(db, actor, { companyId: company.id, email, roleIds }, () => ({ send: async message => { messages.push(message); } }), policy);
  const resolve = (id: string, action: "accept" | "decline" | "revoke" = "accept", actor = recipient.actor) => resolveTeamInvitation(db, actor, id, action);
  return { owner, recipient, ownerRole, hr, company, messages, send, resolve };
}
test("Owner sends verified Account invitation; acceptance alone creates member and selected roles, no employment", async () => {
  const f = await fixture();
  const counts = () => Promise.all([db.account.count(), db.person.count(), db.companyMember.count(), db.personCompanyRelationship.count(), db.companyRoleGrant.count(), db.employmentInvitation.count()]);
  const before = await counts();
  const sent = await f.send("  " + f.recipient.primaryEmail.toUpperCase() + " ");
  assert.deepEqual(await counts(), before); assert.ok(sent.created && sent.mailDelivered);
  const row = await db.companyTeamInvitation.findUniqueOrThrow({ where: { id: sent.invitationId } });
  assert.equal(row.invitedAccountId, f.recipient.id); assert.match(row.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal("token" in row, false); assert.equal("rawToken" in row, false);
  assert.ok(row.expiresAt.getTime() - row.createdAt.getTime() > 86390000);
  assert.ok(!JSON.stringify(f.messages).includes(row.tokenHash)); assert.ok(!f.messages[0]!.text.includes("token="));
  assert.match(f.messages[0]!.subject, /^SAMMA — Company access invitation from /); assert.match(f.messages[0]!.text, /Assigned access:\nHR/);
  const inbox = await recipientTeamInvitations(db, f.recipient.actor);
  assert.equal(inbox[0]!.id, sent.invitationId); assert.equal("tokenHash" in inbox[0]!, false);
  assert.equal((await companyTeamInvitations(db, f.owner.actor, f.company.id))[0]!.id, sent.invitationId);
  const accepted = await f.resolve(sent.invitationId);
  const member = await db.companyMember.findUniqueOrThrow({ where: { id: accepted.companyMemberId! }, include: { roleGrants: { include: { functionalRole: true } } } });
  assert.equal(member.status, "ACTIVE"); assert.equal(member.accountId, f.recipient.id); assert.equal(member.companyId, f.company.id);
  assert.deepEqual(member.roleGrants.map(g => g.functionalRole.code), ["HR"]);
  assert.equal(await db.personCompanyRelationship.count({ where: { personId: f.recipient.person!.id } }), 0);
  assert.equal(await db.employmentInvitation.count(), before[5]);
  assert.equal((await recipientTeamInvitations(db, f.recipient.actor)).length, 0);
  assert.deepEqual(await f.resolve(sent.invitationId), accepted);
  await assert.rejects(f.resolve(sent.invitationId, "revoke", f.owner.actor), unavailable);
  const events = await db.activityEvent.findMany({ where: { companyId: f.company.id } });
  assert.deepEqual(events.map(e => e.type).sort(), ["COMPANY_MEMBER_CREATED", "COMPANY_ROLE_GRANTED", "COMPANY_TEAM_INVITATION_ACCEPTED", "COMPANY_TEAM_INVITATION_CREATED"]);
  assert.ok(!JSON.stringify(events).includes(row.tokenHash)); assert.ok(!JSON.stringify(events).includes(f.recipient.primaryEmail));
  // Existing record policy consumes the HR grant; no invitation-specific permission path.
  const employee = await account();
  const relationship = await db.personCompanyRelationship.create({ data: { companyId: f.company.id, personId: employee.person!.id, relationshipType: "EMPLOYMENT", status: "ACTIVE" } });
  const definition = await db.recordDefinition.create({ data: { key: randomUUID(), versions: { create: { version: 1, name: "HR-only synthetic", category: "TEST", context: "RELATIONSHIP", direction: "BIDIRECTIONAL", classification: "PERSONAL", allowedCompanyRoles: ["HR"] } } }, include: { versions: true } });
  assert.ok((await allowedRelationshipDefinitions(db, f.recipient.id, relationship.id)).some(d => d.id === definition.versions[0]!.id));
  await saveCompanyMemberRoles(db, f.owner.actor, { companyId: f.company.id, memberId: member.id, roleIds: [] });
  assert.equal((await allowedRelationshipDefinitions(db, f.recipient.id, relationship.id)).length, 0);
  await f.resolve(sent.invitationId);
  assert.equal(await db.companyRoleGrant.count({ where: { companyMemberId: member.id, revokedAt: null } }), 0);
});
test("unknown email creates no fake Account; verified normal registration discovers and binds inbox", async () => {
  const f = await fixture(), email = randomUUID() + "@example.test", sent = await f.send(email);
  assert.equal(await db.account.count({ where: { primaryEmail: email } }), 0);
  assert.equal((await db.companyTeamInvitation.findUniqueOrThrow({ where: { id: sent.invitationId } })).invitedAccountId, null);
  const registered = await account(email);
  await db.account.update({ where: { id: registered.id }, data: { emailVerified: false } });
  await assert.rejects(recipientTeamInvitations(db, registered.actor), denied);
  await assert.rejects(f.resolve(sent.invitationId, "accept", registered.actor), denied);
  await db.account.update({ where: { id: registered.id }, data: { emailVerified: true } });
  assert.equal((await recipientTeamInvitations(db, registered.actor))[0]!.id, sent.invitationId);
  await f.resolve(sent.invitationId, "accept", registered.actor);
  assert.equal((await db.companyTeamInvitation.findUniqueOrThrow({ where: { id: sent.invitationId } })).invitedAccountId, registered.id);
  assert.equal(await db.personCompanyRelationship.count({ where: { personId: registered.person!.id } }), 0);
});
test("employee, non-manager, Governance-only and cross-company actors denied", async () => {
  const f = await fixture(), employee = await account(), operator = await account(), other = await fixture();
  await db.personCompanyRelationship.create({ data: { companyId: f.company.id, personId: employee.person!.id, relationshipType: "EMPLOYMENT", status: "ACTIVE" } });
  await db.companyMember.create({ data: { companyId: f.company.id, accountId: operator.id, status: "ACTIVE" } });
  await db.governanceCapabilityGrant.create({ data: { accountId: employee.id, capability: "platform.roles.manage" } });
  const invitation = await f.send();
  for (const actor of [employee.actor, operator.actor, other.owner.actor]) {
    await assert.rejects(f.send(undefined, undefined, actor), denied);
    await assert.rejects(companyTeamInvitations(db, actor, f.company.id), denied);
    await assert.rejects(f.resolve(invitation.invitationId, "revoke", actor), denied);
  }
});
test("management capability alone cannot invite OWNER; owner invitation never transfers existing ownership", async () => {
  const f = await fixture();
  const role = await db.functionalRoleDefinition.create({ data: { code: randomUUID(), label: "Delegated manager", capabilities: ["company.members.manage"] } });
  await db.companyRoleGrant.updateMany({ where: { companyMemberId: f.company.members[0]!.id }, data: { revokedAt: new Date() } });
  await db.companyRoleGrant.create({ data: { companyMemberId: f.company.members[0]!.id, functionalRoleId: role.id } });
  await assert.rejects(f.send(undefined, [f.ownerRole.id]), denied);
  await db.companyRoleGrant.create({ data: { companyMemberId: f.company.members[0]!.id, functionalRoleId: f.ownerRole.id } });
  const sent = await f.send(undefined, [f.ownerRole.id]); await f.resolve(sent.invitationId);
  assert.equal(await db.companyMember.count({ where: { companyId: f.company.id, roleGrants: { some: { functionalRoleId: f.ownerRole.id, revokedAt: null } } } }), 2);
  const g = await fixture();
  await assert.rejects(saveCompanyMemberRoles(db, g.owner.actor, { companyId: g.company.id, memberId: g.company.members[0]!.id, roleIds: [] }), (e: unknown) => e instanceof TeamAccessError && e.code === "last_owner");
});
test("wrong recipient and pinned different Account denied even when email matches", async () => {
  const f = await fixture(), wrong = await account(), sent = await f.send();
  assert.equal((await recipientTeamInvitations(db, wrong.actor)).length, 0);
  for (const action of ["accept", "decline"] as const) await assert.rejects(f.resolve(sent.invitationId, action, wrong.actor), denied);
  await db.companyTeamInvitation.update({ where: { id: sent.invitationId }, data: { invitedAccountId: wrong.id } });
  assert.equal((await recipientTeamInvitations(db, f.recipient.actor)).length, 0);
  await assert.rejects(f.resolve(sent.invitationId), denied);
});
test("sessions, verified active Accounts, membership, company and management are checked again", async () => {
  for (const mode of ["session", "issuer", "account", "unverified", "member", "company", "grant", "capability", "role"] as const) {
    const f = await fixture(), sent = await f.send();
    if (mode === "session") await db.authSession.update({ where: { sessionToken: f.owner.actor.sessionToken }, data: { expires: new Date(0) } });
    if (mode === "issuer") f.owner.actor.issuer = "wrong";
    if (mode === "account") await db.account.update({ where: { id: f.owner.id }, data: { status: "SUSPENDED" } });
    if (mode === "unverified") await db.account.update({ where: { id: f.owner.id }, data: { emailVerified: false } });
    if (mode === "member") await db.companyMember.update({ where: { id: f.company.members[0]!.id }, data: { status: "REMOVED" } });
    if (mode === "company") await db.company.update({ where: { id: f.company.id }, data: { status: "SUSPENDED" } });
    if (mode === "grant") await db.companyRoleGrant.updateMany({ where: { companyMemberId: f.company.members[0]!.id }, data: { revokedAt: new Date() } });
    if (mode === "capability") await db.functionalRoleDefinition.update({ where: { id: f.ownerRole.id }, data: { capabilities: [] } });
    if (mode === "role") await db.functionalRoleDefinition.update({ where: { id: f.ownerRole.id }, data: { active: false } });
    try {
      await assert.rejects(f.send(), denied);
      if (!["session", "issuer"].includes(mode)) await assert.rejects(f.resolve(sent.invitationId), mode === "company" ? unavailable : denied);
    } finally { await db.functionalRoleDefinition.update({ where: { id: f.ownerRole.id }, data: { active: true, capabilities: ["company.members.manage"] } }); }
  }
  const f = await fixture(), sent = await f.send();
  await db.account.update({ where: { id: f.recipient.id }, data: { status: "SUSPENDED" } });
  await assert.rejects(f.resolve(sent.invitationId), denied);
});
for (const completion of ["expired", "declined", "revoked"] as const) test(`${completion} creates no membership; history retained and re-invite allowed`, async () => {
  const f = await fixture(), sent = await f.send();
  if (completion === "expired") await db.companyTeamInvitation.update({ where: { id: sent.invitationId }, data: { createdAt: new Date(Date.now() - 172800000), expiresAt: new Date(Date.now() - 86400000) } });
  else await f.resolve(sent.invitationId, completion === "declined" ? "decline" : "revoke", completion === "declined" ? f.recipient.actor : f.owner.actor);
  await assert.rejects(f.resolve(sent.invitationId), unavailable);
  assert.equal(await db.companyMember.count({ where: { accountId: f.recipient.id } }), 0);
  assert.equal((await recipientTeamInvitations(db, f.recipient.actor)).length, 0);
  assert.notEqual((await f.send()).invitationId, sent.invitationId);
  assert.equal(await db.companyTeamInvitation.count({ where: { companyId: f.company.id } }), 2);
  if (completion !== "expired") assert.equal(await db.activityEvent.count({ where: { companyId: f.company.id, type: completion === "declined" ? "COMPANY_TEAM_INVITATION_DECLINED" : "COMPANY_TEAM_INVITATION_REVOKED" } }), 1);
});
for (const status of ["ACTIVE", "INVITED", "DISABLED", "REMOVED"] as const) test(`${status} membership is reused without duplicate or stale privilege revival`, async () => {
  const f = await fixture();
  const old = await db.companyMember.create({ data: { companyId: f.company.id, accountId: f.recipient.id, status, roleGrants: { create: { functionalRoleId: f.ownerRole.id } } }, include: { roleGrants: true } });
  const sent = await f.send(), result = await f.resolve(sent.invitationId);
  assert.equal(result.companyMemberId, old.id); assert.equal(await db.companyMember.count({ where: { accountId: f.recipient.id, companyId: f.company.id } }), 1);
  const grant = await db.companyRoleGrant.findUniqueOrThrow({ where: { id: old.roleGrants[0]!.id } });
  assert.equal(grant.revokedAt === null, status === "ACTIVE");
  assert.equal(await db.companyRoleGrant.count({ where: { companyMemberId: old.id, functionalRoleId: f.hr.id, revokedAt: null } }), 1);
  await db.companyMember.update({ where: { id: old.id }, data: { status: "REMOVED" } });
  await f.resolve(sent.invitationId);
  assert.equal((await db.companyMember.findUniqueOrThrow({ where: { id: old.id } })).status, "REMOVED");
});
test("concurrent sends/accepts deduplicate and acceptance versus revoke resolves once", async () => {
  const f = await fixture(), sent = await Promise.all(Array.from({ length: 4 }, () => f.send()));
  assert.equal(new Set(sent.map(s => s.invitationId)).size, 1); assert.equal(f.messages.length, 1);
  const accepted = await Promise.all(Array.from({ length: 4 }, () => f.resolve(sent[0]!.invitationId)));
  assert.equal(new Set(accepted.map(r => r.companyMemberId)).size, 1);
  assert.equal(await db.companyRoleGrant.count({ where: { companyMemberId: accepted[0]!.companyMemberId!, functionalRoleId: f.hr.id, revokedAt: null } }), 1);
  const g = await fixture(), invite = await g.send();
  const race = await Promise.allSettled([g.resolve(invite.invitationId), g.resolve(invite.invitationId, "revoke", g.owner.actor)]);
  assert.equal(race.filter(r => r.status === "fulfilled").length, 1);
  const row = await db.companyTeamInvitation.findUniqueOrThrow({ where: { id: invite.invitationId } });
  assert.equal(await db.companyMember.count({ where: { accountId: g.recipient.id } }), row.acceptedAt ? 1 : 0);
});
test("different invitations resolving to same account/company serialize membership creation", async () => {
  const f = await fixture(), first = await f.send(), second = await f.send(randomUUID() + "@example.test");
  await db.companyTeamInvitation.update({ where: { id: second.invitationId }, data: { invitedEmail: f.recipient.primaryEmail } });
  const results = await Promise.all([first, second].map(i => f.resolve(i.invitationId)));
  assert.equal(results[0]!.companyMemberId, results[1]!.companyMemberId);
  assert.equal(await db.companyMember.count({ where: { accountId: f.recipient.id } }), 1);
});
test("inactive/unknown/duplicate roles rejected; deactivated intended role blocks acceptance atomically", async () => {
  const f = await fixture();
  for (const ids of [["missing"], [f.hr.id, f.hr.id]]) await assert.rejects(f.send(undefined, ids), (e: unknown) => e instanceof TeamInvitationError && e.code === "invalid_roles");
  const sent = await f.send();
  await db.functionalRoleDefinition.update({ where: { id: f.hr.id }, data: { active: false } });
  try {
    await assert.rejects(f.send(), (e: unknown) => e instanceof TeamInvitationError && e.code === "invalid_roles");
    await assert.rejects(f.resolve(sent.invitationId), unavailable);
    assert.equal(await db.companyMember.count({ where: { accountId: f.recipient.id } }), 0);
  } finally { await db.functionalRoleDefinition.update({ where: { id: f.hr.id }, data: { active: true } }); }
});
test("mail failure preserves inbox; constraints reject invalid state, email and hash", async () => {
  const f = await fixture();
  const sent = await sendTeamInvitation(db, f.owner.actor, { companyId: f.company.id, email: f.recipient.primaryEmail, roleIds: [] }, () => ({ send: async () => { throw new Error("synthetic"); } }), policy);
  assert.equal(sent.mailDelivered, false); assert.equal((await f.send()).created, false);
  assert.equal((await recipientTeamInvitations(db, f.recipient.actor))[0]!.id, sent.invitationId);
  for (const data of [{ revokedAt: new Date(), declinedAt: new Date() }, { invitedEmail: "UPPER@example.test" }, { tokenHash: "raw" }, { acceptedAt: new Date() }]) await assert.rejects(db.companyTeamInvitation.update({ where: { id: sent.invitationId }, data }));
});
test("strict request fields and CSRF reject forged authority, injection and wrong sessions", () => {
  const csrf = teamCsrf("secret", "session"); assert.ok(validTeamCsrf("secret", "session", csrf)); assert.ok(!validTeamCsrf("secret", "other", csrf));
  assert.ok(!validTeamCsrf("secret", "session", null));
  assert.ok(teamInvitationInput({ action: "send", companyId: "c", email: "hr@example.test", roleIds: [] }));
  assert.ok(teamInvitationInput({ action: "accept", invitationId: "i" }));
  for (const input of [null, [], { action: "accept", invitationId: "i", accountId: "forged" }, { action: "send", companyId: "c", email: "e", roleIds: [null] }, { action: "transfer", invitationId: "i" }]) assert.ok(!teamInvitationInput(input));
});
