import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { test, after } from "node:test";
import { createPrismaClient } from "@samma/database";
import { sendEmploymentInvitation, resolveEmploymentInvitation, personInvitations, companyInvitations, EmploymentError, normalizedInvitationEmail, type EmploymentActor } from "../../apps/web/lib/employment-service";
import { employmentCsrf, validEmploymentCsrf } from "../../apps/web/lib/employment-security";
import type { MailMessage } from "@samma/integrations";

assert.equal(process.env.SAMMA_EMPLOYMENT_TEST_DATABASE, "samma_employment_test", "Disposable test database required");
assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_employment_test");
const db = createPrismaClient();
after(() => db.$disconnect());
const issuer = "https://employment-test.example.test";
const policy = { baseUrl: "https://dev.samma.co.za", ttlHours: 24 };
const denied = (error: unknown) => error instanceof EmploymentError && error.code === "denied";
const unavailable = (error: unknown) => error instanceof EmploymentError && error.code === "unavailable";
async function account(email = randomUUID() + "@example.test", verified = true) {
  const row = await db.account.create({ data: { primaryEmail: email, emailVerified: verified, person: { create: { displayName: "Synthetic Invitation Person" } }, identities: { create: { provider: issuer, providerSubject: randomUUID() } } }, include: { person: true, identities: true } });
  const sessionToken = randomBytes(32).toString("hex");
  await db.authSession.create({ data: { sessionToken, accountId: row.id, identityId: row.identities[0]!.id, expires: new Date(Date.now() + 3600000) } });
  return { ...row, actor: { sessionToken, issuer } };
}
async function fixture() {
  const owner = await account(), recipient = await account();
  const role = await db.functionalRoleDefinition.create({ data: { code: "OWNER-TEST-" + randomUUID(), label: "Synthetic Owner", capabilities: ["company.members.manage"], active: true } });
  const company = await db.company.create({ data: { name: "Synthetic Invitation Company", members: { create: { accountId: owner.id, status: "ACTIVE", roleGrants: { create: { functionalRoleId: role.id } } } } }, include: { members: { include: { roleGrants: true } } } });
  const messages: MailMessage[] = [];
  const send = (email: unknown = recipient.primaryEmail, actor: EmploymentActor = owner.actor) => sendEmploymentInvitation(db, actor, { companyId: company.id, email }, () => ({ send: async message => { messages.push(message); } }), policy);
  return { owner, recipient, company, role, messages, send };
}

