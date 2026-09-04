import { requireCapability, requireMfa, requireVerifiedPrincipal, type AuthenticatedPrincipal } from "@juanity/identity";

const governanceCapabilities = [
  "platform.definitions.manage",
  "platform.roles.manage",
  "platform.audit.review",
] as const;

export const getSyntheticGovernancePrincipal = (): AuthenticatedPrincipal | null => {
  const enabled = process.env.JUANITY_DEV_IDENTITY_ENABLED === "true";
  if (!enabled || process.env.NODE_ENV === "production") return null;
  return {
    accountId: "acct-governance-dev",
    primaryEmail: "governance@example.test",
    emailVerified: true,
    provider: "development",
    providerSubject: "synthetic-governance",
    mfaSatisfied: true,
  };
};

export const canRenderSyntheticGovernance = (): boolean => {
  const principal = getSyntheticGovernancePrincipal();
  if (!principal) return false;
  const verified = requireVerifiedPrincipal(principal);
  requireMfa(verified);
  requireCapability(governanceCapabilities, "platform.definitions.manage");
  return true;
};
