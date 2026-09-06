import "server-only";
import { Auth } from "@auth/core";
import Keycloak from "@auth/core/providers/keycloak";
import { safeAuthenticationRedirect, verifiedOidcClaims } from "@samma/identity";
import { db } from "./database";
import { sammaAdapter, resolveDatabaseSession, type LoginContext } from "./auth-adapter";
import { AuthEntryError, type AuthFailure } from "./auth-errors";
import { resolveOnboardingIdentity } from "./onboarding-service";
import { flowCookieName, setupCookieName, newFlow, newCompanySetup, companySetupMatches, onboardingChoice, onboardingCookie, readOnboarding, requestCookie, sealOnboarding, type OnboardingChoice } from "./onboarding-state";

export const sessionCookieName = "__Host-samma.session-token";
export function authSettings() {
  const baseUrl = process.env.SAMMA_BASE_URL;
  const issuer = process.env.SAMMA_OIDC_ISSUER;
  const secret = process.env.AUTH_SECRET;
  const clientId = process.env.SAMMA_OIDC_CLIENT_ID;
  const clientSecret = process.env.SAMMA_OIDC_CLIENT_SECRET;
  if (!baseUrl || new URL(baseUrl).protocol !== "https:" || !issuer || new URL(issuer).protocol !== "https:" ||
      !secret || !clientId || !clientSecret || process.env.SAMMA_DEV_IDENTITY_ENABLED !== "false") {
    throw new Error("Authentication configuration unavailable");
  }
  return { baseUrl: new URL(baseUrl).origin, issuer, secret, clientId, clientSecret };
}

