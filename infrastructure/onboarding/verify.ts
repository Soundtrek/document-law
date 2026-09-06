// Operator-only integration suite. Requires a disposable database, never the normal DEV database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createPrismaClient } from "@samma/database";
import { resolveOnboardingIdentity, completeCompanyOnboarding } from "../../apps/web/lib/onboarding-service";
import type { CompanySetupState } from "../../apps/web/lib/onboarding-state";
import { AuthEntryError } from "../../apps/web/lib/auth-errors";

if (!["/samma_onboarding_experiment", "/samma_auth_registration_experiment"].includes(new URL(process.env.DATABASE_URL!).pathname)) throw new Error("Disposable onboarding database required");
const db = createPrismaClient(), issuer = "https://synthetic.example.test/realms/onboarding";
const tag = randomUUID(), accounts: string[] = [];
const approved = ["company.members.manage", "company.settings.manage"];
const profile = (subject: string) => ({ sub: `${tag}-${subject}`, email: `${tag}-${subject}@example.test`, email_verified: true });
try {
  const owner = await db.functionalRoleDefinition.upsert({ where: { code: "OWNER" }, create: { code: "OWNER", label: "Company Owner", capabilities: approved }, update: {} });
  assert.deepEqual(owner.capabilities, approved);
  const companyCount = await db.company.count();
  await assert.rejects(() => resolveOnboardingIdentity(db, issuer, profile("no-choice"), false));
  await assert.rejects(() => resolveOnboardingIdentity(db, issuer, { ...profile("unverified"), email_verified: false }, true));
  const [person, repeat] = await Promise.all([resolveOnboardingIdentity(db, issuer, profile("person"), true), resolveOnboardingIdentity(db, issuer, profile("person"), true)]);
  accounts.push(person.account.id);
  assert.equal(person.account.id, repeat.account.id);
  assert.equal(person.person.id, repeat.person.id);
  assert.equal(await db.person.count({ where: { accountId: person.account.id } }), 1);
  assert.equal(await db.companyMember.count({ where: { accountId: person.account.id } }), 0);
  assert.equal(await db.personCompanyRelationship.count({ where: { personId: person.person.id } }), 0);
  assert.equal(await db.company.count(), companyCount);
  assert.equal((await resolveOnboardingIdentity(db, issuer, { ...profile("person"), email: "changed@example.test" }, false)).account.id, person.account.id);
  for (const email of [person.account.primaryEmail, person.account.primaryEmail.toUpperCase()]) {
    await assert.rejects(() => resolveOnboardingIdentity(db, issuer, { ...profile("collision"), email }, true),
      (error: unknown) => error instanceof AuthEntryError && error.code === "EmailCollision");
  }
  assert.equal(await db.accountIdentity.count({ where: { providerSubject: profile("collision").sub } }), 0);
  const races = await Promise.allSettled(["race-a", "race-b"].map(subject => resolveOnboardingIdentity(db, issuer,
    { ...profile(subject), email: profile("race").email }, true)));
  const winner = races.find(r => r.status === "fulfilled");
  assert.ok(winner?.status === "fulfilled"); accounts.push(winner.value.account.id);
  assert.equal(races.filter(r => r.status === "fulfilled").length, 1);
  assert.ok(races.some(r => r.status === "rejected" && r.reason instanceof AuthEntryError && r.reason.code === "EmailCollision"));
  const operator = await resolveOnboardingIdentity(db, issuer, profile("company"), true); accounts.push(operator.account.id);
  assert.equal(await db.company.count(), companyCount, "abandoned setup creates no company");
  const sessionToken = randomUUID();
  await db.authSession.create({ data: { sessionToken, accountId: operator.account.id, identityId: operator.identity.id, expires: new Date(Date.now() + 600000) } });
  const state: CompanySetupState = { purpose: "company", accountId: operator.account.id, identityId: operator.identity.id, nonce: randomUUID(), expires: Date.now() + 600000 };
  const create = (s = state, token = sessionToken) => completeCompanyOnboarding(db, token, issuer, s, "Synthetic Onboarding Company");
  await assert.rejects(() => create({ ...state, accountId: person.account.id }));
  await assert.rejects(() => create({ ...state, identityId: person.identity.id }));
  await assert.rejects(() => create({ ...state, expires: Date.now() - 1 }));
  await assert.rejects(() => create(state, "forged-session"));
  for (const data of [{ status: "SUSPENDED" as const }, { status: "ACTIVE" as const, emailVerified: false }]) {
    await db.account.update({ where: { id: operator.account.id }, data });
    await assert.rejects(() => create());
    await assert.rejects(() => resolveOnboardingIdentity(db, issuer, profile("company"), true));
  }
  await db.account.update({ where: { id: operator.account.id }, data: { status: "ACTIVE", emailVerified: true } });
  for (const data of [{ active: false }, { active: true, capabilities: [...approved, "platform.roles.manage"] }, { capabilities: [...approved, "records.read"] }]) {
    await db.functionalRoleDefinition.update({ where: { id: owner.id }, data });
    await assert.rejects(() => create());
    assert.equal(await db.company.count(), companyCount);
  }
  await db.functionalRoleDefinition.update({ where: { id: owner.id }, data: { active: true, capabilities: approved } });
  // A real PostgreSQL rollback after all entity writes must also remove membership and grants.
  const failing = new Proxy(db, { get(target, property) {
    if (property !== "$transaction") return Reflect.get(target, property);
    return (callback: (tx: unknown) => Promise<unknown>) => target.$transaction(tx => callback(new Proxy(tx, { get(t, p) {
      if (p === "activityEvent") return { createMany: async () => { throw new Error("Synthetic audit failure"); } };
      return Reflect.get(t, p);
    } })));
  } });
  await assert.rejects(() => completeCompanyOnboarding(failing, sessionToken, issuer, state, "Synthetic Rollback"));
  assert.equal(await db.company.count(), companyCount);
  assert.equal(await db.companyMember.count({ where: { accountId: operator.account.id } }), 0);
  const ids = await Promise.all([create(), create(), create()]);
  assert.equal(new Set(ids).size, 1);
  assert.equal(await db.company.count(), companyCount + 1);
  const member = await db.companyMember.findUniqueOrThrow({ where: { companyId_accountId: { companyId: ids[0]!, accountId: operator.account.id } }, include: { roleGrants: { include: { functionalRole: true } } } });
  assert.equal(member.status, "ACTIVE");
  assert.deepEqual(member.roleGrants.map(g => g.functionalRole.code), ["OWNER"]);
  assert.equal(await db.governanceCapabilityGrant.count({ where: { accountId: { in: accounts } } }), 0);
  assert.equal(await db.personCompanyRelationship.count({ where: { personId: operator.person.id } }), 0);
  assert.equal(await db.activityEvent.count({ where: { actorAccountId: operator.account.id, companyId: ids[0] } }), 3);
  assert.equal(await create({ ...state, nonce: randomUUID() }), ids[0], "another login does not create another company");
  await db.companyMember.update({ where: { id: member.id }, data: { status: "REMOVED" } });
  await assert.rejects(() => create());
  assert.equal(await db.company.count(), companyCount + 1);
  assert.equal(await db.person.count({ where: { accountId: operator.account.id } }), 1);
  console.log("PASS Person bootstrap/repeat/no-company, stable subject/no email merge, abandoned setup, Company+ACTIVE member+OWNER only, concurrent retries, expiry/tamper binding, suspension/unverified denial, OWNER policy denial, atomic audit rollback, removal/replay denial");
} finally {
  await db.functionalRoleDefinition.updateMany({ where: { code: "OWNER" }, data: { active: true, capabilities: approved } });
  const companies = await db.company.findMany({ where: { members: { some: { accountId: { in: accounts } } } } });
  await db.activityEvent.deleteMany({ where: { actorAccountId: { in: accounts } } });
  await db.company.deleteMany({ where: { id: { in: companies.map(c => c.id) } } });
  await db.person.deleteMany({ where: { accountId: { in: accounts } } });
  await db.account.deleteMany({ where: { id: { in: accounts } } });
  await db.$disconnect();
}
