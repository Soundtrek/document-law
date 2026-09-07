import { revalidatePath } from "next/cache";
import { configuredMailProvider } from "@samma/integrations";
import { authSettings, sessionCookieName } from "../../../../lib/auth";
import { requestCookie } from "../../../../lib/onboarding-state";
import { db } from "../../../../lib/database";
import { TeamInvitationError, sendTeamInvitation, resolveTeamInvitation } from "../../../../lib/team-invitations";
import { validTeamCsrf, teamInvitationInput } from "../../../../lib/team-security";
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
    if (!teamInvitationInput(data)) return new Response(null, { status: 400, headers });
    const actor = { sessionToken, issuer: settings.issuer };
    const result = data.action === "send"
      ? await sendTeamInvitation(db, actor, data, () => configuredMailProvider(), { baseUrl: settings.baseUrl, ttlHours: Number(process.env.SAMMA_TEAM_INVITATION_TTL_HOURS ?? "24") })
      : await resolveTeamInvitation(db, actor, data.invitationId, data.action);
    revalidatePath("/company", "layout"); revalidatePath("/person");
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof TeamInvitationError) return Response.json({ code: error.code }, { status: error.code === "denied" ? 403 : error.code === "unavailable" ? 409 : 422, headers });
    if (error instanceof SyntaxError) return new Response(null, { status: 400, headers });
    console.error("Company team invitation request failed");
    return Response.json({ code: "unexpected" }, { status: 500, headers });
  }
}
