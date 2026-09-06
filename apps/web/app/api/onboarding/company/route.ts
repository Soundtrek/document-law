import { authSettings, sessionCookieName } from "../../../../lib/auth";
import { db } from "../../../../lib/database";
import { completeCompanyOnboarding } from "../../../../lib/onboarding-service";
import { onboardingCookie, readOnboarding, requestCookie, setupCookieName } from "../../../../lib/onboarding-state";
import { CompanySetupError, CompanySetupUnexpectedError, companySetupMessage } from "../../../../lib/company-setup-errors";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const settings = authSettings();
  const headers = { "Cache-Control": "no-store" };
  if (request.headers.get("origin") !== settings.baseUrl) return new Response(null, { status: 403, headers });
  const state = readOnboarding(requestCookie(request, setupCookieName), settings.secret, "company");
  const token = requestCookie(request, sessionCookieName);
  if (!token) return Response.json({ code: "session_required", message: companySetupMessage("session_required") }, { status: 401, headers });
  try {
    const form = await request.formData();
    if ([...form.keys()].some(key => key !== "name") || form.getAll("name").length !== 1) throw new CompanySetupError("invalid_name");
    await completeCompanyOnboarding(db, token, settings.issuer, state, form.get("name"));
    return Response.json({ destination: "/company" }, { headers: { ...headers, "Set-Cookie": onboardingCookie(setupCookieName, "", 0) } });
  } catch (error) {
    const code = error instanceof CompanySetupError ? error.code : "unexpected";
    const status = code === "invalid_name" ? 422 : code === "session_required" ? 401 : code === "identity_mismatch" || code === "workspace_unavailable" ? 403 : code === "setup_expired" ? 409 : code === "owner_unavailable" ? 503 : 500;
    // Fixed categories only: never log names, account IDs, cookies or raw errors.
    console.error("Company setup failed", code, error instanceof CompanySetupUnexpectedError ? error.stage : "request");
    return Response.json({ code, message: companySetupMessage(code) }, { status, headers });
  }
}
