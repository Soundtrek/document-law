import type { createPrismaClient } from "@samma/database";

type Database = ReturnType<typeof createPrismaClient>;

// Session authentication (including account status/verification) happens before this check.
export async function checkGovernanceAccess(
  db: Database,
  session: { accountId: string; mfaSatisfied: boolean },
  capabilities: readonly string[],
  mfaRequired: boolean,
) {
  const grants = await db.governanceCapabilityGrant.findMany({ where: { accountId: session.accountId, revokedAt: null } });
  const allowed = (!mfaRequired || session.mfaSatisfied) && capabilities.length > 0 &&
    capabilities.every(capability => grants.some(grant => grant.capability === capability));
  await db.activityEvent.create({ data: { type: allowed ? "GOVERNANCE_ACCESS" : "GOVERNANCE_DENIED", actorAccountId: session.accountId, summary: allowed ? "Governance capability check passed" : "Governance capability or MFA check denied" } });
  return allowed;
}