test("verified recipient: only invitation on send, inbox, ACTIVE and no membership on acceptance", async () => {
  const f = await fixture();
  const before = await Promise.all([db.account.count(), db.person.count(), db.companyMember.count(), db.personCompanyRelationship.count(), db.companyRoleGrant.count()]);
  const result = await f.send("  " + f.recipient.primaryEmail.toUpperCase() + " ");
  assert.deepEqual(await Promise.all([db.account.count(), db.person.count(), db.companyMember.count(), db.personCompanyRelationship.count(), db.companyRoleGrant.count()]), before);
  assert.equal(result.mailDelivered, true);
  const row = await db.employmentInvitation.findUniqueOrThrow({ where: { id: result.invitationId } });
  assert.equal(row.invitedAccountId, f.recipient.id); assert.equal(row.invitedEmail, f.recipient.primaryEmail);
  assert.match(row.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal("token" in row, false); assert.equal("rawToken" in row, false);
  assert.ok(row.expiresAt.getTime() - row.createdAt.getTime() <= 86401000);
  assert.ok(row.expiresAt.getTime() - row.createdAt.getTime() > 86390000);
  assert.equal(f.messages.length, 1); assert.ok(!JSON.stringify(f.messages).includes(row.tokenHash));
  assert.ok(!f.messages[0]!.text.includes("token="));
  const inbox = await personInvitations(db, f.recipient.actor);
  assert.equal(inbox[0]!.id, result.invitationId); assert.equal("tokenHash" in inbox[0]!, false);
  const resolved = await resolveEmploymentInvitation(db, f.recipient.actor, result.invitationId, "accept");
  assert.equal((await db.personCompanyRelationship.findUniqueOrThrow({ where: { id: resolved.relationshipId! } })).status, "ACTIVE");
  assert.equal(await db.companyMember.count({ where: { accountId: f.recipient.id } }), 0);
  assert.equal((await personInvitations(db, f.recipient.actor)).length, 0);
  assert.deepEqual(await resolveEmploymentInvitation(db, f.recipient.actor, result.invitationId, "accept"), resolved);
  const events = await db.activityEvent.findMany({ where: { companyId: f.company.id } });
  assert.deepEqual(events.map(e => e.type).sort(), ["EMPLOYMENT_INVITATION_ACCEPTED", "EMPLOYMENT_INVITATION_CREATED", "EMPLOYMENT_RELATIONSHIP_ACTIVATED"]);
  assert.ok(!JSON.stringify(events).includes(f.recipient.primaryEmail)); assert.ok(!JSON.stringify(events).includes(row.tokenHash));
});

test("unknown email creates no fake account; later verified registration sees and accepts invitation", async () => {
  const f = await fixture(), email = randomUUID() + "@example.test";
  const invitation = await f.send(email);
  assert.equal(await db.account.count({ where: { primaryEmail: email } }), 0);
  assert.equal((await db.employmentInvitation.findUniqueOrThrow({ where: { id: invitation.invitationId } })).invitedAccountId, null);
  const registered = await account(email);
  assert.equal((await personInvitations(db, registered.actor))[0]!.id, invitation.invitationId);
  await resolveEmploymentInvitation(db, registered.actor, invitation.invitationId, "accept");
  assert.equal(await db.companyMember.count({ where: { accountId: registered.id } }), 0);
});

test("wrong email, pinned different Account and stale session denied for inbox/actions", async () => {
  const f = await fixture(), wrong = await account(); const invitation = await f.send();
  assert.equal((await personInvitations(db, wrong.actor)).length, 0);
  for (const action of ["accept", "decline"] as const) await assert.rejects(resolveEmploymentInvitation(db, wrong.actor, invitation.invitationId, action), denied);
  await db.employmentInvitation.update({ where: { id: invitation.invitationId }, data: { invitedAccountId: wrong.id } });
  assert.equal((await personInvitations(db, f.recipient.actor)).length, 0);
  await assert.rejects(resolveEmploymentInvitation(db, f.recipient.actor, invitation.invitationId, "accept"), denied);
  await db.authSession.delete({ where: { sessionToken: f.owner.actor.sessionToken } });
  await assert.rejects(f.send(), denied);
});

test("unverified, suspended, closed and wrong issuer/session cannot act", async () => {
  const f = await fixture(), invitation = await f.send();
  await db.account.update({ where: { id: f.recipient.id }, data: { emailVerified: false } });
  await assert.rejects(personInvitations(db, f.recipient.actor), denied);
  await assert.rejects(resolveEmploymentInvitation(db, f.recipient.actor, invitation.invitationId, "accept"), denied);
  for (const status of ["SUSPENDED", "CLOSED"] as const) {
    await db.account.update({ where: { id: f.recipient.id }, data: { emailVerified: true, status } });
    await assert.rejects(resolveEmploymentInvitation(db, f.recipient.actor, invitation.invitationId, "accept"), denied);
  }
  await assert.rejects(f.send(undefined, { ...f.owner.actor, issuer: "wrong" }), denied);
  await db.authSession.update({ where: { sessionToken: f.owner.actor.sessionToken }, data: { expires: new Date(0) } });
  await assert.rejects(f.send(), denied);
});

for (const completion of ["expired", "revoked", "declined"] as const) test(`${completion} invitation denied, history preserved and re-invite possible`, async () => {
  const f = await fixture(), invitation = await f.send();
  if (completion === "expired") await db.employmentInvitation.update({ where: { id: invitation.invitationId }, data: { createdAt: new Date(Date.now() - 172800000), expiresAt: new Date(Date.now() - 86400000) } });
  else await resolveEmploymentInvitation(db, completion === "revoked" ? f.owner.actor : f.recipient.actor, invitation.invitationId, completion === "revoked" ? "revoke" : "decline");
  await assert.rejects(resolveEmploymentInvitation(db, f.recipient.actor, invitation.invitationId, "accept"), unavailable);
  assert.equal((await personInvitations(db, f.recipient.actor)).length, 0);
  assert.equal(await db.personCompanyRelationship.count({ where: { companyId: f.company.id } }), 0);
  assert.notEqual((await f.send()).invitationId, invitation.invitationId);
  assert.equal(await db.employmentInvitation.count({ where: { companyId: f.company.id } }), 2);
});

test("capability, membership, tenant and Governance separation; revocation rechecked on accept", async () => {
  const f = await fixture(), outsider = await account();
  await db.governanceCapabilityGrant.create({ data: { accountId: outsider.id, capability: "platform.roles.manage" } });
  await assert.rejects(f.send(undefined, outsider.actor), denied);
  const invitation = await f.send();
  await assert.rejects(companyInvitations(db, outsider.actor, f.company.id), denied);
  await assert.rejects(resolveEmploymentInvitation(db, outsider.actor, invitation.invitationId, "revoke"), denied);
  const grant = f.company.members[0]!.roleGrants[0]!;
  await db.companyRoleGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date() } });
  await assert.rejects(f.send(), denied);
  await assert.rejects(resolveEmploymentInvitation(db, f.recipient.actor, invitation.invitationId, "accept"), denied);
  await db.companyRoleGrant.update({ where: { id: grant.id }, data: { revokedAt: null } });
  await db.functionalRoleDefinition.update({ where: { id: f.role.id }, data: { capabilities: ["company.settings.manage"] } });
  await assert.rejects(f.send(), denied);
  await db.functionalRoleDefinition.update({ where: { id: f.role.id }, data: { capabilities: ["company.members.manage"], active: false } });
  await assert.rejects(f.send(), denied);
  await db.functionalRoleDefinition.update({ where: { id: f.role.id }, data: { active: true } });
  for (const status of ["INVITED", "DISABLED", "REMOVED"] as const) {
    await db.companyMember.update({ where: { id: f.company.members[0]!.id }, data: { status } });
    await assert.rejects(f.send(), denied);
  }
  await db.companyMember.update({ where: { id: f.company.members[0]!.id }, data: { status: "ACTIVE" } });
  await db.company.update({ where: { id: f.company.id }, data: { status: "SUSPENDED" } });
  await assert.rejects(f.send(), denied);
  await assert.rejects(resolveEmploymentInvitation(db, f.recipient.actor, invitation.invitationId, "accept"), unavailable);
});

