import type { createPrismaClient } from "@samma/database";
import { verifiedOidcClaims } from "@samma/identity";
import { normalEmail } from "./workflow-service";
type Database = ReturnType<typeof createPrismaClient>;
// Called only after Auth.js has verified the provider response, state, nonce and PKCE.
export async function onboardVerifiedIdentity(db: Database, issuer: string, profile: Parameters<typeof verifiedOidcClaims>[0] & { name?: unknown }) {
  const claims = verifiedOidcClaims(profile);
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async tx => {
        let identity = await tx.accountIdentity.findUnique({ where: { provider_providerSubject: { provider: issuer, providerSubject: claims.subject } }, include: { account: true } });
        if (!identity) {
          const email = normalEmail(claims.email);
          if (await tx.account.findFirst({ where: { primaryEmail: { equals: email, mode: "insensitive" } } })) throw new Error("Explicit identity-link review required");
          const account = await tx.account.create({ data: { primaryEmail: email, emailVerified: true } });
          identity = await tx.accountIdentity.create({ data: { accountId: account.id, provider: issuer, providerSubject: claims.subject, emailAtProvider: claims.email }, include: { account: true } });
          await tx.activityEvent.create({ data: { type: "ACCOUNT_ONBOARDED", actorAccountId: account.id, summary: "New account linked to verified OIDC subject; no email merge" } });
        }
        if (identity.account.status !== "ACTIVE" || !identity.account.emailVerified) throw new Error("Authentication unavailable");
        // Account contact remains authoritative. Provider email changes never relink identity.
        const existing = await tx.person.findUnique({ where: { accountId: identity.accountId } });
        if (!existing) {
          const displayName = typeof profile.name === "string" && profile.name.trim() ? profile.name.trim().slice(0, 160) : "Your personal account";
          const person = await tx.person.create({ data: { accountId: identity.accountId, displayName } });
          await tx.activityEvent.create({ data: { type: "PERSON_CREATED", actorAccountId: identity.accountId, personId: person.id, summary: "Personal account onboarding completed" } });
        }
        return identity;
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (attempt >= 2 || !error || typeof error !== "object" || !("code" in error) || !["P2034", "P2002"].includes(String(error.code))) throw error;
    }
  }
}
