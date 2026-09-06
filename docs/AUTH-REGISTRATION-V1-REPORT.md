# Auth + registration V1 — DEV acceptance, 2026-09-06

**STATUS: PASS — public DEV registration and recovery accepted. Stopped for Phil;
no main promotion or RC application deployment.**

## Promotion and deployment

- Approved experiment: `44fd91addb9e47b396a0d4d2e345994f33d0eb16`.
- Previous DEV: `d82633989c4ba93849512a6947761a57a01dd293`.
- Normal merge, pushed DEV and deployed SHA:
  `7d3485686f9c5567bca773ccadd34eee0cf4228d`.
- Visible overlay: `DEV`, `dev`, `7d34856`; `/api/health` reports the full SHA.
- The subsequent acceptance documentation commit advances `dev`/`origin/dev`
  without changing or rebuilding this accepted application. Its final SHA is
  recorded in the handoff and private Git evidence.
- Branch/runtime map remains `experiment/*` → `http://192.168.1.152:2022`,
  `dev` → `https://dev.samma.co.za`, `main` → `https://samma.co.za`.

Focused precheck found clean DEV matching origin, experiment matching origin,
unchanged main/origin-main and no unexpected divergence. Merge had no conflicts.
Application, packages, infrastructure and package manifests matched the validated
experiment byte-for-byte. The exact merge was built in its own clean release
clone under `/srv/nuc-archive/juanity/dev-releases/`, using the established bounded
production build and DEV metadata injection. Only `samma-dev-web` was recreated.

## Real public browser acceptance

Fresh isolated Chromium contexts used the real public DEV and Keycloak pages,
actual self-registration and actual verification/reset emails. No synthetic auth
bypass, mocked provider, fabricated callback or administrative user creation was
used. Synthetic names and two unique disposable tagged email addresses were used.

| Journey/check | Result |
| --- | --- |
| Person | PASS: Person selection → provider registration → real verification email/link → password setup → real callback → `/person`, Personal Info Center |
| Person database | PASS: one verified Account, one matching issuer/subject AccountIdentity and one Person; no Company creation, membership, OWNER or Governance grants |
| Company | PASS: Company selection → provider registration → real verification email/link → password setup → `/onboarding/company` → `SAMMA Auth Test Company` → `/company`, Company Info Center |
| Company database | PASS: one verified Account/Identity/Person; one Company, exactly one ACTIVE membership and one active OWNER grant; exactly one COMPANY_CREATED event |
| Extra permissions | PASS: no HR, PAYROLL, LEGAL, CLERK, BILLING or other implicit role; no Governance capability |
| Onboarding choice | PASS: each chosen journey survived registration, email verification, authentication and callback; choice remains transient, with no permanent Account classification |
| Recovery | PASS: browser Forgot password → actual reset email/link → new password → DEV Person; fresh login rejected old password and accepted new password |
| Recovery identity | PASS: complete scoped Account, Identity and Person snapshots unchanged before/after; no duplicate identity/account |
| Existing Phil | PASS: read-only before/after Account, Person, linked identities, company memberships and Governance snapshots identical; password untouched; no company created |
| Logout | PASS: local session cookie and persisted session removed, Keycloak confirmation completed, provider identity cookie cleared, returned to DEV root; old DEV cookie replay denied protected content |

## Browser session isolation and shared provider

A real authenticated DEV context received a Secure, HttpOnly, SameSite=Lax,
host-only `__Host-samma.session-token`. It could open DEV Person but RC Person
redirected to `/sign-in`; its DEV session remained valid. There is no parent-domain
SAMMA authentication cookie.

For the reverse direction, an isolated browser received an inert RC URL-scoped
host-only cookie. Browser network headers confirmed it was not sent to DEV, and
DEV Person remained unauthenticated. Existing RC source also declares the same
host-only cookie policy. This was a transport/configuration check, **not an
interactive authenticated RC login**: no RC session was created, changed or
revoked. No real session token was copied between hosts.

