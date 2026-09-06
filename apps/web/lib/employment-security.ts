import { createHmac, timingSafeEqual } from "node:crypto";

// Separate, session-bound CSRF purpose; no changes to the authentication flow/cookies.
export function employmentCsrf(secret: string, sessionToken: string) {
  return createHmac("sha256", secret).update("samma-employment-invitation-v1\0").update(sessionToken).digest("hex");
}
export function validEmploymentCsrf(secret: string, sessionToken: string, supplied: unknown): boolean {
  if (typeof supplied !== "string" || !/^[a-f0-9]{64}$/.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(employmentCsrf(secret, sessionToken), "hex"), Buffer.from(supplied, "hex"));
}
