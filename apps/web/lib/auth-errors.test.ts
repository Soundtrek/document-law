import assert from "node:assert/strict";
import { test } from "node:test";
import { authErrorMessage, authenticationFailureUrl } from "./auth-errors";

test("auth errors expose only fixed application messages", () => {
  assert.equal(authErrorMessage("EmailCollision"), "An account already exists for this email. Sign in using the linked login method or contact support.");
  for (const code of ["__proto__", "constructor", "provider error: secret-token", undefined, ["EmailCollision"], {}]) {
    assert.equal(authErrorMessage(code), authErrorMessage("unknown"));
  }
  for (const code of ["OnboardingRequired", "OnboardingExpired", "EmailUnverified", "AccountUnavailable"]) {
    assert.notEqual(authErrorMessage(code), authErrorMessage("unknown"));
  }
});
test("authentication failure redirect preserves only the email login hint", () => {
  assert.equal(authenticationFailureUrl("https://samma.test", "EmailUnverified", "person@example.test"), "https://samma.test/sign-in?error=EmailUnverified&login_hint=person%40example.test");
  assert.equal(authenticationFailureUrl("https://samma.test", "EmailUnverified", "password=secret"), "https://samma.test/sign-in?error=EmailUnverified");
});