export async function handleAuthentication(request: Request): Promise<Response> {
  try {
    const settings = authSettings();
    const incoming = new URL(request.url);
    const action = incoming.pathname.replace("/api/auth/", "");
    if (!["csrf", "session", "providers", "signin", "signin/keycloak", "callback/keycloak", "signout", "error"].includes(action)) return new Response(null, { status: 404 });
    if (request.method === "POST" && request.headers.get("origin") !== settings.baseUrl) return new Response(null, { status: 403 });
    // Fixed canonical origin; untrusted Host/proxy headers cannot change callback URLs.
    const canonical = new URL(incoming.pathname + incoming.search, settings.baseUrl);
    let loginHint = "";
    let choice: OnboardingChoice | undefined;
    let registration = false;
    let failure: AuthFailure | undefined;
    const flow = action === "callback/keycloak" ? readOnboarding(requestCookie(request, flowCookieName), settings.secret, "authentication") : null;
    const verifiedFlow = flow && flow.oauthState === incoming.searchParams.get("state") ? flow : null;
    if (action.startsWith("signin")) {
      canonical.search = ""; // Never forward arbitrary OAuth parameter overrides.
      if (request.method === "POST") {
        const form = await request.clone().formData();
        if (form.has("onboardingChoice")) {
          try {
            if (form.getAll("onboardingChoice").length !== 1) throw new Error("Invalid choice");
            choice = onboardingChoice(form.get("onboardingChoice"));
          } catch { return new Response("Choose Person or Company.", { status: 400 }); }
          const token = requestCookie(request, sessionCookieName);
          const session = token ? await resolveDatabaseSession(db, token) : null;
          // Existing authenticated people can explicitly start Company setup without registering again.
          registration = !session || session.identity.provider !== settings.issuer;
        }
        const hint = form.get("login_hint");
        if (typeof hint === "string" && hint.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hint)) loginHint = hint;
        // Fixed shared window is conservative and cannot be bypassed by forged IP headers.
        const key = `signin:${Math.floor(Date.now() / 60000)}`;
        const rate = await db.authRateLimit.upsert({ where: { key }, create: { key, count: 1, expires: new Date(Date.now() + 120000) }, update: { count: { increment: 1 } } });
        await db.authRateLimit.deleteMany({ where: { expires: { lt: new Date() } } });
        if (rate.count > 30) return new Response("Please try again shortly.", { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
      }
    }
    const login: LoginContext = {};
    const headers = new Headers(request.headers);
    headers.set("host", new URL(settings.baseUrl).host);
    headers.delete("x-forwarded-host");
    headers.delete("x-forwarded-proto");
    const normalized = new Request(canonical, { method: request.method, headers, ...(request.method === "POST" ? { body: await request.text() } : {}) });
    const authResponse = await Auth(normalized, {
      basePath: "/api/auth", trustHost: true, secret: settings.secret, useSecureCookies: true,
      providers: [Keycloak({ issuer: settings.issuer, clientId: settings.clientId, clientSecret: settings.clientSecret,
        checks: ["pkce", "state", "nonce"], authorization: { params: { scope: "openid email profile", ...(registration ? { prompt: "create" } : {}), ...(loginHint ? { login_hint: loginHint } : {}) } },
      })],
      adapter: sammaAdapter(db, settings.issuer, login),
      session: { strategy: "database", maxAge: 3600, updateAge: 3600 },
      cookies: { sessionToken: { name: sessionCookieName, options: { httpOnly: true, secure: true, sameSite: "lax", path: "/" } } },
      pages: { signIn: "/sign-in", error: "/sign-in" },
      callbacks: {
        async signIn({ account, profile }) {
          try {
            if (account?.provider !== "keycloak" || !profile) return false;
            if (profile.email_verified !== true) throw new AuthEntryError("EmailUnverified");
            const claims = verifiedOidcClaims(profile);
            if (claims.subject !== account.providerAccountId) return false;
            // A callback carrying expired/tampered onboarding state cannot become an ordinary login.
            if (requestCookie(request, flowCookieName) && !verifiedFlow) throw new AuthEntryError("OnboardingExpired");
            const resolved = await resolveOnboardingIdentity(db, settings.issuer, profile, Boolean(verifiedFlow));
            login.accountId = resolved.account.id; login.identityId = resolved.identity.id; login.mfaSatisfied = resolved.mfaSatisfied;
            return true;
          } catch (error) {
            if (error instanceof AuthEntryError) failure = error.code;
            return false;
          }
        },
        redirect({ url }) { return safeAuthenticationRedirect(url, settings.baseUrl); },
        session({ session, user }) { return { expires: session.expires, user: { id: user.id, email: user.email } }; },
      },
      events: {
        async signIn({ user }) { await db.activityEvent.create({ data: { type: "AUTH_LOGIN", actorAccountId: user.id ?? null, summary: "Verified OIDC login" } }); },
        async signOut(message) { if ("session" in message && message.session) await db.activityEvent.create({ data: { type: "AUTH_LOGOUT", actorAccountId: message.session.userId, summary: "Application session ended; provider logout requested" } }); },
      },
      // Never log provider responses, tokens, email hints or callback parameters.
      logger: { error(error) { console.error("Authentication request failed", error.name); }, warn() {}, debug() {} },
    });
    const response = new Response(authResponse.body, { status: authResponse.status, headers: new Headers(authResponse.headers) });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    if (action === "signin/keycloak" && request.method === "POST") {
      // Auth.js must first accept CSRF and produce its own provider authorization URL.
      const location = response.headers.get("location");
      const authorization = location ? new URL(location, settings.baseUrl) : null;
      // Keep pending setup until success, expiry or explicit sign-out. An
      // ordinary sign-in must not silently discard the Company journey.
      if (choice && authorization?.origin === new URL(settings.issuer).origin && authorization.searchParams.get("state")) {
        response.headers.append("Set-Cookie", onboardingCookie(flowCookieName, sealOnboarding(newFlow(choice, authorization.searchParams.get("state")!), settings.secret)));
      } else response.headers.append("Set-Cookie", onboardingCookie(flowCookieName, "", 0));
    }
    if (action === "callback/keycloak") {
      response.headers.append("Set-Cookie", onboardingCookie(flowCookieName, "", 0));
      const location = response.headers.get("location");
      if (login.accountId && login.identityId && location && !new URL(location, settings.baseUrl).searchParams.has("error")) {
        const pending = readOnboarding(requestCookie(request, setupCookieName), settings.secret, "company");
        const resume = companySetupMatches(pending, { accountId: login.accountId, identityId: login.identityId });
        let destination = "/person";
        if (resume || !verifiedFlow || verifiedFlow.choice === "COMPANY") {
          const membership = await db.companyMember.findFirst({ where: { accountId: login.accountId, status: "ACTIVE", company: { status: "ACTIVE" } } });
          destination = membership ? "/company" : resume || verifiedFlow ? "/onboarding/company" : "/person";
          if (!membership && !resume && verifiedFlow) response.headers.append("Set-Cookie", onboardingCookie(setupCookieName, sealOnboarding(newCompanySetup(login.accountId, login.identityId, verifiedFlow.nonce), settings.secret)));
          else if (membership || !resume) response.headers.append("Set-Cookie", onboardingCookie(setupCookieName, "", 0));
        } else if (!resume) {
          response.headers.append("Set-Cookie", onboardingCookie(setupCookieName, "", 0));
        }
        response.headers.set("Location", new URL(destination, settings.baseUrl).href);
      }
    }
    if (action === "callback/keycloak" && response.headers.get("location")?.includes("error=")) {
      if (failure) response.headers.set("Location", new URL(`/sign-in?error=${failure}`, settings.baseUrl).href);
      await db.activityEvent.create({ data: { type: "AUTH_LOGIN_DENIED", summary: "OIDC login denied" } });
    }
    if (action === "signout" && request.method === "POST" && response.headers.getSetCookie().some(cookie => cookie.startsWith(sessionCookieName + "=") && cookie.includes("Max-Age=0"))) {
      response.headers.append("Set-Cookie", onboardingCookie(setupCookieName, "", 0));
      response.headers.append("Set-Cookie", onboardingCookie(flowCookieName, "", 0));
    }
    return response;
  } catch (error) { console.error("Authentication boundary failed", error instanceof Error ? error.name : "unknown"); return new Response("Authentication unavailable. Please try again later.", { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
