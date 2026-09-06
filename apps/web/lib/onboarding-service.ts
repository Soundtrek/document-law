import type { createPrismaClient } from "@samma/database";
import { verifiedOidcClaims } from "@samma/identity";
import type { CompanySetupState } from "./onboarding-state";

type Database = ReturnType<typeof createPrismaClient>;

// Called only after the provider's code, signature, issuer, audience, PKCE, state and nonce checks.
export async function resolveOnboardingIdentity(db: Database, issuer: string, profile: Parameters<typeof verifiedOidcClaims>[0], allowCreate: boolean) {
  const claims = verifiedOidcClaims(profile);
  return db.$transaction(async tx => {
    // Serialize first callbacks for the same provider subject, including retries from another tab.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify([issuer, claims.subject])}, 0))::text`;
    let identity = await tx.accountIdentity.findUnique({ where: { provider_providerSubject: { provider: issuer, providerSubject: claims.subject } }, include: { account: true } });
    if (!identity) {
      if (!allowCreate) throw new Error("Choose an onboarding path first");
      // The unique email constraint rejects a collision. Never attach a new subject by matching email.
      const account = await tx.account.create({ data: { primaryEmail: claims.email, emailVerified: true } });
      identity = await tx.accountIdentity.create({ data: { accountId: account.id, provider: issuer, providerSubject: claims.subject, emailAtProvider: claims.email }, include: { account: true } });
    }
    await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${identity.accountId} FOR UPDATE`;
    const account = await tx.account.findUniqueOrThrow({ where: { id: identity.accountId } });
    if (account.status !== "ACTIVE" || !account.emailVerified) throw new Error("Verified active account required");
    let person = await tx.person.findUnique({ where: { accountId: account.id } });
    if (!person) {
      person = await tx.person.create({ data: { accountId: account.id, displayName: "Your personal account" } });
      await tx.activityEvent.create({ data: { type: "PERSON_ACCOUNT_CREATED", actorAccountId: account.id, personId: person.id, summary: "Independent personal account established through verified identity" } });
    }
    return { account, identity, person, mfaSatisfied: claims.mfaSatisfied };
  });
}

export function companyName(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 160 || /[\u0000-\u001f\u007f]/.test(value)) throw new Error("Enter a company name of 1–160 characters");
  return value.trim();
}

export async function completeCompanyOnboarding(db: Database, sessionToken: string, issuer: string, state: CompanySetupState, nameInput: unknown) {
  const name = companyName(nameInput);
  return db.$transaction(async tx => {
    if (state.purpose !== "company" || state.expires <= Date.now()) throw new Error("Company setup expired");
    await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${state.accountId} FOR UPDATE`;
    const session = await tx.authSession.findUnique({ where: { sessionToken }, include: { account: { include: { person: true } }, identity: true } });
    if (!session || session.expires <= new Date() || session.accountId !== state.accountId || session.identityId !== state.identityId ||
        session.identity.accountId !== session.accountId || session.identity.provider !== issuer ||
        session.account.status !== "ACTIVE" || !session.account.emailVerified || !session.account.person) throw new Error("Verified active identity required");
    // The opaque flow nonce is also the company ID: even a replay after membership removal cannot recreate it.
    const previous = await tx.company.findUnique({ where: { id: state.nonce }, include: { members: { where: { accountId: session.accountId, status: "ACTIVE" } } } });
    if (previous) {
      if (previous.status !== "ACTIVE" || !previous.members.length) throw new Error("Company access unavailable");
      return previous.id;
    }
    // An existing member enters their workspace; another login/tab never creates another initial company.
    const membership = await tx.companyMember.findFirst({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } } });
    if (membership) return membership.companyId;
    await tx.$queryRaw`SELECT "id" FROM "FunctionalRoleDefinition" WHERE "code" = 'OWNER' FOR SHARE`;
    const owner = await tx.functionalRoleDefinition.findUnique({ where: { code: "OWNER" } });
    const capabilities = owner?.capabilities;
    // OWNER has exactly the approved company governance powers; policy edits cannot smuggle functional/platform access into onboarding.
    if (!owner?.active || !Array.isArray(capabilities) || capabilities.length !== 2 ||
        !capabilities.includes("company.members.manage") || !capabilities.includes("company.settings.manage")) throw new Error("Approved OWNER role unavailable");
    const company = await tx.company.create({ data: { id: state.nonce, name, members: { create: { accountId: session.accountId, status: "ACTIVE", roleGrants: { create: { functionalRoleId: owner.id } } } } } });
    await tx.activityEvent.createMany({ data: [
      { type: "COMPANY_CREATED", summary: "Company workspace created during onboarding" },
      { type: "COMPANY_MEMBER_JOINED", summary: "Initial company member activated" },
      { type: "COMPANY_MEMBER_ROLE_GRANTED", summary: "Approved OWNER role granted to initial member" },
    ].map(event => ({ ...event, actorAccountId: session.accountId, personId: session.account.person!.id, companyId: company.id })) });
    return company.id;
  });
}