for (const status of ["ACTIVE", "PENDING", "FORMER", "ENDED"] as const) test(`${status} relationship behavior preserves history`, async () => {
  const f = await fixture();
  const old = await db.personCompanyRelationship.create({ data: { personId: f.recipient.person!.id, companyId: f.company.id, relationshipType: "EMPLOYMENT", status,
    startedAt: new Date("2025-01-01"), ...(status === "ENDED" || status === "FORMER" ? { endedAt: new Date("2025-12-31") } : {}) } });
  const invitation = await f.send();
  const result = await resolveEmploymentInvitation(db, f.recipient.actor, invitation.invitationId, "accept");
  if (status === "ACTIVE" || status === "PENDING") assert.equal(result.relationshipId, old.id);
  else { assert.notEqual(result.relationshipId, old.id); assert.deepEqual(await db.personCompanyRelationship.findUnique({ where: { id: old.id } }), old); }
  assert.equal(await db.personCompanyRelationship.count({ where: { companyId: f.company.id, status: "ACTIVE" } }), 1);
  await assert.rejects(resolveEmploymentInvitation(db, f.owner.actor, invitation.invitationId, "revoke"), unavailable);
});

test("concurrent sends deduplicate; concurrent accepts return one active result", async () => {
  const f = await fixture();
  const sent = await Promise.all(Array.from({ length: 4 }, () => f.send()));
  assert.equal(new Set(sent.map(s => s.invitationId)).size, 1); assert.equal(f.messages.length, 1);
  const results = await Promise.all(Array.from({ length: 4 }, () => resolveEmploymentInvitation(db, f.recipient.actor, sent[0]!.invitationId, "accept")));
  assert.equal(new Set(results.map(r => r.relationshipId)).size, 1);
  assert.equal(await db.personCompanyRelationship.count({ where: { companyId: f.company.id, status: "ACTIVE" } }), 1);
});