**DEV and RC share Keycloak realm `samma` and client `samma-web`.** The already
applied realm registration, verification, SMTP, recovery, password policy and
provider request controls affect sign-in through both hosts. These settings were
confirmed read-only for promotion; no further provider/proxy changes were needed.
RC authentication policy is therefore not claimed to be unchanged. Shared
Keycloak SSO may also facilitate a separate deliberate sign-in on either host;
SAMMA browser sessions remain host-scoped. The shared development database is not
an independent boundary against manually copied bearer tokens.

## SMTP and Keycloak

- Public self-registration, email-as-username/login, required verified email and
  forgot-password recovery are enabled; duplicate emails are disabled.
- Sender: `SAMMA <no-reply@samma.co.za>`.
- Server: `wp13.host-ww.net:465`, implicit TLS with certificate verification.
- Two actual verification messages and one actual recovery message arrived in
  the exact disposable tagged mailboxes; all action links completed in browser.
- Credentials remain in operator-owned 0600 `/etc/samma-dev/smtp.env` and provider
  configuration, outside Git and the SAMMA browser/web runtime.
- Approved policy remains minimum 12 characters, not username/email, and baseline
  common-password denylist. Brute-force and request throttling remain enabled.
- MFA remains available and **unenforced in DEV**. Governance MFA must be enabled
  and tested before real sensitive use.
- Exact DEV/RC callbacks/origins/logout destinations and S256 PKCE remain; no
  wildcard or LAN callback was introduced.
- Existing mail alias/MX still targets the web host; no DNS was changed. The
  working hosting SMTP endpoint and tagged local delivery do not establish
  delivery to every external mail service.

## Health and RC safety

DEV root, `/api/health` and `/api/ready` all returned HTTP 200. Readiness confirms
`database: true`, `storage: true`, `provider: s3`; the container is healthy.

Main and origin/main remain `0bc1660f03b8380aedcf24a44881f4196e5eb4de`.
RC's existing deployed revision is the same SHA. RC container ID and start time
are unchanged, and its root, health and readiness returned 200. RC was not built,
restarted or redeployed. Port-2022 experiment container ID, start time and revision
`d3ed4c214731641a88c881cb31749cd02dfcde42` are also unchanged.

## Proportional validation and cleanup

The exact merged production build passed, including its compiler/type checks.
No application code changed in the merge, so previously passed targeted auth
suites were not repeated. No migration, storage, Legal Access or broad Governance
suite was run. **Full historical suite rerun: NO.** The dependency installation
reported the same previously documented DEV-only Prisma audit exception; this
promotion introduced no dependency changes or new exception.

Earlier experiment evidence remains applicable: nine identity/onboarding/error
helper tests, real PostgreSQL onboarding concurrency and permission negatives,
real Auth.js/PostgreSQL callback tests with simulated OIDC transport, affected
lint/typecheck, production build, audit gate, provider password negatives,
throttling and provider-only mail checks. Today's real public browser journeys
complete the previously pending DEV acceptance.

Cleanup verified exact generated email, provider ID, synthetic name, local IDs
and absence of unrelated relationships/records/subscriptions before a scoped
transaction. Removed only two disposable provider users, Accounts, Identities,
Persons, their sessions, and the one test Company/member/OWNER grant. Phil,
Juanita, existing persistent records and object storage were not modified. Test
activity attribution and private acceptance evidence were preserved; temporary
test passwords and consumed email action URLs were removed.

Private evidence is operator-only under `/etc/samma-dev/auth-dev-acceptance/`:
identity snapshots, mail receipt metadata, synthetic browser screenshots, session
and recovery results, cleanup proof, runtime/health and Git evidence. No passwords,
SMTP credentials or bearer tokens appear in this report.

**Stop for Phil's DEV review. No dev → main promotion is authorised.**
