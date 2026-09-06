import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

export type OnboardingChoice = "PERSON" | "COMPANY";
export const flowCookieName = "__Host-samma.onboarding-flow";
export const setupCookieName = "__Host-samma.company-setup";
export const onboardingLifetime = 15 * 60;
type FlowState = { purpose: "authentication"; choice: OnboardingChoice; oauthState: string; nonce: string; expires: number };
export type CompanySetupState = { purpose: "company"; accountId: string; identityId: string; nonce: string; expires: number };
type State = FlowState | CompanySetupState;

export function onboardingChoice(value: unknown): OnboardingChoice {
  if (value !== "PERSON" && value !== "COMPANY") throw new Error("Invalid onboarding choice");
  return value;
}

// Separate key purpose; authenticated encryption keeps account/flow data out of URLs and browser-readable state.
const key = (secret: string) => createHash("sha256").update("samma-onboarding-v1\0" + secret).digest();
export function sealOnboarding(state: State, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(state), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function readOnboarding<P extends State["purpose"]>(value: string | undefined, secret: string, purpose: P, now = Date.now()): Extract<State, { purpose: P }> | null {
  try {
    if (!value || value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
    const bytes = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(secret), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const state = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
    if (state.purpose !== purpose || !Number.isSafeInteger(state.expires) || state.expires <= now ||
        state.expires > now + onboardingLifetime * 1000 || typeof state.nonce !== "string" ||
        !/^[0-9a-f-]{36}$/.test(state.nonce)) return null;
    if (purpose === "authentication") {
      onboardingChoice(state.choice);
      if (typeof state.oauthState !== "string" || !state.oauthState) return null;
    } else if (typeof state.accountId !== "string" || !state.accountId || typeof state.identityId !== "string" || !state.identityId) return null;
    return state;
  } catch { return null; }
}

export function newFlow(choice: OnboardingChoice, oauthState: string): FlowState {
  return { purpose: "authentication", choice: onboardingChoice(choice), oauthState, nonce: randomUUID(), expires: Date.now() + onboardingLifetime * 1000 };
}
export function newCompanySetup(accountId: string, identityId: string, nonce: string, now = Date.now()): CompanySetupState {
  // Registration has its own deadline. Give authenticated workspace setup its
  // full short-lived window instead of consuming it while waiting for email.
  return { purpose: "company", accountId, identityId, nonce, expires: now + onboardingLifetime * 1000 };
}
export function companySetupMatches(state: CompanySetupState | null, session: { accountId: string; identityId: string }): state is CompanySetupState {
  return Boolean(state && state.accountId === session.accountId && state.identityId === session.identityId);
}
export function onboardingCookie(name: string, value: string, maxAge = onboardingLifetime): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function requestCookie(request: Request, name: string): string | undefined {
  return request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(name + "="))?.slice(name.length + 1);
}
