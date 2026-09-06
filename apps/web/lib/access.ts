import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "./database";
import { authSettings, sessionCookieName } from "./auth";
import { resolveDatabaseSession } from "./auth-adapter";

export async function requireSession() {
  const settings = authSettings();
  const token = (await cookies()).get(sessionCookieName)?.value;
  const session = token ? await resolveDatabaseSession(db, token) : null;
  if (!session || session.identity.provider !== settings.issuer) redirect("/sign-in");
  return session;
}

export async function requireGovernance(capabilities: readonly string[]) {
  const session = await requireSession();
  const grants = await db.governanceCapabilityGrant.findMany({ where: { accountId: session.accountId, revokedAt: null } });
  const mfaRequired = process.env.SAMMA_ENV !== "development" || process.env.SAMMA_GOVERNANCE_MFA_REQUIRED !== "false";
  const allowed = (!mfaRequired || session.mfaSatisfied) && capabilities.every(capability => grants.some(grant => grant.capability === capability));
  await db.activityEvent.create({ data: { type: allowed ? "GOVERNANCE_ACCESS" : "GOVERNANCE_DENIED", actorAccountId: session.accountId, summary: allowed ? "Governance capability check passed" : "Governance capability or MFA check denied" } });
  if (!allowed) notFound();
  return session;
}

export async function requireMembership(companyId: string) {
  const session = await requireSession();
  const membership = await db.companyMember.findFirst({ where: { companyId, accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } }, include: { roleGrants: { where: { revokedAt: null, functionalRole: { active: true } }, include: { functionalRole: true } } } });
  if (!membership) notFound();
  return { session, membership };
}

export async function navigationAccess() {
  const token = (await cookies()).get(sessionCookieName)?.value;
  const resolved = token ? await resolveDatabaseSession(db, token) : null;
  const session = resolved && resolved.identity.provider === authSettings().issuer ? resolved : null;
  if (!session) return { signedIn: false, company: false, governance: false, legal: false };
  const [company, governance, legal] = await Promise.all([
    db.companyMember.findFirst({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } } }),
    db.governanceCapabilityGrant.findFirst({ where: { accountId: session.accountId, revokedAt: null } }),
    db.legalAccessGrant.findFirst({ where: { grantedToAccountId: session.accountId, status: "ACTIVE", revokedAt: null, startsAt: { lte: new Date() }, expiresAt: { gt: new Date() } } }),
  ]);
  return { signedIn: true, company: Boolean(company), governance: Boolean(governance), legal: Boolean(legal) };
}
