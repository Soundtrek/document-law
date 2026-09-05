import { cookies } from "next/headers";
import { authSettings, sessionCookieName } from "../../../lib/auth";
import { db } from "../../../lib/database";
export async function GET() {
  const settings = authSettings();
  const token = (await cookies()).get(sessionCookieName)?.value;
  // Only complete provider logout after Auth.js has cleared the local session using CSRF-protected POST.
  if (token && await db.authSession.findUnique({ where: { sessionToken: token } })) {
    return Response.redirect(new URL("/person", settings.baseUrl), 303);
  }
  const target = new URL(`${settings.issuer}/protocol/openid-connect/logout`);
  target.searchParams.set("client_id", settings.clientId);
  target.searchParams.set("post_logout_redirect_uri", `${settings.baseUrl}/`);
  return Response.redirect(target, 303);
}
