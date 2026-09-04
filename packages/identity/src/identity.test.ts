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
