# Logout and account switching — 2026-09-06

STATUS: PASS — automated live DEV acceptance. Phil's named-account check in his own Chrome profile remains pending confirmation.

## Root cause

Auth.js deleted the SAMMA database session and cleared the host-only cookie, then
redirected through GET `/auth/logout` to Keycloak with `client_id` and the correct
`post_logout_redirect_uri`, but without `id_token_hint`. The validated ID token
was discarded. Keycloak required another confirmation before ending its SSO
session. A live pre-deployment browser reproduction confirmed that stopping at
this page leaves provider logout incomplete. The older browser test clicked
that confirmation, hiding the one-button UX problem.

Live discovery confirmed the end-session endpoint is
`https://auth.samma.co.za/realms/samma/protocol/openid-connect/logout`.
Client inspection confirmed the exact DEV and RC callback, origin, and root
post-logout URLs are already allowed. No client/realm configuration changed.
[Keycloak documents the ID-token hint and confirmation behavior](https://www.keycloak.org/docs/latest/upgrading/).

## Fix

- Add nullable `AuthSession.idToken` using migration `0004_session_logout_hint`.
  Keep only the Auth.js-validated login ID token, associated with its individual
  browser session. No access/refresh token or password persistence was added.
- The adapter reads the hint and deletes the session in one transaction. The
  public session response and audit event exclude the token. Logout audit now
  receives the deleted session's account attribution.
- After a same-origin, CSRF-validated Auth.js POST succeeds, redirect directly to
  Keycloak with this hint. Ignore caller-supplied logout hints and destinations.
  Local deletion failure returns 503 without clearing the cookie, accounting for
  Auth.js's internal adapter-error handling.
- Return to exactly `https://dev.samma.co.za/` on DEV and
  `https://samma.co.za/` on RC when this code is promoted there. No wildcard or
  parent-domain cookie was added. RC application code was not deployed.
- GET `/auth/logout` now only returns home; it cannot initiate provider logout.
  Successful POST also clears pending authentication/company-setup cookies.
- Ordinary sign-in/SSO parameters, registration and onboarding behavior remain
  unchanged. No blanket `prompt=login` is necessary after completed logout.

Existing sessions created before deployment have no ID token and may require
Keycloak's confirmation once. Subsequent new logins support automatic logout.
An unavailable provider can still interrupt the browser's provider-logout step;
local revocation has already completed and is not rolled back.

## Focused validation

- Real Auth.js + disposable PostgreSQL, simulated signed OIDC responses:
  A → B → A; session-bound hints including two browsers for one account; revoked
  cookie replay denied; public session excludes tokens; missing/forged/cross-origin
  CSRF denied; GET safety; fixed DEV/RC redirects; hostile parameters ignored;
  deletion failure; stale setup cookies cleared; legacy no-hint fallback. PASS.
- Affected web/database typechecks and lint on changed application files. PASS.
- Isolated, bounded production build of the deployed application commit. PASS.
- Real HTTPS DEV + Keycloak in one retained Chromium context: disposable company
  owner → Sign out → independent person → Sign out → company owner → Sign out.
  Each login required a fresh credential screen; each logout returned directly
  home with no confirmation click and no cookie clearing. PASS.
- Browser back without forced reload did not reveal the previous person's
  content; protected routes and old SAMMA-cookie replay were denied. PASS.
- Replayed old Keycloak cookies with `prompt=none` returned `login_required` on
  all three cycles. Provider Admin API and PostgreSQL independently confirmed
  zero remaining sessions for both test identities before cleanup. PASS.
- Secure/HttpOnly/Lax/path `/` DEV cookies were host-only and absent on RC;
  person B could not see company A's company card. PASS.
- Full suite rerun: NO. No storage, Legal Access or unrelated Governance suites.

Phil's exact `company1@samma.co.za` ↔ `person1@samma.co.za` Chrome-profile check
was requested after deployment; it is not claimed as performed by this agent.
No existing user's password was requested or reset.

## DEV and MAIN

- Application commit and deployed SHA:
  `00afd5ae741eeebc801e26532b7fa5ed409d8720`.
- Workflow: `experiment/fix-logout-account-switching` from current `dev`, focused
  validation + production build, fast-forward to `dev`, push, migrate, deploy only
  `samma-dev-web`.
- Release: `/srv/nuc-archive/juanity/dev-releases/00afd5ae741eeebc801e26532b7fa5ed409d8720`.
- Rendered overlay: `DEV / dev / 00afd5a`; health reports the same full SHA.
  DEV health/readiness HTTP 200; container healthy.
- The subsequent acceptance/test/documentation commit changes no application
  code or compiled assets, so the deployed SHA remains the application commit.
- Local/remote `main` unchanged at
  `0bc1660f03b8380aedcf24a44881f4196e5eb4de`. RC and experiment container IDs and
  start times unchanged; RC health/readiness HTTP 200.
- Both disposable provider identities, Accounts/People, company/membership and
  credentials were removed. Synthetic audit attribution was preserved. The
  isolated test database was removed.
- Private evidence and pre-deploy runtime configuration:
  `/etc/samma-dev/logout-account-switching/` (operator-only).

Rollback, if required: restore the backed-up DEV release path/SHA and recreate
only DEV web through the existing wrapper. Leave the additive nullable column
in place; old application builds ignore it. Do not modify RC/main or reset data.
