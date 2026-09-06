import "server-only";
import { checkGovernanceAccess } from "./governance-authorisation";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "./database";
import { authSettings, sessionCookieName } from "./auth";
import { resolveDatabaseSession } from "./auth-adapter";
import { companySetupMatches, readOnboarding, setupCookieName } from "./onboarding-state";

export async function pendingCompanySetup(session: { accountId: string; identityId: string }) {
  const state = readOnboarding((await cookies()).get(setupCookieName)?.value, authSettings().secret, "company");
  return companySetupMatches(state, session) && !await db.companyMember.findFirst({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } } });
}

export async function requireSession() {
  const settings = authSettings();
  const token = (await cookies()).get(sessionCookieName)?.value;
  const session = token ? await resolveDatabaseSession(db, token) : null;
  if (!session || session.identity.provider !== settings.issuer) redirect("/sign-in");
  return session;
}

export async function requireGovernance(capabilities: readonly string[]) {
  const session = await requireSession();
  const mfaRequired = process.env.SAMMA_ENV !== "development" || process.env.SAMMA_GOVERNANCE_MFA_REQUIRED !== "false";
  const allowed = await checkGovernanceAccess(db, session, capabilities, mfaRequired);
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
  if (!session) return { signedIn: false, company: false, governance: false, governanceHref: "/governance", legal: false, companySetup: false };
  const [company, governance, legal] = await Promise.all([
    db.companyMember.findFirst({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } } }),
    db.governanceCapabilityGrant.findMany({ where: { accountId: session.accountId, revokedAt: null }, select: { capability: true } }),
    db.legalAccessGrant.findFirst({ where: { grantedToAccountId: session.accountId, status: "ACTIVE", revokedAt: null, startsAt: { lte: new Date() }, expiresAt: { gt: new Date() } } }),
  ]);
  return { signedIn: true, company: Boolean(company), governance: governance.length > 0, governanceHref: governance.some(grant => grant.capability === "platform.security.review") && !["platform.definitions.manage", "platform.roles.manage", "platform.audit.review"].every(capability => governance.some(grant => grant.capability === capability)) ? "/governance/users" : "/governance", legal: Boolean(legal), companySetup: !company && await pendingCompanySetup(session) };
}
