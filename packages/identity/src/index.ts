export interface AuthenticatedPrincipal {
  readonly accountId: string;
  readonly primaryEmail: string;
  readonly emailVerified: boolean;
  readonly provider: string;
  readonly providerSubject: string;
  readonly mfaSatisfied: boolean;
}

export interface ExternalIdentityInput {
  readonly provider: string;
  readonly providerSubject: string;
  readonly emailAtProvider?: string;
}

export interface LinkedIdentity extends ExternalIdentityInput {
  readonly accountId: string;
  readonly linkedAt: string;
}

export interface IdentityProviderBoundary {
  resolvePrincipal(sessionToken: string): Promise<AuthenticatedPrincipal | null>;
  revokeAccountSessions(accountId: string): Promise<void>;
}

const providerKey = ({ provider, providerSubject }: ExternalIdentityInput): string => `${provider}:${providerSubject}`;

export class InMemoryIdentityLinkRegistry {
  readonly #links = new Map<string, LinkedIdentity>();

  link(accountId: string, identity: ExternalIdentityInput, linkedAt: string): LinkedIdentity {
    const key = providerKey(identity);
    const existing = this.#links.get(key);
    if (existing && existing.accountId !== accountId) throw new Error("Provider identity is already linked to another SAMMA account");

    const linked: LinkedIdentity = { ...identity, accountId, linkedAt };
    this.#links.set(key, linked);
    return linked;
  }

  resolve(identity: ExternalIdentityInput): LinkedIdentity | null {
    return this.#links.get(providerKey(identity)) ?? null;
  }

  findByProviderEmail(_provider: string, _email: string): never {
    throw new Error("SAMMA does not merge or resolve accounts solely from matching provider email");
  }
}

export const requireVerifiedPrincipal = (principal: AuthenticatedPrincipal | null): AuthenticatedPrincipal => {
  if (!principal) throw new Error("Authentication required");
  if (!principal.emailVerified) throw new Error("Verified email required");
  return principal;
};

export const requireMfa = (principal: AuthenticatedPrincipal): AuthenticatedPrincipal => {
  if (!principal.mfaSatisfied) throw new Error("MFA step-up required");
  return principal;
};

export const requireCapability = (capabilities: readonly string[], required: string): void => {
  if (!capabilities.includes(required)) throw new Error(`Missing capability: ${required}`);
};
