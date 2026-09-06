// Real Auth.js boundary + disposable PostgreSQL; only OIDC network responses are simulated.
// Run with node --conditions=react-server --import tsx; never use the normal DEV database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { registerHooks, createRequire } from "node:module";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { createPrismaClient } from "@samma/database";
import { flowCookieName, setupCookieName, newFlow, sealOnboarding, readOnboarding } from "../../apps/web/lib/onboarding-state";

assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_company_resume_test");
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
  async begin(choice?: "PERSON" | "COMPANY", query = "", resume = false) {
    const csrf = await (await this.request("/api/auth/csrf")).json();
    const form = new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: "/person" });
    if (choice) form.set("onboardingChoice", choice);
    if (resume) form.set("onboardingAction", "resume-company");
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
const companyProfile = { sub: tag + "-company", email: tag + "-company@example.test", realm_access: { roles: ["HR", "PAYROLL", "LEGAL", "governance"] } };
try {
  await db.functionalRoleDefinition.create({ data: { code: "OWNER", label: "Owner", capabilities: ["company.members.manage", "company.settings.manage"] } });
  const company = new Browser();
  let url = await company.begin();
  let response = await company.finish(url, companyProfile);
  assert.equal(response.headers.get("location"), base + "/sign-in?error=OnboardingRequired");
  assert.equal(await db.accountIdentity.count(), 0);
  const first = await company.begin("COMPANY", "", true);
  const firstFlow = readOnboarding(company.cookies.get(flowCookieName), process.env.AUTH_SECRET!, "authentication")!;
  url = await company.begin("COMPANY", "?prompt=create&onboardingChoice=PERSON", true);
  assert.equal(url.searchParams.get("prompt"), null);
  const flow = readOnboarding(company.cookies.get(flowCookieName), process.env.AUTH_SECRET!, "authentication")!;
  assert.equal(flow.choice, "COMPANY");
  assert.equal(flow.oauthState, url.searchParams.get("state"));
  assert.notEqual(flow.oauthState, firstFlow.oauthState);
  assert.notEqual(flow.nonce, firstFlow.nonce);
  assert.notEqual(url.searchParams.get("nonce"), first.searchParams.get("nonce"));
  assert.ok(flow.expires > Date.now() && flow.expires <= Date.now() + 900000);
  response = await company.finish(url, companyProfile);
  assert.equal(response.headers.get("location"), base + "/onboarding/company");
  const identity = await db.accountIdentity.findUniqueOrThrow({ where: { provider_providerSubject: { provider: issuer, providerSubject: companyProfile.sub } }, include: { account: { include: { person: true } } } });
  assert.ok(identity.account.emailVerified && identity.account.person);
  assert.ok(company.cookies.has(sessionCookieName));
  assert.ok(!company.cookies.has(flowCookieName));
  const setup = readOnboarding(company.cookies.get(setupCookieName), process.env.AUTH_SECRET!, "company")!;
  assert.equal(setup.accountId, identity.accountId); assert.equal(setup.identityId, identity.id);
  assert.equal(await db.company.count(), 0);
  const { completeCompanyOnboarding } = await import("../../apps/web/lib/onboarding-service");
  const companyId = await completeCompanyOnboarding(db, company.cookies.get(sessionCookieName)!, issuer, setup, "Synthetic Resume Company");
  const member = await db.companyMember.findFirstOrThrow({ where: { companyId }, include: { roleGrants: { include: { functionalRole: true } } } });
  assert.equal(member.status, "ACTIVE"); assert.deepEqual(member.roleGrants.map(g => g.functionalRole.code), ["OWNER"]);
  url = await company.begin(); response = await company.finish(url, companyProfile);
  assert.equal(response.headers.get("location"), base + "/company");
  assert.equal(await db.accountIdentity.count({ where: { providerSubject: companyProfile.sub } }), 1);
  assert.equal(await db.company.count(), 1);
  const fresh = new Browser(); url = await fresh.begin("COMPANY");
  assert.equal(url.searchParams.get("prompt"), "create");
  response = await fresh.finish(url, { sub: tag + "-fresh", email: tag + "-fresh@example.test" });
  assert.equal(response.headers.get("location"), base + "/onboarding/company");
  assert.equal(await db.company.count(), 1);
  // One focused Person regression; its unchanged normal registration route.
  const person = new Browser(); url = await person.begin("PERSON");
  assert.equal(url.searchParams.get("prompt"), "create");
  response = await person.finish(url, { sub: tag + "-person", email: tag + "-person@example.test" });
  assert.equal(response.headers.get("location"), base + "/person");
  assert.ok(!person.cookies.has(setupCookieName));
  assert.equal(await db.person.count(), 3);
  for (const [profile, expected] of [
    [{ sub: tag + "-collision", email: companyProfile.email.toUpperCase() }, "EmailCollision"],
    [{ sub: tag + "-unverified", email: tag + "-unverified@example.test", email_verified: false }, "EmailUnverified"],
  ] as const) {
    const browser = new Browser(); const start = await browser.begin("COMPANY", "", true);
    const result = await browser.finish(start, profile);
    assert.equal(result.headers.get("location"), base + "/sign-in?error=" + expected);
    assert.ok(!browser.cookies.has(sessionCookieName));
    assert.equal(await db.accountIdentity.count({ where: { providerSubject: profile.sub } }), 0);
  }
  for (const kind of ["missing", "tampered", "expired", "wrong-state"]) {
    const browser = new Browser(); const start = await browser.begin("COMPANY", "", true);
    const state = newFlow("COMPANY", start.searchParams.get("state")!);
    if (kind === "expired") state.expires = Date.now() - 1;
    if (kind === "wrong-state") state.oauthState = "other-state";
    browser.cookies.set(flowCookieName, kind === "tampered" ? "tampered" : sealOnboarding(state, process.env.AUTH_SECRET!));
    if (kind === "missing") browser.cookies.delete(flowCookieName);
    const profile = { sub: tag + "-" + kind, email: tag + "-" + kind + "@example.test" };
    const result = await browser.finish(start, profile);
    assert.equal(result.headers.get("location"), base + "/sign-in?error=" + (kind === "missing" ? "OnboardingRequired" : "OnboardingExpired"));
    assert.equal(await db.accountIdentity.count({ where: { providerSubject: profile.sub } }), 0);
  }
  const raw = new Browser(); url = await raw.begin(undefined, "?onboardingChoice=COMPANY&onboardingAction=resume-company");
  assert.ok(!raw.cookies.has(flowCookieName)); assert.equal(url.searchParams.get("prompt"), null);
  for (const form of [
    new URLSearchParams({ onboardingAction: "resume-company" }),
    new URLSearchParams({ onboardingAction: "resume-company", onboardingChoice: "PERSON" }),
    new URLSearchParams([["onboardingAction", "resume-company"], ["onboardingAction", "resume-company"], ["onboardingChoice", "COMPANY"]]),
  ]) assert.equal((await new Browser().request("/api/auth/signin/keycloak", form)).status, 400);
  const csrfBrowser = new Browser();
  const denied = await csrfBrowser.request("/api/auth/signin/keycloak", new URLSearchParams({ onboardingChoice: "COMPANY", onboardingAction: "resume-company" }));
  assert.ok(!denied.headers.get("location")?.startsWith(issuer)); assert.ok(!csrfBrowser.cookies.has(flowCookieName));
  const cross = await handleAuthentication(new Request(base + "/api/auth/signin/keycloak", { method: "POST", headers: { origin: "https://evil.test" }, body: "onboardingChoice=COMPANY&onboardingAction=resume-company" }));
  assert.equal(cross.status, 403);
  assert.equal(await db.governanceCapabilityGrant.count(), 0);
  console.log("PASS Company resume: fresh state/nonce, login not registration, issuer+subject creation, deferred company, ACTIVE OWNER only, ordinary login, fresh Company, one Person regression, collision/unverified/state/CSRF/origin/query negatives.");
} finally {
  globalThis.fetch = originalFetch;
  await authDb.$disconnect(); await db.$disconnect();
}
