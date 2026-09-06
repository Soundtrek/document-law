import React from "react";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createPrismaClient } from "@samma/database";
import { governanceUserDirectory } from "./governance-users";
import { checkGovernanceAccess } from "./governance-authorisation";
import { resolveDatabaseSession } from "./auth-adapter";
import { GovernanceUsers, GovernanceUserDetail } from "../components/governance-users";

// Run only against the disposable directory test database, never the application database.
assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_directory_test");
const db = createPrismaClient();
const future = new Date(Date.now() + 3600000);
const expired = new Date(Date.now() - 3600000);
let token = "reviewer-session";
let mfaRequired = true;
const directory = governanceUserDirectory(db, async capabilities => {
  const session = await resolveDatabaseSession(db, token);
  if (!session || !await checkGovernanceAccess(db, session, capabilities, mfaRequired)) throw new Error("Denied");
  return session;
});

before(async () => {
  for (const [id, displayName] of [["reviewer", "Security Reviewer"], ["person", "Alex Example"], ["owner", "Company Owner"], ["unrelated", "Other Person"], ["empty", ""]] as const) {
    await db.account.create({ data: { id, primaryEmail: `${id}@directory.example.test`, emailVerified: true,
      ...(id !== "empty" ? { person: { create: { id: `person-${id}`, displayName } } } : {}),
      identities: { create: { id: `identity-${id}`, provider: "https://identity.example.test", providerSubject: id } },
    } });
    await db.authSession.create({ data: { accountId: id, identityId: `identity-${id}`, sessionToken: `${id}-session`, mfaSatisfied: true, expires: future } });
  }
  await db.governanceCapabilityGrant.createMany({ data: [
    { accountId: "reviewer", capability: "platform.security.review" },
    { accountId: "person", capability: "platform.security.review", revokedAt: expired },
    { accountId: "owner", capability: "platform.definitions.manage" },
  ] });
  await db.functionalRoleDefinition.createMany({ data: [
    { id: "owner-role", code: "OWNER", label: "Owner", capabilities: [] },
    { id: "hr-role", code: "HR", label: "Human resources", capabilities: [] },
    { id: "disabled-role", code: "DISABLED", label: "Disabled role", capabilities: [], active: false },
  ] });
  await db.company.createMany({ data: [{ id: "company-a", name: "Directory Company A" }, { id: "company-b", name: "Unrelated Company B" }] });
  await db.companyMember.create({ data: { id: "owner-member", companyId: "company-a", accountId: "owner", status: "ACTIVE", roleGrants: { create: { functionalRoleId: "owner-role" } } } });
  await db.companyMember.create({ data: { id: "person-member", companyId: "company-a", accountId: "person", status: "DISABLED", roleGrants: { create: [
    { functionalRoleId: "hr-role" }, { functionalRoleId: "owner-role", revokedAt: expired }, { functionalRoleId: "disabled-role" },
  ] } } });
  await db.companyMember.create({ data: { companyId: "company-b", accountId: "unrelated", status: "ACTIVE" } });
  await db.personCompanyRelationship.createMany({ data: [
    { personId: "person-person", companyId: "company-a", relationshipType: "Employment", status: "FORMER" },
    { personId: "person-unrelated", companyId: "company-b", relationshipType: "Employment", status: "ACTIVE" },
  ] });
  await db.activityEvent.createMany({ data: [
    { type: "AUTH_LOGIN", actorAccountId: "person", summary: "secret-summary-canary" },
    { type: "AUTH_LOGIN", actorAccountId: "unrelated", summary: "unrelated-canary" },
    { type: "RECORD_VIEWED", actorAccountId: "person", summary: "private-record-canary", recordId: "private-record" },
    { type: "AUTH_LOGIN", actorAccountId: "person", summary: "context-canary", companyId: "company-a" },
  ] });
});
after(async () => { await db.$disconnect(); });

