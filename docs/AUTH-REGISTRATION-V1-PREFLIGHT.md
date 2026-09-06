# Auth and registration V1 preflight — 2026-09-06

**STATUS: BLOCKED — no suitable SAMMA SMTP credentials/sender available.**

The request explicitly requires stopping at this RED blocker. No application,
schema, provider, proxy or runtime changes have been made. Public registration
and recovery are not enabled. No messages were sent and no mailbox delivery is
claimed. This report records read-only live inspection and source review, not
completed acceptance testing.

## SMTP requirement

Keycloak's `smtpServer` is empty. No SMTP configuration is present in the SAMMA
environment files under `/etc/samma-dev/`. There is no host mail transfer service
listed. Existing Mailpit containers are development mail capture services.

Existing NUC Listmonk configuration identifies an enabled authenticated SMTP
service at `wp13.host-ww.net:465`, using TLS with certificate verification enabled.
Its credential and default sender belong to `soundtrek.co.za`; no SAMMA sender is
explicitly configured. Those credentials have not been copied, tested, changed
or used to send mail. Chatwoot's inspected SMTP address/user/password configuration
is empty. A configured mail service for another domain is not evidence that it
authorises `no-reply@samma.co.za`.

To resume, provision a dedicated `no-reply@samma.co.za` SMTP account or confirm an
existing service's authorisation for that sender (or an owner-approved alternative).
Supply the SMTP hostname, port, TLS mode, authentication username and password
through an operator-owned **0600** file under `/etc/samma-dev/`, outside Git.
Do not paste passwords into chat. An accessible disposable DEV mailbox is also
needed to verify actual verification/reset delivery and use the links. No new
third-party provider has been selected.

## Live provider findings

| Item | Observed state |
| --- | --- |
| Provider | Keycloak 26.7.3; realm `samma`, display name SAMMA |
| Self-registration | Disabled |
| Email as username / email login | Enabled / enabled |
| Duplicate provider emails | Disabled |
| Email verification | Required by realm; VERIFY_EMAIL action enabled |
| Forgot password | Disabled; reset credentials email flow exists |
| Password policy | No explicit realm policy configured |
| Brute-force protection | Enabled; 5 failures, 60-second increment, maximum 900-second wait; no permanent lockout |
| Registration abuse controls | Built-in registration flow; reCAPTCHA disabled; additional registration/recovery protection still needs assessment |
| MFA | Conditional OTP support present; CONFIGURE_TOTP enabled and not a default action |
| SAMMA Governance MFA | `SAMMA_GOVERNANCE_MFA_REQUIRED=false` in both current host configurations |
| Phil | Enabled, provider email verified, no pending required actions |
| Juanita | Enabled, provider email verified, UPDATE_PASSWORD pending |

The bootstrap worksheet remains operator-owned mode 0600 and has not been read
or deleted by this preflight. The historical two-owner exception remains intact;
public accounts must complete real provider email verification. Enable and test
Governance MFA before real sensitive data.

The existing confidential `samma-web` client has exactly these callbacks:

- `https://dev.samma.co.za/api/auth/callback/keycloak`
- `https://samma.co.za/api/auth/callback/keycloak`

Its web origins and post-logout destinations are the matching HTTPS origins and
root URLs. S256 PKCE is required and direct password grants are disabled. No
wildcards or port-2022 callback is present. DEV and RC have distinct AUTH_SECRET
values; their actual values were not displayed. The configured SAMMA session and
onboarding cookies have no Domain attribute and use Secure/HttpOnly host-only
cookies. Browser isolation and logout have not been retested in this task.
Provider SSO remains shared; the existing synthetic database is shared as
documented in [DEV operations](DEV-RUNTIME.md).

## Application findings and remaining work

Source review confirms the existing foundation:

- PERSON/COMPANY choice uses authenticated encryption, a 15-minute expiry and
  binding to Auth.js OAuth state. Company setup additionally binds Account and
  AccountIdentity. There is no permanent account-type field.
- Verified issuer/subject resolves AccountIdentity and stable Account. A
  transaction and advisory lock serialize repeated creation, including Person.
  Generic Auth.js account creation/linking is closed. Unverified claims and
  inactive/unverified SAMMA Accounts are rejected.
- An email collision rejects the creation transaction; it does not link by email.
  The UI currently collapses it to a generic sign-in failure and still needs the
  requested safe collision message, including concurrency and email-case review.
- Person onboarding creates no company/membership/relationship/grants. Company
  setup collects only name and transactionally creates Company, ACTIVE member,
  approved OWNER and audit. OWNER is checked for exactly membership/settings
  capabilities. No Governance or other functional role is granted.
- Existing Sign in goes to provider login. Create account currently also goes to
  provider login; explicit registration initiation still needs implementation.
- Abandoned Company setup can be restarted; replay, expiry, live identity and
  membership checks already exist. Verification-link continuation, expired or
  missing state, and existing-user Company setup need real provider testing.
- Login initiation retains the shared database limit of 30 requests per minute.
  It does not by itself protect direct provider registration/recovery endpoints.
- Provider errors are suppressed, but the requested friendly failure cases still
  need mapping and tests. SAMMA contains no password/reset form.

After SMTP is available: configure and verify secure provider mail, enable
registration/recovery, set a sensible provider password policy, complete the
registration entry and safe error handling, assess provider abuse controls, and
test verification/state continuity and recovery with actual disposable mailboxes.
Keep passwords in Keycloak, preserve owner identities and exact callbacks, and
keep MFA supported without requiring enrollment for current DEV.

## Validation and merge boundary

This blocker-only documentation change does not warrant installing dependencies,
running auth mutation tests, typecheck, lint, production build or the audit gate.
Those acceptance checks are **not run**, not passed. No schema changed, so
migration checks are not applicable. Documentation links and `git diff --check`
are checked before committing.

Once implementation is possible, run targeted identity/onboarding/auth negative
tests, typecheck, affected lint, production build and the existing audit gate.
Do not use old administratively verified fixtures as evidence of public email
verification or recovery delivery. The real Person and Company registration,
old/new reset-password behavior, stable identity, no added privileges, cookie
isolation and logout remain pending.

No temporary candidate hostname is identified in the current approved runtime
map. Port 2022 remains preview-only. Full candidate auth testing must follow the
request: use an already-supported candidate hostname if available, otherwise
seek approval for the validated experiment merge and test on DEV afterward.
Do not introduce callbacks or route experiment code through DEV as a workaround.

Worktree: `/home/philip/samma-auth-registration-v1`, branch
`experiment/auth-registration-v1`, based on current DEV
`d82633989c4ba93849512a6947761a57a01dd293`. DEV remains at that commit and main at
`0bc1660f03b8380aedcf24a44881f4196e5eb4de`. The experiment is a preflight handoff,
not an implementation ready for merge. No merge or deployment is authorised by
this report; Phil's approval is required at the later completed experiment gate.
