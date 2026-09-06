// Focused real PostgreSQL regression. Never run against the shared DEV database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createPrismaClient } from "@samma/database";
import { resolveOnboardingIdentity, completeCompanyOnboarding } from "../../apps/web/lib/onboarding-service";
import { newCompanySetup } from "../../apps/web/lib/onboarding-state";
import { CompanySetupError, CompanySetupUnexpectedError } from "../../apps/web/lib/company-setup-errors";
assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_company_completion_test");
const db = createPrismaClient(), issuer = "https://synthetic.example.test/realms/company";
const accounts: string[] = [], tag = randomUUID();
try {
  const owner = await db.functionalRoleDefinition.upsert({ where: { code: "OWNER" }, create: { code: "OWNER", label: "Owner", capabilities: ["company.members.manage", "company.settings.manage"] }, update: {} });
  const identity = await resolveOnboardingIdentity(db, issuer, { sub: tag, email: `${tag}@example.test`, email_verified: true }, true);
  accounts.push(identity.account.id);
  const token = randomUUID();
  await db.authSession.create({ data: { sessionToken: token, accountId: identity.account.id, identityId: identity.identity.id, expires: new Date(Date.now() + 600000) } });
  const state = newCompanySetup(identity.account.id, identity.identity.id, randomUUID());
  const create = (setup: typeof state | null = state, name = "Soundtrek") => completeCompanyOnboarding(db, token, issuer, setup, name);
  const absent = async () => {
    assert.equal(await db.company.count(), 0);
    assert.equal(await db.companyMember.count(), 0);
    assert.equal(await db.companyRoleGrant.count(), 0);
  };
  await absent(); // Independent Person exists, with no implicit company.
  await assert.rejects(() => create(null), (e: unknown) => e instanceof CompanySetupError && e.code === "setup_expired");
  await assert.rejects(() => create({ ...state, expires: Date.now() - 1 }));
  await assert.rejects(() => create({ ...state, identityId: "other" }));
  await assert.rejects(() => create(state, "\n"), (e: unknown) => e instanceof CompanySetupError && e.code === "invalid_name");
  await db.functionalRoleDefinition.update({ where: { id: owner.id }, data: { active: false } });
  await assert.rejects(() => create(), (e: unknown) => e instanceof CompanySetupError && e.code === "owner_unavailable");
  await absent();
  await db.functionalRoleDefinition.update({ where: { id: owner.id }, data: { active: true } });
  const failing = new Proxy(db, { get(target, property) {
    if (property !== "$transaction") return Reflect.get(target, property);
    return (callback: (tx: unknown) => Promise<unknown>) => target.$transaction(tx => callback(new Proxy(tx, { get(t, p) {
      if (p === "activityEvent") return { createMany: async () => { throw new Error("Synthetic audit failure"); } };
      return Reflect.get(t, p);
    } })));
  } });
  await assert.rejects(() => completeCompanyOnboarding(failing, token, issuer, state, "Soundtrek"), (e: unknown) => e instanceof CompanySetupUnexpectedError && e.stage === "audit_write");
  await absent(); // Failure after entity writes rolls all three back.
  const ids = await Promise.all([create(), create(), create()]);
  assert.equal(new Set(ids).size, 1);
  assert.equal(await create(null), ids[0], "retry after cookie clearance recovers completed workspace");
  assert.equal(await create({ ...state, expires: Date.now() - 1 }), ids[0]);
  assert.equal(await db.company.count(), 1);
  const member = await db.companyMember.findFirstOrThrow({ include: { roleGrants: { include: { functionalRole: true } } } });
  assert.equal(member.status, "ACTIVE");
  assert.equal(await db.companyMember.count(), 1);
  assert.equal(await db.companyRoleGrant.count(), 1);
  assert.deepEqual(member.roleGrants.map(g => g.functionalRole.code), ["OWNER"]);
  assert.equal(await db.governanceCapabilityGrant.count(), 0);
  assert.equal(await db.activityEvent.count({ where: { companyId: ids[0], type: "COMPANY_CREATED" } }), 1);
  assert.deepEqual(await db.person.findUnique({ where: { id: identity.person.id } }), identity.person);
  await db.companyMember.update({ where: { id: member.id }, data: { status: "REMOVED" } });
  await assert.rejects(() => create());
  await assert.rejects(() => create(null));
  assert.equal(await db.company.count(), 1);
  console.log("PASS Soundtrek atomic creation, OWNER only, no Governance, expired/missing/cross-identity denial, policy/audit rollback, concurrent/completed retries, revocation, independent Person unchanged");
} finally {
  await db.activityEvent.deleteMany({ where: { actorAccountId: { in: accounts } } });
  await db.company.deleteMany();
  await db.person.deleteMany({ where: { accountId: { in: accounts } } });
  await db.account.deleteMany({ where: { id: { in: accounts } } });
  await db.functionalRoleDefinition.deleteMany();
  await db.$disconnect();
}