test("different invitations for same Person/company serialize; retry after offboarding cannot reactivate history", async () => {
  const f = await fixture(); const first = await f.send();
  const email = randomUUID() + "@example.test";
  const second = await f.send(email);
  // Simulate an old unpinned invite after the same Account's verified email changed back.
  await db.employmentInvitation.update({ where: { id: second.invitationId }, data: { invitedEmail: f.recipient.primaryEmail } });
  const results = await Promise.all([first, second].map(i => resolveEmploymentInvitation(db, f.recipient.actor, i.invitationId, "accept")));
  assert.equal(results[0]!.relationshipId, results[1]!.relationshipId);
  await db.personCompanyRelationship.update({ where: { id: results[0]!.relationshipId! }, data: { status: "ENDED", endedAt: new Date() } });
  assert.deepEqual(await resolveEmploymentInvitation(db, f.recipient.actor, first.invitationId, "accept"), results[0]);
  assert.equal(await db.personCompanyRelationship.count({ where: { companyId: f.company.id, status: "ACTIVE" } }), 0);
});

test("mail failure leaves inbox invitation; safe duplicate does not send another message", async () => {
  const f = await fixture();
  const result = await sendEmploymentInvitation(db, f.owner.actor, { companyId: f.company.id, email: f.recipient.primaryEmail }, () => ({ send: async () => { throw new Error("synthetic failure"); } }), policy);
  assert.equal(result.mailDelivered, false); assert.equal(result.created, true);
  assert.equal((await personInvitations(db, f.recipient.actor))[0]!.id, result.invitationId);
  assert.equal((await f.send()).created, false); assert.equal(f.messages.length, 0);
});

test("database constraints reject ambiguous resolutions, nonnormalized addresses and duplicate hashes", async () => {
  const f = await fixture(); const sent = await f.send();
  const row = await db.employmentInvitation.findUniqueOrThrow({ where: { id: sent.invitationId } });
  await assert.rejects(db.employmentInvitation.update({ where: { id: row.id }, data: { revokedAt: new Date(), declinedAt: new Date() } }));
  await assert.rejects(db.employmentInvitation.update({ where: { id: row.id }, data: { invitedEmail: "UPPER@example.test" } }));
  await assert.rejects(db.employmentInvitation.create({ data: { ...row, id: randomUUID() } }));
});

test("email validation and session-bound CSRF reject injection, missing/wrong tokens", () => {
  assert.equal(normalizedInvitationEmail("  TEST@EXAMPLE.TEST "), "test@example.test");
  for (const invalid of [null, "", "a@example.test\r\nBcc: evil@example.test", "a@example.test,other@example.test", "<a@example.test>", "a@b", "a".repeat(65) + "@example.test"]) assert.throws(() => normalizedInvitationEmail(invalid));
  const token = employmentCsrf("secret", "session");
  assert.equal(validEmploymentCsrf("secret", "session", token), true);
  for (const invalid of [null, "", token.slice(1), createHash("sha256").update("wrong").digest("hex")]) assert.equal(validEmploymentCsrf("secret", "session", invalid), false);
  assert.equal(validEmploymentCsrf("secret", "another session", token), false);
});
