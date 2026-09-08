import { revalidatePath } from "next/cache";
import { authSettings, sessionCookieName } from "../../../lib/auth";
import { requestCookie } from "../../../lib/onboarding-state";
import { db } from "../../../lib/database";
import { mutateDefinition, DefinitionError, type DefinitionMutation } from "../../../lib/record-definitions";
import { validDefinitionCsrf } from "../../../lib/definition-security";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  const settings = authSettings();
  if (request.headers.get("origin") !== settings.baseUrl) return new Response(null, { status: 403, headers });
  const sessionToken = requestCookie(request, sessionCookieName);
  if (!sessionToken) return new Response(null, { status: 401, headers });
  if (!validDefinitionCsrf(settings.secret, sessionToken, request.headers.get("x-samma-csrf"))) return new Response(null, { status: 403, headers });
  if (request.headers.get("content-type") !== "application/json") return new Response(null, { status: 415, headers });
  try {
    const text = await request.text();
    if (text.length > 16384) return new Response(null, { status: 413, headers });
    const data = JSON.parse(text);
    const id = (v: unknown) => typeof v === "string" && v.length > 0 && v.length <= 128;
    if (!data || typeof data !== "object" || Array.isArray(data) || !["save", "activate", "deactivate"].includes(data.action) ||
        !(data.companyId === null || id(data.companyId)) || (data.definitionId !== undefined && !id(data.definitionId)) ||
        (data.definitionId ? !Number.isSafeInteger(data.expectedVersion) || data.expectedVersion < 1 : data.action !== "save") ||
        Object.keys(data).some(k => !["companyId", "action", "definitionId", "expectedVersion", "policy"].includes(k))) return new Response(null, { status: 400, headers });
    const result = await mutateDefinition(db, { sessionToken, issuer: settings.issuer,
      mfaRequired: process.env.SAMMA_ENV !== "development" || process.env.SAMMA_GOVERNANCE_MFA_REQUIRED !== "false" }, data.companyId, data as DefinitionMutation);
    revalidatePath("/governance", "layout"); revalidatePath("/company", "layout"); revalidatePath("/person", "layout");
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof DefinitionError) return Response.json({ code: error.code }, { status: error.code === "denied" ? 403 : error.code === "conflict" ? 409 : 422, headers });
    if (error instanceof SyntaxError) return new Response(null, { status: 400, headers });
    console.error("Record definition change failed");
    return Response.json({ code: "unexpected" }, { status: 500, headers });
  }
}
