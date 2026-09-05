// Operator-only: receives provider links, never passwords. Run after Keycloak provisioning.
import { readFileSync } from "node:fs";
import { createPrismaClient } from "@samma/database";
import { governanceCapabilities } from "@samma/identity";
const db = createPrismaClient();
const expected = ["phil@samma.co.za", "juanita@samma.co.za"];
const links: { email: string; displayName: string; provider: string; providerSubject: string }[] = JSON.parse(readFileSync(process.argv[2] ?? "/bootstrap-links.json", "utf8"));
try {
  if (links.length !== 2 || new Set(links.map(link => link.email)).size !== 2 || links.some(link => !expected.includes(link.email) || link.provider !== process.env.SAMMA_OIDC_ISSUER || !link.providerSubject)) throw new Error("Invalid controlled bootstrap manifest");
  await db.$transaction(async tx => {
    for (const link of links) {
      const identity = await tx.accountIdentity.findUnique({ where: { provider_providerSubject: { provider: link.provider, providerSubject: link.providerSubject } }, include: { account: true } });
      if (identity) {
        if (identity.account.primaryEmail !== link.email) throw new Error("Bootstrap identity conflict");
        continue; // Never restore revoked privileges or reset existing account state on retry.
      }
      let account = await tx.account.findUnique({ where: { primaryEmail: link.email }, include: { identities: true } });
      if (account && (account.identities.length || account.status !== "ACTIVE")) throw new Error("Existing account requires explicit identity-link review");
      if (!account) account = await tx.account.create({ data: { primaryEmail: link.email, emailVerified: true }, include: { identities: true } });
      else await tx.account.update({ where: { id: account.id }, data: { emailVerified: true } });
      await tx.person.upsert({ where: { accountId: account.id }, create: { accountId: account.id, displayName: link.displayName }, update: {} });
      await tx.accountIdentity.create({ data: { accountId: account.id, provider: link.provider, providerSubject: link.providerSubject, emailAtProvider: link.email } });
      for (const capability of governanceCapabilities) {
        const previous = await tx.governanceCapabilityGrant.findFirst({ where: { accountId: account.id, capability } });
        if (!previous) await tx.governanceCapabilityGrant.create({ data: { accountId: account.id, capability } });
      }
      await tx.activityEvent.create({ data: { type: "AUTH_BOOTSTRAP_GOVERNANCE", actorAccountId: account.id, summary: "Approved initial Governance Owner provisioned; controlled DEV administrative email verification; temporary password replacement required; MFA enforcement temporarily disabled" } });
    }
  });
  console.log("Two approved Account/Identity/Person links verified; explicit Governance capability grants created where new.");
} finally { await db.$disconnect(); }
