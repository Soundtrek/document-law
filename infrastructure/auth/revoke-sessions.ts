// Operator-only revocation; never expose as an unauthorised web endpoint.
import { createPrismaClient } from "@samma/database";
import { revokeAccountSessions } from "../../apps/web/lib/auth-adapter";
const db = createPrismaClient();
try {
  const [targetId, actorId] = process.argv.slice(2);
  if (!targetId || !actorId) throw new Error("Usage: revoke-sessions.ts targetAccountId operatorAccountId");
  const operator = await db.account.findFirst({ where: { id: actorId, status: "ACTIVE", governanceGrants: { some: { capability: "platform.security.review", revokedAt: null } } } });
  if (!operator) throw new Error("Active security Governance capability required");
  await revokeAccountSessions(db, targetId, operator.id);
  console.log("Sessions revoked; event audited.");
} finally { await db.$disconnect(); }
