import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createPrismaClient } from "@samma/database";
import { ensurePerson, createCompany, invite, acceptInvitation, changeTeam, relationshipProfile } from "../../apps/web/lib/workflow-service";
import { onboardVerifiedIdentity } from "../../apps/web/lib/person-onboarding";
import { uploadContext } from "../../apps/web/lib/record-service";
import { canReadStoredRecord } from "../../apps/web/lib/record-access";

test("real PostgreSQL workflow and isolation", async t => {
  const db = createPrismaClient();
  const tag = `workflow-${randomUUID()}`, issuer = `https://${tag}.invalid`, accounts: string[] = [], companies: string[] = [], definitions: string[] = [], createdRoles: string[] = [];
  const previousEnvironment = process.env.SAMMA_ENV; process.env.SAMMA_ENV = "development";
  async function account(label: string) { const value = await db.account.create({ data: { primaryEmail: `${label}-${tag}@example.test`, emailVerified: true } }); accounts.push(value.id); return { accountId: value.id }; }
  async function role(code: string, capabilities: string[]) { const existing = await db.functionalRoleDefinition.findUnique({ where: { code } }); if (existing) return existing; const value = await db.functionalRoleDefinition.create({ data: { code, label: code, capabilities } }); createdRoles.push(value.id); return value; }
  try {
    const ownerRole = await role("OWNER", ["company.members.manage"]), hr = await role("HR", ["relationship.view", "records.hr.manage"]), billing = await role("BILLING", ["company.billing.manage"]);
    const owner = await account("owner"), otherOwner = await account("other"), employee = await account("employee"), stranger = await account("stranger");
    let personId = "";
    await t.test("Account to Person is concurrent and repeat safe", async () => {
      const people = await Promise.all([ensurePerson(db, owner), ensurePerson(db, owner)]); assert.equal(people[0].id, people[1].id);
      personId = (await ensurePerson(db, employee)).id;
      assert.equal(await db.person.count({ where: { accountId: owner.accountId } }), 1);
    });
    await t.test("verified OIDC onboarding preserves subject identity and rejects email merging", async () => {
      const profile = { sub: tag, email: `oidc-${tag}@example.test`, email_verified: true, name: "Synthetic OIDC" };
      const first = await onboardVerifiedIdentity(db, issuer, profile); accounts.push(first.accountId);
      const again = await onboardVerifiedIdentity(db, issuer, { ...profile, email: `changed-${tag}@example.test` }); assert.equal(first.accountId, again.accountId);
      await assert.rejects(onboardVerifiedIdentity(db, issuer, { ...profile, sub: `${tag}-collision` }));
      await assert.rejects(onboardVerifiedIdentity(db, issuer, { ...profile, sub: "unverified", email_verified: false }));
      assert.equal(await db.person.count({ where: { accountId: first.accountId } }), 1);
      await db.account.update({ where: { id: first.accountId }, data: { status: "SUSPENDED" } });
      await assert.rejects(onboardVerifiedIdentity(db, issuer, profile));
    });
    const a = await createCompany(db, owner, "Synthetic Company A"), b = await createCompany(db, otherOwner, "Synthetic Company B"); companies.push(a.id, b.id);
    const member = await db.companyMember.findUniqueOrThrow({ where: { companyId_accountId: { companyId: a.id, accountId: owner.accountId } } });
    await t.test("company creator gets Owner but no Governance; last owner protected", async () => {
      assert.equal(await db.companyRoleGrant.count({ where: { companyMemberId: member.id, functionalRoleId: ownerRole.id, revokedAt: null } }), 1);
      assert.equal(await db.governanceCapabilityGrant.count({ where: { accountId: owner.accountId } }), 0);
      await assert.rejects(changeTeam(db, owner, { companyId: a.id, memberId: member.id, action: "remove" }));
      await assert.rejects(changeTeam(db, owner, { companyId: a.id, memberId: member.id, roleId: ownerRole.id, action: "revoke" }));
    });
    const employeeAccount = await db.account.findUniqueOrThrow({ where: { id: employee.accountId } });
    const pendingRelationship = await db.personCompanyRelationship.create({ data: { companyId: a.id, personId, relationshipType: "EMPLOYMENT", status: "PENDING" } });
    const invited = await invite(db, owner, { companyId: a.id, email: employeeAccount.primaryEmail.toUpperCase(), kind: "EMPLOYMENT" });
    await t.test("verified existing invite targets stable account, duplicate is idempotent, wrong user denied", async () => {
      assert.ok(invited.token);
      const stored = await db.companyInvitation.findUniqueOrThrow({ where: { id: invited.invitationId! } }); assert.equal(stored.intendedAccountId, employee.accountId); assert.notEqual(stored.tokenHash, invited.token);
      const again = await invite(db, owner, { companyId: a.id, email: employeeAccount.primaryEmail, kind: "EMPLOYMENT" }); assert.equal(again.invitationId, invited.invitationId); assert.equal(again.token, null);
      await assert.rejects(acceptInvitation(db, stranger, invited.token!));
      await assert.rejects(invite(db, otherOwner, { companyId: a.id, email: employeeAccount.primaryEmail, kind: "EMPLOYMENT" }));
    });
    const accepted = await acceptInvitation(db, employee, invited.token!);
    await t.test("acceptance activates correct relationship and repeat/concurrent acceptance never duplicates", async () => {
      assert.equal(accepted.relationshipId, pendingRelationship.id);
      const again = await Promise.all([acceptInvitation(db, employee, invited.token!), acceptInvitation(db, employee, invited.token!)]); assert.equal(again[0].relationshipId, accepted.relationshipId);
      assert.equal(await db.personCompanyRelationship.count({ where: { companyId: a.id, personId } }), 1);
      assert.equal((await relationshipProfile(db, owner.accountId, accepted.relationshipId!)).companyId, a.id);
      await assert.rejects(relationshipProfile(db, otherOwner.accountId, accepted.relationshipId!));
    });
    await t.test("unknown email creates no fake account; expiration, rotation, cancellation and inviter revocation enforced", async () => {
      const email = `unknown-${tag}@example.test`;
      const pending = await invite(db, owner, { companyId: a.id, email, kind: "EMPLOYMENT" });
      assert.equal(await db.account.count({ where: { primaryEmail: email } }), 0);
      const unknown = await onboardVerifiedIdentity(db, issuer, { sub: `unknown-${tag}`, email, email_verified: true }); accounts.push(unknown.accountId);
      const actor = { accountId: unknown.accountId };
      await db.companyInvitation.update({ where: { id: pending.invitationId! }, data: { expiresAt: new Date(0) } });
      await assert.rejects(acceptInvitation(db, actor, pending.token!));
      const fresh = await invite(db, owner, { companyId: a.id, email, kind: "EMPLOYMENT", refresh: true });
      await assert.rejects(acceptInvitation(db, actor, pending.token!));
      await db.companyMember.update({ where: { id: member.id }, data: { status: "DISABLED" } });
      await assert.rejects(acceptInvitation(db, actor, fresh.token!));
      await db.companyMember.update({ where: { id: member.id }, data: { status: "ACTIVE" } });
      await changeTeam(db, owner, { companyId: a.id, invitationId: fresh.invitationId!, action: "cancel" });
      await assert.rejects(acceptInvitation(db, actor, fresh.token!));
      const newPending = await invite(db, otherOwner, { companyId: b.id, email, kind: "EMPLOYMENT" });
      assert.ok((await acceptInvitation(db, actor, newPending.token!)).relationshipId);
    });
    const historical = await db.personCompanyRelationship.create({ data: { companyId: b.id, personId, relationshipType: "EMPLOYMENT", status: "FORMER", endedAt: new Date(0) } });
    const inviteB = await invite(db, otherOwner, { companyId: b.id, email: employeeAccount.primaryEmail, kind: "EMPLOYMENT" });
    const relationshipB = await acceptInvitation(db, employee, inviteB.token!);
    assert.notEqual(relationshipB.relationshipId, historical.id);
    assert.equal((await db.personCompanyRelationship.findUniqueOrThrow({ where: { id: historical.id } })).status, "FORMER");
    const definition = await db.recordDefinition.create({ data: { key: tag } }); definitions.push(definition.id);
    const visible = await db.recordDefinitionVersion.create({ data: { recordDefinitionId: definition.id, version: 1, name: "Visible", category: "TEST", context: "RELATIONSHIP", direction: "COMPANY_TO_PERSON", classification: "SENSITIVE", allowedCompanyRoles: ["HR"], personVisible: true } });
    const hidden = await db.recordDefinitionVersion.create({ data: { recordDefinitionId: definition.id, version: 2, name: "Hidden", category: "TEST", context: "RELATIONSHIP", direction: "INTERNAL_COMPANY", classification: "SENSITIVE", allowedCompanyRoles: ["HR"], personVisible: false } });
    await t.test("Owner has no sensitive bypass; explicit HR grant permits correct-company creation", async () => {
      await assert.rejects(uploadContext(db, owner.accountId, accepted.relationshipId!, visible.id));
      await changeTeam(db, owner, { companyId: a.id, memberId: member.id, roleId: hr.id, action: "grant" });
      assert.equal((await uploadContext(db, owner.accountId, accepted.relationshipId!, visible.id)).relationship.companyId, a.id);
      await assert.rejects(uploadContext(db, otherOwner.accountId, accepted.relationshipId!, visible.id));
      await assert.rejects(uploadContext(db, owner.accountId, relationshipB.relationshipId!, visible.id));
      await db.personCompanyRelationship.update({ where: { id: accepted.relationshipId! }, data: { status: "FORMER" } });
      await assert.rejects(uploadContext(db, owner.accountId, accepted.relationshipId!, visible.id));
      await db.personCompanyRelationship.update({ where: { id: accepted.relationshipId! }, data: { status: "ACTIVE" } });
      await db.recordDefinitionVersion.update({ where: { id: visible.id }, data: { active: false } });
      await assert.rejects(uploadContext(db, owner.accountId, accepted.relationshipId!, visible.id));
      await db.recordDefinitionVersion.update({ where: { id: visible.id }, data: { active: true } });
    });
    const makeRecord = (companyId: string, relationshipId: string, definitionVersionId: string) => db.record.create({ data: { title: "Synthetic", companyId, relationshipId, personId, definitionVersionId, context: "RELATIONSHIP", uploadedByAccountId: owner.accountId }, include: { definitionVersion: true } });
    const visibleA = await makeRecord(a.id, accepted.relationshipId!, visible.id), hiddenA = await makeRecord(a.id, accepted.relationshipId!, hidden.id), visibleB = await makeRecord(b.id, relationshipB.relationshipId!, visible.id);
    const privateRecord = await db.record.create({ data: { title: "Private", personId, definitionVersionId: visible.id, context: "PERSON", uploadedByAccountId: employee.accountId }, include: { definitionVersion: true } });
    await t.test("person visibility, two-company and private-record isolation, immutable definition snapshot", async () => {
      for (const operation of ["view", "download"] as const) {
        assert.equal(await canReadStoredRecord(db, employee.accountId, visibleA, operation), true);
        assert.equal(await canReadStoredRecord(db, employee.accountId, visibleB, operation), true);
        assert.equal(await canReadStoredRecord(db, employee.accountId, hiddenA, operation), false);
        assert.equal(await canReadStoredRecord(db, stranger.accountId, visibleA, operation), false);
        assert.equal(await canReadStoredRecord(db, owner.accountId, visibleA, operation), true);
        assert.equal(await canReadStoredRecord(db, owner.accountId, visibleB, operation), false);
        assert.equal(await canReadStoredRecord(db, otherOwner.accountId, visibleA, operation), false);
        assert.equal(await canReadStoredRecord(db, owner.accountId, privateRecord, operation), false);
      }
      assert.equal(visibleA.definitionVersionId, visible.id); assert.equal(visibleA.definitionVersion.personVisible, true);
    });
    await t.test("team acceptance is separate from employment, Billing denied, role and member removal effective", async () => {
      const strangerAccount = await db.account.findUniqueOrThrow({ where: { id: stranger.accountId } });
      const team = await invite(db, owner, { companyId: a.id, email: strangerAccount.primaryEmail, kind: "MEMBERSHIP", roleIds: [billing.id] });
      await acceptInvitation(db, stranger, team.token!);
      assert.equal(await db.personCompanyRelationship.count({ where: { companyId: a.id, person: { accountId: stranger.accountId } } }), 0);
      await assert.rejects(uploadContext(db, stranger.accountId, accepted.relationshipId!, visible.id));
      await assert.rejects(relationshipProfile(db, stranger.accountId, accepted.relationshipId!));
      assert.equal(await canReadStoredRecord(db, stranger.accountId, visibleA), false);
      await assert.rejects(changeTeam(db, stranger, { companyId: a.id, memberId: member.id, roleId: hr.id, action: "grant" }));
      await changeTeam(db, owner, { companyId: a.id, memberId: member.id, roleId: hr.id, action: "revoke" });
      assert.equal(await canReadStoredRecord(db, owner.accountId, visibleA), false);
      await assert.rejects(uploadContext(db, owner.accountId, accepted.relationshipId!, visible.id));
      const teamMember = await db.companyMember.findUniqueOrThrow({ where: { companyId_accountId: { companyId: a.id, accountId: stranger.accountId } } });
      await changeTeam(db, owner, { companyId: a.id, memberId: teamMember.id, action: "remove" });
      assert.equal((await db.companyMember.findUniqueOrThrow({ where: { id: teamMember.id } })).status, "REMOVED");
      assert.equal(await db.account.count({ where: { id: stranger.accountId } }), 1);
    });
    await t.test("DEV manual transport disabled outside development and revoked session cannot mutate", async () => {
      process.env.SAMMA_ENV = "production";
      await assert.rejects(invite(db, owner, { companyId: a.id, email: employeeAccount.primaryEmail, kind: "EMPLOYMENT" }));
      await assert.rejects(acceptInvitation(db, employee, invited.token!));
      process.env.SAMMA_ENV = "development";
      await assert.rejects(createCompany(db, { ...owner, sessionToken: "revoked" }, "Invalid"));
    });
  } finally {
    await db.activityEvent.deleteMany({ where: { OR: [{ actorAccountId: { in: accounts } }, { companyId: { in: companies } }] } });
    await db.companyInvitation.deleteMany({ where: { companyId: { in: companies } } });
    await db.record.deleteMany({ where: { OR: [{ companyId: { in: companies } }, { uploadedByAccountId: { in: accounts } }] } });
    await db.personCompanyRelationship.deleteMany({ where: { companyId: { in: companies } } });
    await db.companyMember.deleteMany({ where: { companyId: { in: companies } } });
    await db.company.deleteMany({ where: { id: { in: companies } } });
    await db.recordDefinitionVersion.deleteMany({ where: { recordDefinitionId: { in: definitions } } });
    await db.recordDefinition.deleteMany({ where: { id: { in: definitions } } });
    await db.functionalRoleDefinition.deleteMany({ where: { id: { in: createdRoles } } });
    await db.person.deleteMany({ where: { accountId: { in: accounts } } });
    await db.account.deleteMany({ where: { id: { in: accounts } } });
    await db.$disconnect(); process.env.SAMMA_ENV = previousEnvironment;
  }
});
