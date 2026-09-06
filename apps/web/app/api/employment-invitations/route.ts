import { authSettings, sessionCookieName } from "../../../lib/auth";
import { requestCookie } from "../../../lib/onboarding-state";
import { db } from "../../../lib/database";
import { EmploymentError, sendEmploymentInvitation, resolveEmploymentInvitation } from "../../../lib/employment-service";
import { validEmploymentCsrf } from "../../../lib/employment-security";
import { configuredMailProvider } from "@samma/integrations";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  const settings = authSettings();
  if (request.headers.get("origin") !== settings.baseUrl) return new Response(null, { status: 403, headers });
  const sessionToken = requestCookie(request, sessionCookieName);
  if (!sessionToken) return new Response(null, { status: 401, headers });
  if (!validEmploymentCsrf(settings.secret, sessionToken, request.headers.get("x-samma-csrf"))) return new Response(null, { status: 403, headers });
  if (request.headers.get("content-type") !== "application/json") return new Response(null, { status: 415, headers });
  try {
    const text = await request.text();
    if (text.length > 2048) return new Response(null, { status: 413, headers });
    const data = JSON.parse(text);
    if (!data || Array.isArray(data) || typeof data !== "object") return new Response(null, { status: 400, headers });
    const actor = { sessionToken, issuer: settings.issuer };
    if (data.action === "send") {
      if (Object.keys(data).sort().join(",") !== "action,companyId,email" || typeof data.companyId !== "string" || !data.companyId || data.companyId.length > 128) return new Response(null, { status: 400, headers });
      const result = await sendEmploymentInvitation(db, actor, { companyId: data.companyId, email: data.email }, () => configuredMailProvider(),
        { baseUrl: settings.baseUrl, ttlHours: Number(process.env.SAMMA_EMPLOYMENT_INVITATION_TTL_HOURS ?? "24") });
      return Response.json(result, { headers });
    }
    if (!["accept", "decline", "revoke"].includes(data.action) || Object.keys(data).sort().join(",") !== "action,invitationId" ||
        typeof data.invitationId !== "string" || !data.invitationId || data.invitationId.length > 128) return new Response(null, { status: 400, headers });
    return Response.json(await resolveEmploymentInvitation(db, actor, data.invitationId, data.action), { headers });
  } catch (error) {
    if (error instanceof EmploymentError) return Response.json({ code: error.code }, { status: error.code === "invalid_email" ? 422 : error.code === "unavailable" ? 409 : 403, headers });
    if (error instanceof SyntaxError) return new Response(null, { status: 400, headers });
    // Never serialize/log provider errors, database queries, emails or session data.
    console.error("Employment invitation request failed");
    return Response.json({ code: "unexpected" }, { status: 500, headers });
  }
}
