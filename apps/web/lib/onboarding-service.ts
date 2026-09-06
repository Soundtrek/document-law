import type { createPrismaClient } from "@samma/database";
import { verifiedOidcClaims } from "@samma/identity";
import type { CompanySetupState } from "./onboarding-state";
import { AuthEntryError } from "./auth-errors";
import { CompanySetupError, CompanySetupUnexpectedError } from "./company-setup-errors";

type Database = ReturnType<typeof createPrismaClient>;

// Called only after the provider's code, signature, issuer, audience, PKCE, state and nonce checks.
export async function resolveOnboardingIdentity(db: Database, issuer: string, profile: Parameters<typeof verifiedOidcClaims>[0], allowCreate: boolean) {
  const claims = verifiedOidcClaims(profile);
  return db.$transaction(async tx => {
    // Serialize first callbacks for the same provider subject, including retries from another tab.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify([issuer, claims.subject])}, 0))::text`;
    let identity = await tx.accountIdentity.findUnique({ where: { provider_providerSubject: { provider: issuer, providerSubject: claims.subject } }, include: { account: true } });
    if (!identity) {
      if (!allowCreate) throw new AuthEntryError("OnboardingRequired");
      // Serialize different subjects presenting the same email, including case variants.
      // This check rejects collisions; it never selects an Account for linking.
      const email = claims.email.toLowerCase();
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"samma-registration-email:" + email}, 0))::text`;
      if (await tx.account.findFirst({ where: { primaryEmail: { equals: email, mode: "insensitive" } }, select: { id: true } })) {
        throw new AuthEntryError("EmailCollision");
      }
      const account = await tx.account.create({ data: { primaryEmail: email, emailVerified: true } });
      identity = await tx.accountIdentity.create({ data: { accountId: account.id, provider: issuer, providerSubject: claims.subject, emailAtProvider: claims.email }, include: { account: true } });
    }
    await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${identity.accountId} FOR UPDATE`;
    const account = await tx.account.findUniqueOrThrow({ where: { id: identity.accountId } });
    if (account.status !== "ACTIVE" || !account.emailVerified) throw new AuthEntryError("AccountUnavailable");
    let person = await tx.person.findUnique({ where: { accountId: account.id } });
    if (!person) {
      person = await tx.person.create({ data: { accountId: account.id, displayName: "Your personal account" } });
      await tx.activityEvent.create({ data: { type: "PERSON_ACCOUNT_CREATED", actorAccountId: account.id, personId: person.id, summary: "Independent personal account established through verified identity" } });
    }
    return { account, identity, person, mfaSatisfied: claims.mfaSatisfied };
  });
}

export function companyName(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 160 || /[\u0000-\u001f\u007f]/.test(value)) throw new CompanySetupError("invalid_name");
  return value.trim();
}

export async function completeCompanyOnboarding(db: Database, sessionToken: string, issuer: string, state: CompanySetupState | null, nameInput: unknown) {
  const name = companyName(nameInput);
  let stage: CompanySetupUnexpectedError["stage"] = "session";
  return db.$transaction(async tx => {
    const initial = await tx.authSession.findUnique({ where: { sessionToken }, select: { accountId: true } });
    if (!initial) throw new CompanySetupError("session_required");
    await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${initial.accountId} FOR UPDATE`;
    const session = await tx.authSession.findUnique({ where: { sessionToken }, include: { account: { include: { person: true } }, identity: true } });
    if (!session || session.expires <= new Date() ||
        session.identity.accountId !== session.accountId || session.identity.provider !== issuer ||
        session.account.status !== "ACTIVE" || !session.account.emailVerified || !session.account.person) throw new CompanySetupError("session_required");
    if (state && (session.accountId !== state.accountId || session.identityId !== state.identityId)) throw new CompanySetupError("identity_mismatch");
    stage = "existing_workspace";
    // A successful response clears setup state. A retry can recover the existing
    // authorised workspace, but missing/expired state can never create one.
    if (!state || state.purpose !== "company" || state.expires <= Date.now()) {
      const completed = await tx.companyMember.findFirst({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } } });
      if (completed) return completed.companyId;
      throw new CompanySetupError("setup_expired");
    }
    // The opaque flow nonce is also the company ID: even a replay after membership removal cannot recreate it.
    const previous = await tx.company.findUnique({ where: { id: state.nonce }, include: { members: { where: { accountId: session.accountId, status: "ACTIVE" } } } });
    if (previous) {
      if (previous.status !== "ACTIVE" || !previous.members.length) throw new CompanySetupError("workspace_unavailable");
      return previous.id;
    }
    // An existing member enters their workspace; another login/tab never creates another initial company.
    const membership = await tx.companyMember.findFirst({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } } });
    if (membership) return membership.companyId;
    stage = "owner_catalogue";
    await tx.$queryRaw`SELECT "id" FROM "FunctionalRoleDefinition" WHERE "code" = 'OWNER' FOR SHARE`;
    const owner = await tx.functionalRoleDefinition.findUnique({ where: { code: "OWNER" } });
    const capabilities = owner?.capabilities;
    // OWNER has exactly the approved company governance powers; policy edits cannot smuggle functional/platform access into onboarding.
    if (!owner?.active || !Array.isArray(capabilities) || capabilities.length !== 2 ||
        !capabilities.includes("company.members.manage") || !capabilities.includes("company.settings.manage")) throw new CompanySetupError("owner_unavailable");
    stage = "workspace_write";
    const company = await tx.company.create({ data: { id: state.nonce, name, members: { create: { accountId: session.accountId, status: "ACTIVE", roleGrants: { create: { functionalRoleId: owner.id } } } } } });
    stage = "audit_write";
    await tx.activityEvent.createMany({ data: [
      { type: "COMPANY_CREATED", summary: "Company workspace created during onboarding" },
      { type: "COMPANY_MEMBER_JOINED", summary: "Initial company member activated" },
      { type: "COMPANY_MEMBER_ROLE_GRANTED", summary: "Approved OWNER role granted to initial member" },
    ].map(event => ({ ...event, actorAccountId: session.accountId, personId: session.account.person!.id, companyId: company.id })) });
    return company.id;
  }).catch((error: unknown) => { throw error instanceof CompanySetupError ? error : new CompanySetupUnexpectedError(stage); });
}
