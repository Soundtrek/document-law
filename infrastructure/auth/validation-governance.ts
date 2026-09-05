import { createPrismaClient } from "@samma/database";
const db = createPrismaClient();
try {
  const mode = process.argv[2];
  const account = await db.account.findFirstOrThrow({ where: { primaryEmail: { startsWith: "auth-validation-", endsWith: "@example.test" }, emailVerified: true } });
  const capabilities = ["platform.definitions.manage", "platform.roles.manage", "platform.audit.review"];
  if (mode === "grant") for (const capability of capabilities) await db.governanceCapabilityGrant.create({ data: { accountId: account.id, capability } });
  else if (mode === "revoke") await db.governanceCapabilityGrant.updateMany({ where: { accountId: account.id }, data: { revokedAt: new Date() } });
  else throw new Error("Expected grant or revoke");
  console.log("Synthetic test capabilities " + mode + " completed.");
} finally { await db.$disconnect(); }
