import "server-only";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { requireGovernance, requireSession } from "./access";
import { authSettings, sessionCookieName } from "./auth";
import { db } from "./database";
import { definitionCatalogue, DefinitionError } from "./record-definitions";
import { definitionCsrf } from "./definition-security";
export async function loadDefinitionPage(companyId: string | null) {
  if (companyId === null) await requireGovernance(["platform.definitions.manage"]); else await requireSession();
  const settings = authSettings(), sessionToken = (await cookies()).get(sessionCookieName)!.value;
  try {
    const catalogue = await definitionCatalogue(db, { sessionToken, issuer: settings.issuer,
      mfaRequired: process.env.SAMMA_ENV !== "development" || process.env.SAMMA_GOVERNANCE_MFA_REQUIRED !== "false" }, companyId);
    return { ...catalogue, companyId, csrf: definitionCsrf(settings.secret, sessionToken), base: companyId ? `/company/${encodeURIComponent(companyId)}/document-settings` : "/governance/definitions" };
  } catch (error) { if (error instanceof DefinitionError && error.code === "denied") notFound(); throw error; }
}
