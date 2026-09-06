import assert from "node:assert/strict";
import { test } from "node:test";
import { companyName } from "./onboarding-service";
import { newFlow, onboardingChoice, onboardingCookie, readOnboarding, sealOnboarding } from "./onboarding-state";

test("only Person or Company is a valid onboarding choice", () => {
  for (const value of [undefined, null, "", "person", "OWNER", "GOVERNANCE", ["COMPANY"], { choice: "COMPANY" }]) assert.throws(() => onboardingChoice(value));
  assert.equal(onboardingChoice("PERSON"), "PERSON");
  assert.equal(onboardingChoice("COMPANY"), "COMPANY");
});
test("flow is encrypted, authenticated, purpose-bound and expires", () => {
  const flow = newFlow("COMPANY", "provider-state"), secret = "unit-test-secret";
  const cookie = sealOnboarding(flow, secret);
  assert.ok(!cookie.includes("COMPANY") && !cookie.includes("provider-state"));
  assert.deepEqual(readOnboarding(cookie, secret, "authentication"), flow);
  assert.equal(readOnboarding(cookie, "other-secret", "authentication"), null);
  assert.equal(readOnboarding(cookie, secret, "company"), null);
  assert.equal(readOnboarding(cookie, secret, "authentication", flow.expires), null);
  assert.equal(readOnboarding(cookie, secret, "authentication", flow.expires - 16 * 60000), null);
  const bytes = Buffer.from(cookie, "base64url"); bytes[30] = bytes[30]! ^ 1;
  assert.equal(readOnboarding(bytes.toString("base64url"), secret, "authentication"), null);
  for (const invalid of [undefined, "bad", "x".repeat(3000)]) assert.equal(readOnboarding(invalid, secret, "authentication"), null);
  const serialized = onboardingCookie("__Host-test", cookie);
  for (const attribute of ["Path=/", "Secure", "HttpOnly", "SameSite=Lax", "Max-Age=900"]) assert.ok(serialized.includes(attribute));
  assert.ok(onboardingCookie("__Host-test", "", 0).includes("Max-Age=0"));
});
test("company name is the only required business input", () => {
  assert.equal(companyName("  Synthetic Company  "), "Synthetic Company");
  for (const value of [null, "", "   ", "x".repeat(161), "Test\nCompany"]) assert.throws(() => companyName(value));
});
