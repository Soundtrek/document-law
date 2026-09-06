// Real Auth.js boundary + disposable PostgreSQL; only OIDC network responses are simulated.
// Run with node --conditions=react-server --import tsx; never use the normal DEV database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { registerHooks, createRequire } from "node:module";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { createPrismaClient } from "@samma/database";
import { flowCookieName, setupCookieName, newFlow, sealOnboarding, readOnboarding } from "../../apps/web/lib/onboarding-state";

assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_company_completion_test");
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
const profile = { sub: tag, email: tag + "@example.test" };
try {
  await db.functionalRoleDefinition.upsert({ where: { code: "OWNER" }, create: { code: "OWNER", label: "Owner", capabilities: ["company.members.manage", "company.settings.manage"] }, update: {} });
  const person = new Browser();
  let url = await person.begin("PERSON");
  let response = await person.finish(url, profile);
  assert.equal(response.headers.get("location"), base + "/person");
  assert.ok(!person.cookies.has(setupCookieName));
  const account = await db.account.findUniqueOrThrow({ where: { primaryEmail: profile.email }, include: { person: true } });
  assert.ok(account.person);
  assert.equal(await db.companyMember.count({ where: { accountId: account.id } }), 0);
  url = await person.begin("COMPANY");
  const flow = readOnboarding(person.cookies.get(flowCookieName), process.env.AUTH_SECRET!, "authentication")!;
  flow.expires = Date.now() + 30000; // Registration consumed most of its allowed window.
  person.cookies.set(flowCookieName, sealOnboarding(flow, process.env.AUTH_SECRET!));
  response = await person.finish(url, profile);
  assert.equal(response.headers.get("location"), base + "/onboarding/company");
  const pending = person.cookies.get(setupCookieName)!;
  const setup = readOnboarding(pending, process.env.AUTH_SECRET!, "company")!;
  assert.ok(setup.expires > flow.expires + 10 * 60000);
  url = await person.begin();
  assert.equal(person.cookies.get(setupCookieName), pending);
  response = await person.finish(url, profile);
  assert.equal(response.headers.get("location"), base + "/onboarding/company");
  assert.equal(person.cookies.get(setupCookieName), pending, "resume does not extend setup indefinitely");
  url = await person.begin("PERSON");
  response = await person.finish(url, profile);
  assert.equal(response.headers.get("location"), base + "/onboarding/company", "Person selection does not abandon pending Company setup");
  assert.equal(await db.company.count(), 0, "login never creates a company");
  const { POST } = await import("../../apps/web/app/api/onboarding/company/route");
  const submit = (includeState = true, name = "Soundtrek") => {
    const form = new FormData(); form.set("name", name);
    return POST(new Request(base + "/api/onboarding/company", { method: "POST", headers: { origin: base, cookie: `${sessionCookieName}=${person.cookies.get(sessionCookieName)}${includeState ? `; ${setupCookieName}=${pending}` : ""}` }, body: form }));
  };
  let result = await submit(false);
  assert.equal(result.status, 409); assert.equal((await result.json()).code, "setup_expired");
  result = await submit(true, " ");
  assert.equal(result.status, 422); assert.equal((await result.json()).code, "invalid_name");
  await db.functionalRoleDefinition.update({ where: { code: "OWNER" }, data: { active: false } });
  result = await submit(); assert.equal(result.status, 503); assert.equal((await result.json()).code, "owner_unavailable");
  assert.equal(await db.company.count(), 0); assert.equal(await db.companyMember.count(), 0); assert.equal(await db.companyRoleGrant.count(), 0);
  await db.functionalRoleDefinition.update({ where: { code: "OWNER" }, data: { active: true } });
  const results = await Promise.all([submit(), submit(), submit()]);
  assert.ok(results.every(r => r.status === 200));
  assert.ok(results[0]!.headers.getSetCookie().some(c => c.startsWith(setupCookieName + "=") && c.includes("Max-Age=0")));
  result = await submit(false); assert.equal(result.status, 200); assert.equal((await result.json()).destination, "/company");
  assert.equal(await db.company.count(), 1); assert.equal(await db.companyMember.count(), 1); assert.equal(await db.companyRoleGrant.count(), 1);
  assert.equal(await db.governanceCapabilityGrant.count(), 0);
  const csrf = await (await person.request("/api/auth/csrf")).json();
  response = await person.request("/api/auth/signout", new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: "/auth/logout" }));
  assert.equal(response.headers.get("location"), base + "/auth/logout");
  assert.ok(!person.cookies.has(sessionCookieName));
  assert.ok(!person.cookies.has(setupCookieName));
  assert.deepEqual(await db.person.findUnique({ where: { id: account.person.id } }), account.person);
  console.log("PASS real Auth.js Person destination, independent Company deadline, same-identity intent across ordinary/Person re-login, no automatic company, API error categories/completed retries, explicit logout clears pending setup");
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
