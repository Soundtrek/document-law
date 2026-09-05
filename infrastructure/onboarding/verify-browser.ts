// Synthetic candidate evidence and temporary, explicit Governance regression fixture.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPrismaClient } from "@samma/database";
if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('/samma_onboarding_experiment')) throw new Error('Disposable database required');
const db = createPrismaClient();
const users = JSON.parse(readFileSync('/validation/users.json', 'utf8')) as { label: string; provider: string; providerSubject: string }[];
try {
  const mode = process.argv[2] ?? 'verify';
  const person = users.find(u => u.label === 'person')!, company = users.find(u => u.label === 'company')!;
  const personLink = await db.accountIdentity.findUniqueOrThrow({ where: { provider_providerSubject: { provider: person.provider, providerSubject: person.providerSubject } }, include: { account: { include: { person: true, companyMemberships: true, governanceGrants: true } } } });
  const companyLink = await db.accountIdentity.findUniqueOrThrow({ where: { provider_providerSubject: { provider: company.provider, providerSubject: company.providerSubject } }, include: { account: { include: { person: true, companyMemberships: { include: { roleGrants: { include: { functionalRole: true } }, company: true } }, governanceGrants: true } } } });
  if (mode === 'verify') {
    assert.ok(personLink.account.person && companyLink.account.person);
    assert.equal(personLink.account.companyMemberships.length, 0);
    assert.equal(companyLink.account.companyMemberships.length, 1);
    assert.equal(companyLink.account.companyMemberships[0]!.status, 'ACTIVE');
    assert.equal(companyLink.account.companyMemberships[0]!.company.name, 'Synthetic Onboarding Workspace');
    assert.deepEqual(companyLink.account.companyMemberships[0]!.roleGrants.map(g => g.functionalRole.code), ['OWNER']);
    assert.equal(personLink.account.governanceGrants.length + companyLink.account.governanceGrants.length, 0);
    assert.equal(await db.personCompanyRelationship.count(), 0);
    assert.equal(await db.account.count(), 2);
    assert.equal(await db.person.count(), 2);
    assert.equal(await db.company.count(), 1);
    for (const [type, count] of [['PERSON_ACCOUNT_CREATED', 2], ['COMPANY_CREATED', 1], ['COMPANY_MEMBER_JOINED', 1], ['COMPANY_MEMBER_ROLE_GRANTED', 1]] as const) {
      assert.equal(await db.activityEvent.count({ where: { type } }), count);
    }
    console.log('PASS real browser DB evidence: 2 Accounts/2 Persons/1 Company/1 ACTIVE member/OWNER only; no relationship/Governance/duplicates; expected audit events');
  } else if (mode === 'governance-grant') {
    for (const capability of ['platform.definitions.manage', 'platform.roles.manage', 'platform.audit.review']) await db.governanceCapabilityGrant.create({ data: { accountId: companyLink.accountId, capability } });
    console.log('Synthetic Governance regression fixture granted explicitly');
  } else if (mode === 'governance-revoke') {
    await db.governanceCapabilityGrant.deleteMany({ where: { accountId: companyLink.accountId } });
    console.log('Synthetic Governance regression fixture removed');
  } else throw new Error('Unknown mode');
} finally { await db.$disconnect(); }
