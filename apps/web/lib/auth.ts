import "server-only";
import { Auth } from "@auth/core";
import Keycloak from "@auth/core/providers/keycloak";
import { safeAuthenticationRedirect, verifiedOidcClaims } from "@samma/identity";
import { db } from "./database";
import { sammaAdapter, type LoginContext } from "./auth-adapter";

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
    if (action.startsWith("signin")) {
      canonical.search = ""; // Never forward arbitrary OAuth parameter overrides.
      if (request.method === "POST") {
        const form = await request.clone().formData();
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
        checks: ["pkce", "state", "nonce"], authorization: { params: { scope: "openid email profile", ...(loginHint ? { login_hint: loginHint } : {}) } },
      })],
      adapter: sammaAdapter(db, settings.issuer, login),
      session: { strategy: "database", maxAge: 3600, updateAge: 3600 },
      cookies: { sessionToken: { name: sessionCookieName, options: { httpOnly: true, secure: true, sameSite: "lax", path: "/" } } },
      pages: { signIn: "/sign-in", error: "/sign-in" },
      callbacks: {
        async signIn({ account, profile }) {
          try {
            if (account?.provider !== "keycloak" || !profile) return false;
            const claims = verifiedOidcClaims(profile);
            if (claims.subject !== account.providerAccountId) return false;
            const link = await db.accountIdentity.findUnique({ where: { provider_providerSubject: { provider: settings.issuer, providerSubject: claims.subject } }, include: { account: true } });
            if (!link || link.account.status !== "ACTIVE" || !link.account.emailVerified) return false;
            login.accountId = link.accountId; login.identityId = link.id; login.mfaSatisfied = claims.mfaSatisfied;
            return true;
          } catch { return false; }
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
    if (action === "callback/keycloak" && response.headers.get("location")?.includes("error=")) {
      await db.activityEvent.create({ data: { type: "AUTH_LOGIN_DENIED", summary: "OIDC login denied" } });
    }
    return response;
  } catch (error) { console.error("Authentication boundary failed", error instanceof Error ? error.name : "unknown"); return new Response("Authentication unavailable. Please try again later.", { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