test("verified Governance reviewer with only security.review can list and read", async () => {
  assert.equal((await directory.list()).users.length, 5);
  assert.equal((await directory.detail("person"))?.id, "person");
});
test("normal person, company OWNER, missing/revoked sessions and unverified/suspended accounts are denied", async () => {
  for (token of ["person-session", "owner-session", "missing-session"]) {
    await assert.rejects(directory.list(), /Denied/);
    await assert.rejects(directory.detail("person"), /Denied/);
  }
  token = "reviewer-session";
  for (const data of [{ emailVerified: false }, { emailVerified: true, status: "SUSPENDED" as const }]) {
    await db.account.update({ where: { id: "reviewer" }, data });
    await assert.rejects(directory.list(), /Denied/);
  }
  await db.account.update({ where: { id: "reviewer" }, data: { emailVerified: true, status: "ACTIVE" } });
});
test("revoked Governance capability and missing production MFA deny access immediately", async () => {
  await db.governanceCapabilityGrant.updateMany({ where: { accountId: "reviewer" }, data: { revokedAt: new Date() } });
  await assert.rejects(directory.detail("person"), /Denied/);
  await db.governanceCapabilityGrant.updateMany({ where: { accountId: "reviewer" }, data: { revokedAt: null } });
  await db.authSession.update({ where: { sessionToken: token }, data: { mfaSatisfied: false } });
  await assert.rejects(directory.list(), /Denied/);
  mfaRequired = false;
  assert.equal((await directory.list()).users.length, 5);
  mfaRequired = true;
  await db.authSession.update({ where: { sessionToken: token }, data: { mfaSatisfied: true } });
});
test("email and name searches are case insensitive, bounded, and return database users only", async () => {
  assert.deepEqual((await directory.list(" PERSON@DIRECTORY.EXAMPLE.TEST ")).users.map(user => user.id), ["person"]);
  assert.deepEqual((await directory.list("aLeX exAMple")).users.map(user => user.id), ["person"]);
  assert.equal((await directory.list("no-match")).users.length, 0);
  assert.equal((await directory.list("", -1)).page, 1);
  const list = await directory.list();
  assert.equal(list.users.find(user => user.id === "person")?.person?._count.relationships, 1);
  assert.equal(list.users.find(user => user.id === "person")?._count.companyMemberships, 1);
  assert.equal(list.users.find(user => user.id === "person")?.governanceGrants.length, 0);
});
test("detail uses stable ID, scopes connections and excludes revoked/inactive roles and private activity", async () => {
  assert.equal(await directory.detail("person@directory.example.test"), null);
  assert.equal(await directory.detail("unknown-account"), null);
  const detail = await directory.detail("person");
  assert.ok(detail);
  assert.deepEqual(detail.person?.relationships.map(row => row.company.name), ["Directory Company A"]);
  assert.deepEqual(detail.companyMemberships.map(row => row.company.name), ["Directory Company A"]);
  assert.deepEqual(detail.companyMemberships[0]?.roleGrants.map(row => row.functionalRole.code), ["HR"]);
  assert.equal(detail.activity.filter(event => event.type === "AUTH_LOGIN").length, 1);
  assert.ok(detail.activity.every(event => ["AUTH_LOGIN", "GOVERNANCE_DENIED"].includes(event.type)));
  assert.deepEqual(Object.keys(detail.activity[0]!).sort(), ["id", "occurredAt", "type"]);
  const serialized = JSON.stringify(detail);
  for (const secret of ["canary", "sessionToken", "identities", "records", "storageKey", "Unrelated Company"]) assert.ok(!serialized.includes(secret));
  const audit = await db.activityEvent.findFirst({ where: { type: "GOVERNANCE_USER_VIEWED", actorAccountId: "reviewer", summary: "User directory account viewed: person" } });
  assert.ok(audit);
  const html = renderToStaticMarkup(<GovernanceUserDetail user={detail} />);
  assert.ok(html.includes("Unrevoked roles (inactive):"));
  assert.ok(html.includes("No active company access"));
});
test("current Governance grants and missing contacts render cleanly without invented phone fields", async () => {
  const reviewer = await directory.detail("reviewer");
  assert.ok(reviewer);
  assert.ok(renderToStaticMarkup(<GovernanceUserDetail user={reviewer} />).includes("platform.security.review"));
  const empty = await directory.detail("empty");
  assert.ok(empty);
  const html = renderToStaticMarkup(<GovernanceUserDetail user={empty} />);
  for (const text of ["Name not provided", "No company relationships.", "No company memberships.", "No Governance capabilities.", "No recent activity available."]) assert.ok(html.includes(text));
  for (const text of ["undefined", "Phone", "Mobile", "password", "impersonate"]) assert.ok(!html.includes(text));
  assert.ok(renderToStaticMarkup(<GovernanceUsers result={await directory.list("no-match")} />).includes("No users match your search."));
});
