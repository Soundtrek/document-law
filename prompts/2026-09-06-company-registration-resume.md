# Company registration resume — accepted scope

User requested an explicit Company recovery action for a verified, enabled Keycloak identity whose original COMPANY flow was lost before SAMMA AccountIdentity creation. Create experiment/fix-company-registration-resume from current dev; validate narrowly, merge to dev and deploy dev.samma.co.za. Main and working Person onboarding stay unchanged.

The action must create fresh encrypted short-lived COMPANY intent bound to fresh OAuth state/nonce, initiate Keycloak login rather than registration, and retain existing verified issuer/subject callback identity creation. Account, AccountIdentity and independent Person precede company-setup state; Company/member/OWNER are created only on explicit company-name submission. No email-only merge, Governance/functional grants, verification bypass, permanent intent, raw query trust or ordinary-login semantics changes.

Surface Company-specific recovery from Company onboarding and OnboardingRequired without assuming all error-page visitors chose Company. Use company3 or a fresh synthetic incomplete equivalent for live acceptance. Focus checks on resume, intact fresh Company registration, ordinary login, one Person regression and identity/link protections; affected lint/typecheck/build only, no full suite.
