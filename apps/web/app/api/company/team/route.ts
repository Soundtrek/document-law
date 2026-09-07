import { revalidatePath } from "next/cache";
import { authSettings, sessionCookieName } from "../../../../lib/auth";
import { requestCookie } from "../../../../lib/onboarding-state";
import { db } from "../../../../lib/database";
import { saveCompanyMemberRoles, TeamAccessError } from "../../../../lib/company-team";
import { validTeamCsrf, teamRoleInput } from "../../../../lib/team-security";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  const settings = authSettings();
  if (request.headers.get("origin") !== settings.baseUrl) return new Response(null, { status: 403, headers });
  const sessionToken = requestCookie(request, sessionCookieName);
  if (!sessionToken) return new Response(null, { status: 401, headers });
  if (!validTeamCsrf(settings.secret, sessionToken, request.headers.get("x-samma-csrf"))) return new Response(null, { status: 403, headers });
  if (request.headers.get("content-type") !== "application/json") return new Response(null, { status: 415, headers });
  try {
    const text = await request.text();
    if (text.length > 16384) return new Response(null, { status: 413, headers });
    const data: unknown = JSON.parse(text);
    if (!teamRoleInput(data)) return new Response(null, { status: 400, headers });
    const result = await saveCompanyMemberRoles(db, { sessionToken, issuer: settings.issuer }, data);
    revalidatePath("/company", "layout");
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof TeamAccessError) return Response.json({ code: error.code }, { status: error.code === "denied" ? 403 : error.code === "invalid_roles" ? 422 : 409, headers });
    if (error instanceof SyntaxError) return new Response(null, { status: 400, headers });
    console.error("Company team access update failed");
    return Response.json({ code: "unexpected" }, { status: 500, headers });
  }
}
