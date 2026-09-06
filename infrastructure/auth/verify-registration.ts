// Real Auth.js boundary + disposable PostgreSQL; only OIDC network responses are simulated.
// Run with node --conditions=react-server --import tsx; never use the normal DEV database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { registerHooks, createRequire } from "node:module";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { createPrismaClient } from "@samma/database";
import { flowCookieName, setupCookieName, newFlow, sealOnboarding, readOnboarding } from "../../apps/web/lib/onboarding-state";

assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_auth_registration_experiment");
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
const personProfile = { sub: tag + "-person", email: tag + "-person@example.test", realm_access: { roles: ["OWNER", "governance"] } };
const companyProfile = { sub: tag + "-company", email: tag + "-company@example.test" };
try {
  const csrfDenied = await new Browser().request("/api/auth/signin/keycloak", new URLSearchParams({ onboardingChoice: "COMPANY" }));
  assert.ok(!csrfDenied.headers.get("location")?.startsWith(issuer));
  const crossOrigin = await handleAuthentication(new Request(base + "/api/auth/signin/keycloak", { method: "POST", headers: { origin: "https://samma.test" }, body: "" }));
  assert.equal(crossOrigin.status, 403);
  const invalid = await new Browser().request("/api/auth/signin/keycloak", new URLSearchParams([['onboardingChoice','PERSON'],['onboardingChoice','COMPANY']]));
  assert.equal(invalid.status, 400);
  const person = new Browser();
  let url = await person.begin("PERSON", "?prompt=none&redirect_uri=https://evil.test&scope=admin");
  assert.equal(url.searchParams.get("prompt"), "create");
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  const sealed = person.cookies.get(flowCookieName)!;
  assert.equal(readOnboarding(sealed, process.env.AUTH_SECRET!, "authentication")?.choice, "PERSON");
  let response = await person.finish(url, personProfile);
  assert.equal(response.headers.get("location"), base + "/person");
  assert.ok(person.cookies.has(sessionCookieName)); assert.ok(!person.cookies.has(flowCookieName));
  assert.ok(!person.cookies.has(setupCookieName));
  const account = await db.account.findUniqueOrThrow({ where: { primaryEmail: personProfile.email }, include: { person: true } });
  assert.ok(account.person);
  assert.equal(await db.companyMember.count({ where: { accountId: account.id } }), 0);
  assert.equal(await db.personCompanyRelationship.count({ where: { personId: account.person.id } }), 0);
  // Existing person explicitly chooses Company; registration must be bypassed using the live session.
  url = await person.begin("COMPANY"); assert.equal(url.searchParams.get("prompt"), null);
  response = await person.finish(url, personProfile);
  assert.equal(response.headers.get("location"), base + "/onboarding/company");
  const setup = readOnboarding(person.cookies.get(setupCookieName), process.env.AUTH_SECRET!, "company");
  assert.equal(setup?.accountId, account.id);
  assert.equal(await db.companyMember.count({ where: { accountId: account.id } }), 0, "abandoned setup creates no company");
  url = await person.begin(); assert.equal(url.searchParams.get("prompt"), null);
  assert.ok(!person.cookies.has(setupCookieName));
  response = await person.finish(url, personProfile);
  assert.equal(response.headers.get("location"), base + "/person");
  assert.equal((await db.accountIdentity.findUniqueOrThrow({ where: { provider_providerSubject: { provider: issuer, providerSubject: personProfile.sub } } })).accountId, account.id);

  const company = new Browser(); url = await company.begin("COMPANY");
  response = await company.finish(url, companyProfile);
  assert.equal(response.headers.get("location"), base + "/onboarding/company");
  const companyState = readOnboarding(company.cookies.get(setupCookieName), process.env.AUTH_SECRET!, "company"); assert.ok(companyState);
  const { completeCompanyOnboarding } = await import("../../apps/web/lib/onboarding-service");
  const companyId = await completeCompanyOnboarding(db, company.cookies.get(sessionCookieName)!, issuer, companyState, "Synthetic Registration Company");
  const member = await db.companyMember.findFirstOrThrow({ where: { companyId }, include: { roleGrants: { include: { functionalRole: true } } } });
  assert.equal(member.status, "ACTIVE"); assert.deepEqual(member.roleGrants.map(g => g.functionalRole.code), ["OWNER"]);
  url = await company.begin(); response = await company.finish(url, companyProfile);
  assert.equal(response.headers.get("location"), base + "/company");

  for (const [profile, expected] of [
    [{ sub: tag + "-collision", email: personProfile.email.toUpperCase() }, "EmailCollision"],
    [{ sub: tag + "-unverified", email: tag + "-unverified@example.test", email_verified: false }, "EmailUnverified"],
  ] as const) {
    const browser = new Browser(); const start = await browser.begin("PERSON");
    const result = await browser.finish(start, profile);
    assert.equal(result.headers.get("location"), base + "/sign-in?error=" + expected);
    assert.ok(!browser.cookies.has(sessionCookieName));
    assert.equal(await db.accountIdentity.count({ where: { providerSubject: profile.sub } }), 0);
  }
  const missing = new Browser(); url = await missing.begin("COMPANY"); missing.cookies.delete(flowCookieName);
  response = await missing.finish(url, { sub: tag + "-missing", email: tag + "-missing@example.test" });
  assert.equal(response.headers.get("location"), base + "/sign-in?error=OnboardingRequired");
  for (const kind of ["tampered", "expired", "wrong-state"]) {
    const browser = new Browser(); const start = await browser.begin("COMPANY");
    const state = newFlow("COMPANY", start.searchParams.get("state")!);
    if (kind === "expired") state.expires = Date.now() - 1;
    if (kind === "wrong-state") state.oauthState = "other-state";
    browser.cookies.set(flowCookieName, kind === "tampered" ? sealed.slice(0, -8) + "tampered" : sealOnboarding(state, process.env.AUTH_SECRET!));
    const result = await browser.finish(start, personProfile);
    assert.equal(result.headers.get("location"), base + "/sign-in?error=OnboardingExpired");
    assert.ok(!browser.cookies.has(sessionCookieName));
  }
  await db.account.update({ where: { id: account.id }, data: { status: "SUSPENDED" } });
  const suspended = new Browser(); url = await suspended.begin(); response = await suspended.finish(url, personProfile);
  assert.equal(response.headers.get("location"), base + "/sign-in?error=AccountUnavailable");
  await db.account.update({ where: { id: account.id }, data: { status: "ACTIVE" } });
  const ids = (await db.account.findMany({ where: { primaryEmail: { startsWith: tag } } })).map(a => a.id);
  assert.equal(ids.length, 2);
  assert.equal(await db.governanceCapabilityGrant.count({ where: { accountId: { in: ids } } }), 0);
  const oldSession = company.cookies.get(sessionCookieName)!;
  const csrf = await (await company.request("/api/auth/csrf")).json();
  response = await company.request("/api/auth/signout", new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: "/auth/logout" }));
  assert.equal(response.headers.get("location"), base + "/auth/logout");
  assert.equal(await db.authSession.findUnique({ where: { sessionToken: oldSession } }), null);
  const key = `signin:${Math.floor(Date.now() / 60000)}`;
  await db.authRateLimit.upsert({ where: { key }, create: { key, count: 30, expires: new Date(Date.now() + 120000) }, update: { count: 30 } });
  response = await new Browser().request("/api/auth/signin/keycloak", new URLSearchParams({ onboardingChoice: "PERSON" }));
  assert.equal(response.status, 429);
  console.log("PASS: Auth.js registration/sign-in parameters, CSRF/origin, PKCE/state/nonce plumbing, callback identity, PERSON/COMPANY, OWNER-only, safe collision/unverified/suspended/state errors, normal destinations, no Governance, logout/session deletion and initiation throttle.");
} finally {
  globalThis.fetch = originalFetch;
  const ids = (await db.account.findMany({ where: { primaryEmail: { startsWith: tag } } })).map(a => a.id);
  await db.activityEvent.deleteMany({ where: { OR: [{ actorAccountId: { in: ids } }, { actorAccountId: null, type: "AUTH_LOGIN_DENIED" }] } });
  await db.company.deleteMany({ where: { members: { some: { accountId: { in: ids } } } } });
  await db.person.deleteMany({ where: { accountId: { in: ids } } });
  await db.account.deleteMany({ where: { id: { in: ids } } });
  await db.authRateLimit.deleteMany();
  await authDb.$disconnect(); await db.$disconnect();
}
