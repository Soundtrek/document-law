import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryIdentityLinkRegistry, requireMfa, requireVerifiedPrincipal } from "./index.js";

test("one stable account can link multiple providers", () => {
  const registry = new InMemoryIdentityLinkRegistry();
  registry.link("acct-1", { provider: "email", providerSubject: "email-subject", emailAtProvider: "person@example.test" }, "2026-09-05T00:00:00.000Z");
  registry.link("acct-1", { provider: "google", providerSubject: "google-subject", emailAtProvider: "person@example.test" }, "2026-09-05T00:01:00.000Z");
  assert.equal(registry.resolve({ provider: "google", providerSubject: "google-subject" })?.accountId, "acct-1");
});

test("matching email is never an automatic account merge mechanism", () => {
  const registry = new InMemoryIdentityLinkRegistry();
  registry.link("acct-1", { provider: "google", providerSubject: "subject-a", emailAtProvider: "same@example.test" }, "2026-09-05T00:00:00.000Z");
  assert.throws(() => registry.findByProviderEmail("microsoft", "same@example.test"));
  assert.equal(registry.resolve({ provider: "microsoft", providerSubject: "subject-b", emailAtProvider: "same@example.test" }), null);
});

test("sensitive access helpers require verified email and MFA", () => {
  const principal = requireVerifiedPrincipal({
    accountId: "acct-1",
    primaryEmail: "person@example.test",
    emailVerified: true,
    provider: "email",
    providerSubject: "subject",
    mfaSatisfied: false,
  });
  assert.throws(() => requireMfa(principal));
});

test("OIDC verification requires strict claims and retains MFA support", async () => {
  const { verifiedOidcClaims } = await import("./index.js");
  for (const profile of [{}, { sub: "s", email: "p@example.test", email_verified: false }, { sub: "s", email: "p@example.test", email_verified: "true" }, { sub: "", email: "p@example.test", email_verified: true }]) assert.throws(() => verifiedOidcClaims(profile));
  assert.equal(verifiedOidcClaims({ sub: "s", email: "p@example.test", email_verified: true }).mfaSatisfied, false);
  assert.equal(verifiedOidcClaims({ sub: "s", email: "p@example.test", email_verified: true, acr: "2" }).mfaSatisfied, true);
});

test("authentication redirects reject foreign origins and encoded bypasses", async () => {
  const { safeAuthenticationRedirect } = await import("./index.js");
  for (const path of ["https://evil.example", "//evil.example", "/%2f%2fevil.example", "https://samma.co.za.evil.example", "javascript:alert(1)", "/admin", "/person?next=https://evil.example"]) {
    assert.equal(safeAuthenticationRedirect(path, "https://samma.co.za"), "https://samma.co.za/person");
  }
  assert.equal(safeAuthenticationRedirect("/auth/logout", "https://samma.co.za"), "https://samma.co.za/auth/logout");
});
