import { authSettings, sessionCookieName } from "../../../../lib/auth";
import { db } from "../../../../lib/database";
import { completeCompanyOnboarding } from "../../../../lib/onboarding-service";
import { onboardingCookie, readOnboarding, requestCookie, setupCookieName } from "../../../../lib/onboarding-state";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const settings = authSettings();
  const headers = { "Cache-Control": "no-store" };
  if (request.headers.get("origin") !== settings.baseUrl) return new Response(null, { status: 403, headers });
  const state = readOnboarding(requestCookie(request, setupCookieName), settings.secret, "company");
  const token = requestCookie(request, sessionCookieName);
  if (!state || !token) return new Response(null, { status: 403, headers });
  try {
    const form = await request.formData();
    if ([...form.keys()].some(key => key !== "name") || form.getAll("name").length !== 1) return new Response(null, { status: 400, headers });
    await completeCompanyOnboarding(db, token, settings.issuer, state, form.get("name"));
    return Response.json({ destination: "/company" }, { headers: { ...headers, "Set-Cookie": onboardingCookie(setupCookieName, "", 0) } });
  } catch { return new Response("Company setup unavailable. Check your details or restart setup.", { status: 400, headers }); }
}
