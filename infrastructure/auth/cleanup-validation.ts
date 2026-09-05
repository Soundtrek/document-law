import { readFileSync } from "node:fs";
import { createPrismaClient } from "@samma/database";
const db = createPrismaClient();
try {
  const links: { email: string; provider: string; providerSubject: string }[] = JSON.parse(readFileSync("/validation-links.json", "utf8"));
  await db.$transaction(async tx => {
    for (const link of links) {
      if (!/^auth-validation-[a-f0-9]+@example\.test$/.test(link.email)) throw new Error("Refusing non-synthetic cleanup");
      const identity = await tx.accountIdentity.findUniqueOrThrow({ where: { provider_providerSubject: { provider: link.provider, providerSubject: link.providerSubject } }, include: { account: true } });
      if (identity.account.primaryEmail !== link.email) throw new Error("Synthetic account mismatch");
      await tx.activityEvent.deleteMany({ where: { actorAccountId: identity.accountId } });
      await tx.person.deleteMany({ where: { accountId: identity.accountId } });
      await tx.account.delete({ where: { id: identity.accountId } });
    }
  });
  console.log("Disposable application validation accounts/sessions/grants removed.");
} finally { await db.$disconnect(); }
