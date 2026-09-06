export type CompanySetupCode = "invalid_name" | "setup_expired" | "session_required" | "identity_mismatch" | "workspace_unavailable" | "owner_unavailable";

export class CompanySetupError extends Error {
  constructor(readonly code: CompanySetupCode) { super(code); this.name = "CompanySetupError"; }
}
export class CompanySetupUnexpectedError extends Error {
  constructor(readonly stage: "session" | "existing_workspace" | "owner_catalogue" | "workspace_write" | "audit_write") {
    super("Company setup failed"); this.name = "CompanySetupUnexpectedError";
  }
}

export const companySetupMessages = {
  invalid_name: "Enter a company name of 1–160 characters, without line breaks.",
  setup_expired: "Your company setup has expired. Restart company setup to continue.",
  session_required: "Please sign in again to continue company setup.",
  identity_mismatch: "Restart company setup with your current signed-in account.",
  workspace_unavailable: "This workspace is no longer available to your account.",
  owner_unavailable: "Company setup is temporarily unavailable. Please try again shortly.",
  unexpected: "We couldn't create your workspace. Please try again. Your company setup is still open.",
} as const;

export function companySetupMessage(code: unknown): string {
  return typeof code === "string" && Object.hasOwn(companySetupMessages, code)
    ? companySetupMessages[code as keyof typeof companySetupMessages] : companySetupMessages.unexpected;
}
