// Focused logout/session checks: real Auth.js and disposable PostgreSQL; simulated OIDC only.
// Run with node --conditions=react-server --import tsx; never use the normal DEV database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { registerHooks, createRequire } from "node:module";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { createPrismaClient } from "@samma/database";
import { flowCookieName, setupCookieName, newFlow, sealOnboarding, readOnboarding } from "../../apps/web/lib/onboarding-state";

assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_logout_experiment");
// Next aliases this marker to its empty server module in production. Reproduce only that alias for Node tests.
const require = createRequire(import.meta.url);
const serverMarker = require.resolve("next/dist/compiled/server-only/empty.js");
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === "server-only" ? serverMarker : specifier, context);
} });
const db = createPrismaClient();
const { handleAuthentication, sessionCookieName } = await import("../../apps/web/lib/auth");
const { db: authDb } = await import("../../apps/web/lib/database");
const base = process.env.SAMMA_BASE_URL!, issuer = process.env.SAMMA_OIDC_ISSUER!;
assert.equal(base, "https://dev.samma.test"); assert.equal(issuer, "https://identity.samma.test/realms/synthetic");
const originalFetch = globalThis.fetch;
const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwk = { ...await exportJWK(publicKey), kid: "synthetic-key", alg: "RS256", use: "sig" };
const codes = new Map<string, { nonce: string; profile: Record<string, unknown> }>();
const tag = randomUUID();
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
globalThis.fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url === issuer + "/.well-known/openid-configuration") return json({
    issuer, authorization_endpoint: issuer + "/auth", token_endpoint: issuer + "/token", jwks_uri: issuer + "/jwks", userinfo_endpoint: issuer + "/userinfo",
    response_types_supported: ["code"], subject_types_supported: ["public"], id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: ["client_secret_basic"], code_challenge_methods_supported: ["S256"],
  });
  if (url === issuer + "/jwks") return json({ keys: [jwk] });
  if (url === issuer + "/token") {
    const form = new URLSearchParams(String(init?.body));
    const entry = codes.get(form.get("code") ?? "");
    assert.ok(entry); codes.delete(form.get("code")!);
    assert.ok(form.get("code_verifier"));
    const idToken = await new SignJWT({ email_verified: true, nonce: entry.nonce, ...entry.profile })
      .setProtectedHeader({ alg: "RS256", kid: jwk.kid }).setIssuer(issuer)
      .setAudience(process.env.SAMMA_OIDC_CLIENT_ID!).setIssuedAt().setExpirationTime("5m").sign(privateKey);
    return json({ access_token: "synthetic-only", token_type: "Bearer", expires_in: 300, id_token: idToken });
  }
  throw new Error("Unexpected OIDC request in isolated test");
};
class Browser {
  cookies = new Map<string, string>();
  async request(path: string, form?: URLSearchParams, extraHeaders?: Record<string, string>) {
    const headers = new Headers({ cookie: [...this.cookies].map(([k, v]) => k + "=" + v).join("; "), ...extraHeaders });
    if (form) { headers.set("origin", base); headers.set("content-type", "application/x-www-form-urlencoded"); }
    const response = await handleAuthentication(new Request(base + path, { method: form ? "POST" : "GET", headers, ...(form ? { body: form } : {}) }));
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";"); const i = pair!.indexOf("=");
      assert.ok(!/;\s*domain=/i.test(cookie));
      if (cookie.includes("Max-Age=0")) this.cookies.delete(pair!.slice(0, i));
      else this.cookies.set(pair!.slice(0, i), pair!.slice(i + 1));
    }
    return response;
  }
  async begin(choice?: "PERSON" | "COMPANY", query = "") {
    const csrf = await (await this.request("/api/auth/csrf")).json();
    const form = new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: "/person" });
    if (choice) form.set("onboardingChoice", choice);
    const response = await this.request("/api/auth/signin/keycloak" + query, form);
    assert.equal(response.status, 302);
    const url = new URL(response.headers.get("location")!);
    assert.equal(url.origin, new URL(issuer).origin);
    assert.equal(url.searchParams.get("redirect_uri"), base + "/api/auth/callback/keycloak");
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.ok(url.searchParams.get("state") && url.searchParams.get("nonce"));
    return url;
  }
  async finish(url: URL, profile: Record<string, unknown>) {
    const code = randomUUID();
    codes.set(code, { nonce: url.searchParams.get("nonce")!, profile });
    return this.request("/api/auth/callback/keycloak?" + new URLSearchParams({ code, state: url.searchParams.get("state")! }));
  }
}
const profiles = ["a", "b"].map(label => ({ sub: tag + label, email: tag + label + "@example.test" }));
const accountIds: string[] = [];
try {
  for (const profile of profiles) {
    const account = await db.account.create({ data: { primaryEmail: profile.email, emailVerified: true,
      identities: { create: { provider: issuer, providerSubject: profile.sub } },
      person: { create: { displayName: "Synthetic logout validation" } },
    } });
    accountIds.push(account.id);
  }
  const browser = new Browser();
  for (const index of [0, 1, 0]) {
    const authorization = await browser.begin();
    assert.equal(authorization.searchParams.get("prompt"), null, "ordinary SSO is preserved");
    await browser.finish(authorization, profiles[index]!);
    const token = browser.cookies.get(sessionCookieName)!;
    assert.ok(token);
    const session = await db.authSession.findUniqueOrThrow({ where: { sessionToken: token } });
    assert.equal(session.accountId, accountIds[index]);
    assert.ok(session.idToken);
    const publicSession = await (await browser.request("/api/auth/session")).json();
    assert.equal(publicSession.user.id, accountIds[index]);
    assert.ok(!JSON.stringify(publicSession).includes(session.idToken!), "ID token never reaches session API");
    const missingCsrf = await browser.request("/api/auth/signout", new URLSearchParams({ callbackUrl: "/auth/logout" }));
    assert.ok(!missingCsrf.headers.get("location")?.startsWith(issuer));
    const badCsrf = await browser.request("/api/auth/signout", new URLSearchParams({ csrfToken: "forged" }));
    assert.ok(!badCsrf.headers.get("location")?.startsWith(issuer));
    const get = await browser.request("/api/auth/signout");
    assert.ok(!get.headers.get("location")?.startsWith(issuer));
    const crossOrigin = await handleAuthentication(new Request(base + "/api/auth/signout", { method: "POST",
      headers: { origin: "https://samma.test", cookie: sessionCookieName + "=" + token }, body: "csrfToken=forged" }));
    assert.equal(crossOrigin.status, 403);
    assert.ok(await db.authSession.findUnique({ where: { sessionToken: token } }));
    const csrf = await (await browser.request("/api/auth/csrf")).json();
    // Auth.js catches deletion errors internally: wrapper must preserve cookie and report failure.
    const transaction = authDb.$transaction;
    authDb.$transaction = (() => Promise.reject(new Error("Synthetic database failure"))) as typeof transaction;
    try {
      const failed = await browser.request("/api/auth/signout", new URLSearchParams({ csrfToken: csrf.csrfToken }));
      assert.equal(failed.status, 503);
      assert.equal(browser.cookies.get(sessionCookieName), token);
      assert.equal(failed.headers.get("location"), null);
    } finally { authDb.$transaction = transaction; }
    const response = await browser.request("/api/auth/signout?id_token_hint=forged&post_logout_redirect_uri=https://evil.test", new URLSearchParams({
      csrfToken: csrf.csrfToken, callbackUrl: "https://evil.test", id_token_hint: "forged",
    }), { "x-auth-return-redirect": "1" });
    const target = new URL(response.headers.get("location")!);
    assert.equal(target.origin + target.pathname, issuer + "/protocol/openid-connect/logout");
    assert.equal(target.searchParams.get("id_token_hint"), session.idToken);
    assert.equal(target.searchParams.get("client_id"), process.env.SAMMA_OIDC_CLIENT_ID);
    assert.equal(target.searchParams.get("post_logout_redirect_uri"), base + "/");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.ok(!browser.cookies.has(sessionCookieName));
    assert.ok(!browser.cookies.has(setupCookieName) && !browser.cookies.has(flowCookieName));
    assert.equal(await db.authSession.findUnique({ where: { sessionToken: token } }), null);
    assert.equal(await (await browser.request("/api/auth/session")).json(), null);
    const replay = new Browser(); replay.cookies.set(sessionCookieName, token);
    assert.equal(await (await replay.request("/api/auth/session")).json(), null);
    assert.equal(await db.activityEvent.count({ where: { actorAccountId: accountIds[index], type: "AUTH_LOGOUT" } }), await db.activityEvent.count({ where: { actorAccountId: accountIds[index], type: "AUTH_LOGIN" } }));
  }
  // Pre-deployment sessions have no hint: revoke locally, keep provider confirmation.
  await browser.finish(await browser.begin(), profiles[0]!);
  const oldToken = browser.cookies.get(sessionCookieName)!;
  await db.authSession.update({ where: { sessionToken: oldToken }, data: { idToken: null } });
  const csrf = await (await browser.request("/api/auth/csrf")).json();
  const legacy = await browser.request("/api/auth/signout", new URLSearchParams({ csrfToken: csrf.csrfToken }));
  assert.equal(new URL(legacy.headers.get("location")!).searchParams.get("id_token_hint"), null);
  assert.equal(await db.authSession.findUnique({ where: { sessionToken: oldToken } }), null);
  const { providerLogoutUrl } = await import("../../apps/web/lib/auth-logout");
  for (const host of ["https://dev.samma.co.za", "https://samma.co.za"]) {
    assert.equal(new URL(providerLogoutUrl({ baseUrl: host, issuer, clientId: "synthetic" })).searchParams.get("post_logout_redirect_uri"), host + "/");
  }
  const { GET } = await import("../../apps/web/app/auth/logout/route");
  assert.equal((await GET()).headers.get("location"), base + "/", "GET cannot initiate provider logout");
  console.log("PASS: A/B/A sessions, session-bound ID hints, local revocation/replay denial, missing/forged/cross-origin CSRF denial, GET safety, deletion failure, private session API, host-only cookies, fixed DEV/RC redirects and legacy confirmation fallback.");
} finally {
  globalThis.fetch = originalFetch;
  await db.activityEvent.deleteMany({ where: { actorAccountId: { in: accountIds } } });
  await db.person.deleteMany({ where: { accountId: { in: accountIds } } });
  await db.account.deleteMany({ where: { id: { in: accountIds } } });
  await db.$disconnect(); await authDb.$disconnect();
}
