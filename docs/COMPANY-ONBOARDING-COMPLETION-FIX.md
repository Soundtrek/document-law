# Company onboarding completion — 2026-09-06

## Diagnosis

The pre-fix deployed revision was `7d3485686f9c5567bca773ccadd34eee0cf4228d`.
A fresh real public Company registration and immediate `Soundtrek` submission
succeeded on that revision. The active OWNER catalogue had exactly the approved
membership/settings capabilities. The resulting disposable company had one
ACTIVE member and one OWNER grant. No deterministic name, role-catalogue,
transaction, nested membership/grant or audit-write failure was reproduced.

A real authenticated `Soundtrek` submission with no setup cookie reproduced an
empty HTTP 403. The exact rejecting step was the API's setup-state check, before
the transaction. The same check rejects expired state. The old UI collapsed all
failures into one generic message. Ordinary sign-in also deleted pending setup,
and Company setup inherited the original registration deadline, including time
spent waiting for verification mail. These are confirmed state-lifecycle defects.
The original user's failed request cannot be conclusively attributed to one of
these paths: the old handler recorded no error detail. This is not presented as
proof of a historical database failure.

## Focused correction

- Authenticated Company setup receives its own 15-minute window. OAuth state
  expiry remains unchanged. Resuming setup does not extend its deadline.
- Pending setup survives ordinary sign-in and remains bound to the same Account
  and Identity. Another identity cannot inherit it. Successful completion or
  CSRF-accepted explicit sign-out clears setup; expiry still fails closed.
- Removed `Set up later` and the expired-setup link to Person. Active incomplete
  Company intent redirects `/person` to `/onboarding/company`; navigation offers
  `Complete company setup`. Expired setup stays on its page with a Company-only
  restart action. No permanent account-type field or automatic company creation.
- The API distinguishes invalid name (422), expired/missing setup (409), missing
  authentication (401), access denial (403), unavailable approved OWNER (503),
  and unexpected server failure (500). UI messages are allowlisted. Failures keep
  the page and entered name. Safe logs include fixed categories/stages only.
- After session/identity verification, a completed retry can return the existing
  active workspace even after the success response cleared the setup cookie.
  Missing/expired state can never create a new workspace. Revoked membership is
  not restored. Account locking and nonce-based idempotency remain.
- Company, ACTIVE membership, OWNER and audit still commit atomically. There are
  no new grants, dependencies, migrations, provider settings or account fields.

## Focused verification

The regression entrypoints are `apps/web/lib/onboarding-state.test.ts`,
`infrastructure/onboarding/verify-company-completion.ts` and
`infrastructure/onboarding/verify-company-intent.ts`. Mutation tests require
`samma_company_completion_test`, a disposable database with the existing schema;
never run them against shared DEV. OIDC transport is simulated only in the
isolated Auth.js/API test. Live acceptance uses the real public provider.

Checks cover Soundtrek, atomic audit-failure rollback, OWNER-only/no Governance,
concurrent and completed retries, missing/expired/cross-identity denial, revoked
membership, independent Person identity, Company intent across login, bounded
setup expiry, API error categories and explicit logout. Affected web typecheck
and changed-file lint are required. No historical auth/storage/legal suite runs.

Focused state tests (4), both company-only PostgreSQL/Auth.js/API regression
entrypoints, affected web typecheck and changed-file lint passed. DEV build,
browser acceptance and scoped cleanup are recorded after deployment.
Private evidence resides in `/etc/samma-dev/company-onboarding-fix/`; no passwords,
mail credentials or session tokens are committed. Main/RC and port 2022 remain
outside this deployment. Stop for Phil after DEV acceptance.
