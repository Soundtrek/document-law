import { readFileSync } from "node:fs";
import { createPrismaClient } from "@samma/database";
const db = createPrismaClient();
try {
  const links: { email: string; verified: boolean; provider: string; providerSubject: string }[] = JSON.parse(readFileSync("/validation-links.json", "utf8"));
  for (const link of links) {
    if (!/^auth-validation-[a-f0-9]+@example\.test$/.test(link.email) || link.provider !== process.env.SAMMA_OIDC_ISSUER) throw new Error("Only synthetic validation identities are allowed");
    await db.account.create({ data: { primaryEmail: link.email, emailVerified: link.verified, person: { create: { displayName: "Synthetic Validation" } }, identities: { create: { provider: link.provider, providerSubject: link.providerSubject, emailAtProvider: link.email } } } });
  }
  console.log("Synthetic validation links created without Governance capabilities.");
} finally { await db.$disconnect(); }
