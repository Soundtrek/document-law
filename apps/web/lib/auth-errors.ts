// Only these application-owned codes can reach the sign-in UI. Never render provider errors.
export const authMessages = {
  EmailCollision: "An account already exists for this email. Sign in using the linked login method or contact support.",
  OnboardingRequired: "Choose Person or Company to finish setting up your account. If you have already registered, sign in with that account when prompted.",
  OnboardingExpired: "Your account setup session expired or could not be verified. Choose Person or Company again, then sign in with your registered account.",
  EmailUnverified: "Verify your email before continuing. Sign in again to request a new verification email.",
  AccountUnavailable: "This account cannot sign in right now. Contact support if you need help with account access.",
} as const;
export type AuthFailure = keyof typeof authMessages;
export class AuthEntryError extends Error {
  constructor(readonly code: AuthFailure) { super(code); this.name = "AuthEntryError"; }
}
export function authErrorMessage(code: unknown): string {
  return typeof code === "string" && Object.hasOwn(authMessages, code)
    ? authMessages[code as AuthFailure]
    : "Sign-in could not be completed. Try again. If a verification or recovery link has expired, request a new one through secure sign-in.";
}
