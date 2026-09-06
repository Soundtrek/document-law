import assert from "node:assert/strict";
import { test } from "node:test";
import { authErrorMessage } from "./auth-errors";

test("auth errors expose only fixed application messages", () => {
  assert.equal(authErrorMessage("EmailCollision"), "An account already exists for this email. Sign in using the linked login method or contact support.");
  for (const code of ["__proto__", "constructor", "provider error: secret-token", undefined, ["EmailCollision"], {}]) {
    assert.equal(authErrorMessage(code), authErrorMessage("unknown"));
  }
  for (const code of ["OnboardingRequired", "OnboardingExpired", "EmailUnverified", "AccountUnavailable"]) {
    assert.notEqual(authErrorMessage(code), authErrorMessage("unknown"));
  }
});
