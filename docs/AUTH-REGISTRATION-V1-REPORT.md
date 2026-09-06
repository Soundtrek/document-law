# Auth + registration V1 — 2026-09-06

**STATUS: PARTIAL — provider setup and targeted checks pass; experiment awaits
build completion and approved DEV integration.**

## Registration and SAMMA

Keycloak public registration, email-as-username/login and forgot-password are
enabled. Verified email is mandatory. The application experiment starts provider
registration explicitly for Person/Company, keeps existing Sign in separate,
and lets authenticated people start Company setup without a new provider account.
Ordinary existing company members return to `/company`; others return to `/person`.

Protected 15-minute PERSON/COMPANY state remains bound to OAuth state, then
Account/Identity for Company setup. It is cleared on callback/completion or
restart and is not a permanent account type. Expired/missing setup has a safe
restart path. New verified issuer/subject creates one stable Account/Identity/
Person transactionally. Case-insensitive email collisions fail closed with the
requested message; email matching never links accounts. Existing IDs and links
are not rewritten.

Person creates no Company/member/relationship/grants. Company collects only name
and commits Company, ACTIVE member, approved OWNER and audit atomically. No
Governance, HR, PAYROLL, LEGAL, CLERK or BILLING grant is added. OWNER retains only
membership/settings powers. Failed/abandoned setup creates no company.

## SMTP and Keycloak

- Server: existing `wp13.host-ww.net:465`, implicit TLS with certificate checks.
- Sender: `SAMMA <no-reply@samma.co.za>`; dedicated owner-supplied credentials in
  operator-owned 0600 `/etc/samma-dev/smtp.env`, never Git/browser/web runtime.
- Actual verification and reset messages retrieved from the exact disposable
  tagged mailbox folder. Both links worked. Old password rejected; new password
  accepted; same provider subject retained. SAMMA branding present in the mail.
- The initially supplied `mail.samma.co.za` aliases the web host and refuses port
  465. Its MX also targets the web apex. No DNS was changed. The direct hosting
  endpoint passed TLS/SMTP/IMAP authentication and actual mailbox delivery.
- Password policy: 12-character minimum, not username/email, baseline common
  password denylist; live short/common-password rejection passed.
- MFA support retained; current DEV Governance enforcement remains false.
  Enable and test Governance MFA before real sensitive data.
- Phil still has no provider required actions; Juanita's UPDATE_PASSWORD remains
  pending. Neither identity nor the bootstrap worksheet was modified.

## Security and runtime boundary

Exact callbacks remain `https://dev.samma.co.za/api/auth/callback/keycloak` and
`https://samma.co.za/api/auth/callback/keycloak`, with exact matching origins/root
logout destinations, S256 PKCE and no wildcard/LAN callbacks. Host-only secure
SAMMA cookies and separate DEV/RC auth secrets remain in place. Browser host
isolation was inspected in configuration, not rerun as full live acceptance.

SAMMA login-initiation throttling remains. Provider login-action/recovery ingress
now also has a stock Nginx rate gate (32 MB, 0.1 CPU), accessed only by Caddy.
Forged client headers do not bypass it: a live burst produced 11 provider
rejections for missing flow data followed by 5 rate-limit 429 responses with
Retry-After. OIDC discovery and DEV/RC health stayed available. Only the auth
proxy route changed; unrelated loaded routes were compared. No app, database,
storage or proxy container was recreated for this work.

Native Keycloak pages handle email-link outcomes; revisiting the verification
link showed the benign already-verified page. SAMMA displays only allowlisted
application messages and suppresses internal provider payloads. No passwords or
tokens were displayed or committed.

Provider-only browser tests deliberately stop before SAMMA callback acceptance.
Early test attempts followed provider redirects to DEV before the test harness
was corrected; DEV rejected them for missing Auth.js state. Read-only checks
confirmed zero SAMMA Accounts for the disposable provider-mail identity. No
authenticated Person/Company acceptance is claimed from those attempts. The
corrected harness inspects provider redirect responses before following them.

## Validation

| Check | Result |
| --- | --- |
| Identity helpers + onboarding/error helpers | PASS: 9 targeted tests |
| PostgreSQL onboarding suite | PASS, including casing/concurrent email collision and privilege negatives |
| Real Auth.js + PostgreSQL callback suite, simulated OIDC transport | PASS: registration/sign-in, CSRF/origin, flow state, identities, Company OWNER-only, errors, logout and throttle |
| Live provider password policy | PASS: short/common passwords rejected |
| Actual mailbox verification/reset + provider password checks | PASS; same provider subject |
| Provider ingress abuse tests | PASS; forged headers ineffective |
| Typecheck | PASS |
| Affected web lint | PASS |
| Production build | Pending committed candidate build |
| Audit gate | PASS with existing documented DEV-only Prisma exception; no new exception |
| Schema/migrations | Unchanged; existing migrations applied only to new isolated test database |
| Full new Person + Company public browser journeys | Pending approved DEV merge/deployment |

No unrelated record/storage suites ran. Test/SMTP secrets and delivery links
remain private outside Git. [Operations and reproducible test entrypoints](../infrastructure/auth/REGISTRATION.md)
include rollback and the provider blacklist/config mount requirement.

## Git and follow-up

Branch: `experiment/auth-registration-v1`, isolated at
`/home/philip/samma-auth-registration-v1`, from DEV `d826339`. The initial SMTP
blocker handoff is `9cade03`; subsequent implementation/evidence commits remain
on the experiment. DEV and main refs and their application deployments are unchanged.
Provider SMTP/realm/proxy changes described above are live as explicitly requested.

Next gate: Phil reviews the completed experiment, then explicitly approves merge
to DEV. Deploy exact DEV and run one real Person and one real Company registration
with actual mail, followed by login/logout and browser host-isolation checks.
No main promotion is included. Correct the existing mail alias/MX through the
hosting DNS configuration for normal inbound mail; local tagged delivery does
not establish external deliverability. Governance MFA remains required before
real sensitive use.
