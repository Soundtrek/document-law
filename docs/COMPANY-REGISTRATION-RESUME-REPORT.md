# Incomplete Company registration resume — 6 September 2026

STATUS: PASS. User-authorised experiment → dev merge and public DEV deployment completed. Main is excluded.

## Behavior

Company onboarding offers `Continue company setup`, leading to the explicit
`/onboarding/company/resume` page. `OnboardingRequired` offers a conditional
Company recovery link without assuming that every affected account is a Company
user. The recovery page also explains the provider's email-already-exists case;
Keycloak's registration page/theme/configuration is unchanged.

The explicit CSRF-validated Company resume POST starts normal Keycloak login,
with fresh OAuth state, OIDC nonce and the existing encrypted 15-minute
`__Host-samma.onboarding-flow` cookie. The existing callback resolves verified
issuer + subject and creates Account, AccountIdentity and independent Person.
It issues the existing company-setup cookie and redirects to
`/onboarding/company`. Company/member/OWNER are still created only on explicit
company-name submission. No schema or dependency changes.

## Focused validation

- `infrastructure/auth/verify-company-resume.ts` passed against the new isolated
  `samma_company_resume_test` database. It exercises real Auth.js and PostgreSQL
  with signed simulated OIDC responses; it is not live provider acceptance.
- Confirmed incomplete ordinary login denial followed by Company recovery,
  fresh state/nonces, login without registration prompt, issuer/subject linkage,
  deferred Company creation, active OWNER-only membership and idempotent
  existing-owner login.
- Confirmed fresh Company registration with surviving original state.
- Ran one focused Person registration regression: registration prompt, Account/
  Person creation, `/person`, no company-setup cookie. Person-specific branching
  and identity/callback authorization code were not changed.
- Rejected case-insensitive email collision, unverified claims, missing,
  tampered, expired and mismatched flow state, invalid/duplicate resume fields,
  missing CSRF and cross-origin requests. Raw query parameters create no intent.
- Affected web typecheck and affected-file ESLint passed. Production builds
  passed for the experiment and isolated exact-DEV release.
- DEV dependency audit passed with the already documented Prisma DEV-only
  exception; no dependency versions or exception rules changed.
- Full test suite rerun: NO.

## Actual HTTPS DEV acceptance

Used a fresh synthetic equivalent of company3. The provider fixture was already
verified/enabled, had no required actions, and had no SAMMA Account/AccountIdentity.
company3's password, provider identity and absent SAMMA Account remain untouched.

`infrastructure/auth/browser-company-resume.cjs` exercised:

1. Ordinary login correctly returned `OnboardingRequired`; its Company-specific
   recovery link reached the explicit Company continuation page.
2. From DEV onboarding in a fresh browser context, Company recovery opened
   Keycloak login without `prompt=create`, using the exact DEV callback and
   S256 PKCE, state and nonce.
3. The flow cookie was Secure, HttpOnly, Lax, host-only, path `/`, and short-lived;
   it was absent from RC's cookie scope.
4. The real login/callback reached `/onboarding/company`. A read-only database
   check before submission found one verified ACTIVE Account, one identity
   linked by the expected issuer/subject, one Person, zero Company/member/roles
   and zero Governance grants.
5. Explicit submission of `Synthetic Company Resume Acceptance` reached the
   Company Info Center. Read-back found one Company, one ACTIVE CompanyMember
   and exactly OWNER; no HR, PAYROLL, LEGAL or Governance grants.
6. Logout and ordinary existing-owner login returned the same Account to
   `/company`, without onboarding intent or duplicate creation.
7. Keycloak read-back found exactly one provider user with the original subject,
   verified/enabled and no remaining required actions.

An initial browser assertion checked the route before Next's client navigation
finished. The test now waits for the recovery-page URL; no application correction
was needed. The corrected Company acceptance passed in full.

Private synthetic fixture and before/after evidence:
`/etc/samma-dev/company-registration-resume/`. No credentials, tokens, session
cookies, callback parameters or browser traces are included in this report.

## Release

- Application commit and deployed SHA: `8a96e2f524016ad4a92e0dfeefcef66de3f1113b`.
- Branch: `experiment/fix-company-registration-resume`, fast-forwarded to dev.
- Release: `/srv/nuc-archive/juanity/dev-releases/8a96e2f524016ad4a92e0dfeefcef66de3f1113b`.
- Public health/readiness and recovery page returned 200; compiled health
  metadata confirmed `dev / dev / 8a96e2f`.
- Only `samma-dev-web` was recreated. RC and experiment container IDs and start
  times were unchanged; RC health remained 200.
- Local and remote main remain `0bc1660f03b8380aedcf24a44881f4196e5eb4de`.
- Subsequent acceptance documentation/browser-test-only commit does not alter
  the deployed application source or require another build.
