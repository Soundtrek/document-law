# Real Authentication V1

Public DEV registration, verified email, Person/Company onboarding and password
recovery passed real browser acceptance on 2026-09-06 at deployed merge
`7d3485686f9c5567bca773ccadd34eee0cf4228d`. See the
[acceptance report](AUTH-REGISTRATION-V1-REPORT.md). DEV MFA remains unenforced.
DEV and RC share the realm/client, so the enabled provider policies affect both
hosts; RC application deployment remains unchanged.

2026-09-06: dedicated SMTP, public registration, verified email and recovery are
enabled at Keycloak. Actual verification/reset delivery and password recovery
pass. Application changes remain on the experiment, pending approved DEV merge
and full Person/Company acceptance. See the [current report](AUTH-REGISTRATION-V1-REPORT.md).

Current deployment and remaining owner onboarding steps:
[handoff report](REAL-AUTHENTICATION-V1-REPORT.md).

Keycloak 26.7.3 is selected for this initial DEV deployment. SAMMA remains
independent: Account + AccountIdentity + Person are its stable identity/domain
projection. Keycloak roles do not grant company, document, Legal Access or
Governance permissions.

## Provider and application boundary

- Public provider: `https://auth.samma.co.za`.
- Fixed issuer: `https://auth.samma.co.za/realms/samma`.
- Confidential client: `samma-web`.
- Exact callbacks: `https://samma.co.za/api/auth/callback/keycloak` and
  `https://dev.samma.co.za/api/auth/callback/keycloak`.
- Exact post-logout destinations: `https://samma.co.za/` and
  `https://dev.samma.co.za/`.
- Auth.js Core 0.41.3 performs Authorization Code, S256 PKCE, state, nonce,
  token processing, CSRF and session-token generation. SAMMA implements its
  database adapter, not password hashing/recovery or session cryptography.
- Provider claims must contain a subject, email and strict boolean verified
  email. Links resolve by the fixed issuer plus provider subject. Public account
  creation is allowed only after a valid Person/Company selection and verified
  callback. Account, provider link and Person bootstrap are transactional. Generic
  adapter creation/linking remains disabled; matching email never creates a link.
- Sessions are persisted in PostgreSQL with an absolute one-hour deadline,
  Account and AccountIdentity links, and per-session MFA evidence. Expired
  sessions are pruned during login. Cookies are host-only
  `__Host-samma.session-token`, Secure, HttpOnly, SameSite=Lax, path `/`.
- Account suspension, unverified local status, identity unlinking, session
  deletion and expiration fail closed on server reads. Privileges are reread
  from SAMMA, not copied into a session. Changing provider email does not change
  Account IDs or auto-merge accounts.
- Keycloak manages its SSO session separately. Application logout uses Auth.js
  CSRF-protected POST, deletes the SAMMA session, then initiates Keycloak logout.
  The validated login ID token is retained server-side per session, deleted with
  local revocation, and sent only to the configured Keycloak logout endpoint as
  `id_token_hint`, avoiding a second confirmation for new sessions. Older
  sessions without a hint retain Keycloak confirmation once. GET `/auth/logout`
  only returns home; it cannot initiate provider logout. Local deletion failures
  return 503 without clearing the browser cookie. Old SAMMA cookies cannot reopen
  protected pages after successful local logout.
- No refresh/access tokens or passwords are stored in SAMMA PostgreSQL. The nullable
  `AuthSession.idToken` is used only for provider logout and is excluded from the
  public session response, activity events and application logs.
  Keycloak-side session revocation alone does not instantly delete SAMMA sessions;
  operators must revoke SAMMA sessions as well. Back-channel logout is not V1.

## Onboarding flow state

The `/onboarding` choice is limited to PERSON or COMPANY. After Auth.js accepts
sign-in CSRF, SAMMA encrypts a 15-minute, HttpOnly/Secure/SameSite=Lax host cookie,
bound to Auth.js's generated OAuth state. The verified callback consumes it and
clears it. Company setup receives a separately purpose-bound encrypted cookie
containing the resolved Account/identity and an opaque random nonce. It gets a
separate 15-minute authenticated setup window and is cleared after success or
explicit sign-out. Ordinary sign-in preserves unexpired setup only for the same
Account/Identity. Incomplete Company intent redirects Person navigation back to
company setup; expiration offers a Company-only restart. See the
[focused correction](COMPANY-ONBOARDING-COMPLETION-FIX.md).
No choice, Account classification, token or sensitive information is added to URLs.

The application sends Keycloak's standard `prompt=create` only for
an explicit PERSON/COMPANY start without a valid existing SAMMA session. Ordinary
Sign in omits it. A signed-in Person can explicitly choose Company and continue
through the provider without registering another account. An existing account
holder on the registration page can use its sign-in link while retaining the
protected onboarding flow. Standard existing-member login goes to `/company`;
other existing users go to `/person`. A lost/expired setup can be restarted.

New subject creation checks email collisions case-insensitively under an email
advisory lock, independently of the subject lock. A collision rejects creation
with a fixed safe message; it never selects the existing Account for linking.
New Account email is normalized to lowercase; existing Account IDs/emails/links
are not rewritten. Suspended, unverified, missing-choice and invalid-state
failures use fixed application-owned messages, never provider payloads.

The company POST requires the canonical Origin, valid setup cookie and a live
verified session for that same identity. Only one company-name field is accepted.
The transaction locks the Account, verifies the active approved OWNER definition,
creates Company/member/grant and audit together. The flow nonce is the opaque
Company ID, so a retry can recover an existing result after a lost response;
concurrent/repeated logins cannot duplicate an initial workspace. Revoked access
is never restored by replay. No new table, field or migration is needed.

Keycloak registration and forgot-password are enabled. A verified provider email
is required before SAMMA creates any Account/Identity/Person. The existing owner
bootstrap exception is historical and is never applied to public users.

## Provider mail and password policy

Dedicated sender: `SAMMA <no-reply@samma.co.za>`. SMTP uses the existing hosting
service `wp13.host-ww.net:465`, implicit TLS and certificate verification. The
operator's source settings/password are in `/etc/samma-dev/smtp.env`, mode 0600;
Keycloak stores its provider SMTP configuration internally. No SMTP secret is
mounted into the SAMMA web app. No third-party mail provider was introduced.

`mail.samma.co.za` currently aliases the web address, and the domain MX points at
the web apex. That endpoint refuses port 465. The existing hosting SMTP endpoint
authenticates the dedicated SAMMA mailbox and its certificate also validates for
the mail domain. Normal inbound mail DNS still needs correction through the
hosting DNS configuration; tagged local mailbox delivery is not proof of delivery
to every external mail service.

Keycloak enforces minimum length 12, not-email/not-username, and a small
case-insensitive common-password denylist. No composition checklist, password
expiry schedule or password handler is added to SAMMA. The denylist is a baseline,
not a complete breached-password corpus. User action/verification/reset tokens
expire after 15 minutes. Existing passwords/owner required actions are not reset.
Default Keycloak email templates identify SAMMA and contain the clear action;
no employment/legal content is added. Native provider pages handle invalid,
expired and already-used links; SAMMA errors explain how to restart safely.

## Server authorisation

`/person`, `/company`, `/company/*`, `/legal-access`, `/governance`, and
`/records/*` require an active verified Account session. Layouts provide route
checks and sensitive pages repeat checks at the data boundary. Anonymous users
are redirected to `/sign-in`; unauthorised resources return not-found.

Person reads use the signed-in Account's Person; company listings use active
membership; record reads use the existing domain policies with current active
functional roles and Legal Access grants. Governance never grants universal
record access. Definition versions remain attached to existing records.
Private Person records cannot enter a company context through supplied IDs.

Legacy static demo employee/add-record/invitation URLs authenticate then deny;
those fixtures are not real company resources. Existing form demonstrations are
not converted into new persisted workflows by this authentication change.

Governance currently renders definitions, roles and authentication audit, so it
requires `platform.definitions.manage`, `platform.roles.manage` and
`platform.audit.review`. Checks and denials are audited. No `/admin` or
SUPERADMIN bypass is added. Synthetic domain fixtures and identity helpers remain
for explicit tests, but the public runtime sets development identity to false
and runs the production build.

## Initial owners and MFA

Exactly `phil@samma.co.za` and `juanita@samma.co.za` are approved initial
Governance Owners. Each receives the ten explicit capabilities listed in
`packages/identity/src/index.ts`. They receive no company membership or universal
sensitive-record access. Controlled bootstrap resolves their provider subjects
before public onboarding and preserves existing approved Account IDs.

The owner explicitly approved administrative verified-email bootstrap for these
two DEV identities because SMTP was not configured at bootstrap. Keycloak records provider
administration; SAMMA records `AUTH_BOOTSTRAP_GOVERNANCE`. This does not claim
that a verification email was sent for them. Public SMTP verification and email
recovery are now enabled; passwords are changed/recovered through Keycloak's intended
mechanisms, never SAMMA application code.

**MFA IS TEMPORARILY DISABLED FOR DEV/INITIAL SETUP.**
`SAMMA_GOVERNANCE_MFA_REQUIRED=false` is permitted only with
`SAMMA_ENV=development`. Other environments enforce Governance MFA. The model
retains MFA evidence from validated `acr=2` or `amr` containing `mfa`; configure
and validate Keycloak's corresponding MFA flow/claims before enabling it.
Existing sessions without that evidence must reauthenticate. **Enable Governance
MFA before introducing real sensitive client data.** Keycloak retains OTP/MFA
support; no social/federated providers are enabled.

## Operator-only credentials and bootstrap

`/etc/samma-dev/bootstrap-credentials.txt` belongs to `philip:philip`, mode 0600,
outside Git and images. Only Phil supplies the initial passwords. It must never
be mounted into web or printed. `infrastructure/auth/keycloak-bootstrap.py`
passes them directly to Keycloak over the loopback-only administration endpoint.
It requires exactly the approved identities and marks passwords temporary with
`UPDATE_PASSWORD`. Retries never reset a password or claim an unrelated provider
identity. Empty passwords stop provisioning.

That script writes a password-free subject manifest. The separate
`bootstrap-accounts.ts` operator process consumes only that manifest and creates
Account/Identity/Person links and explicit capabilities in a transaction. Retries
do not restore revoked privileges. Neither script runs as a web route.

Owners must choose their final passwords directly in Keycloak, store them in
their password manager and complete the checklist. Do not mark completion from
successful provisioning or an attempted login. Delete the temporary file only
when both password changes, password-manager storage and recovery checklist
items are confirmed. Final passwords never enter SAMMA code or its database.

Other service secrets are stored in `/etc/samma-dev/keycloak.env` and
`/etc/samma-dev/web.env`, mode 0600. Web receives only application DB/OIDC/session
configuration, not Keycloak administrator or owner credentials. The temporary
Keycloak administrator remains an operator-only setup credential; its public
admin endpoint is blocked. Replace/remove it through Keycloak's supported
administration process when an operational administrator is established.

## Controls and operations

Auth.js handles CSRF for sign-in/sign-out; SAMMA additionally requires the exact
Origin for POST. The canonical base URL is server configuration, not Host or
proxy input. Sign-in forwards only a validated email hint, strips OAuth query
parameter overrides, and uses a fixed redirect allow-list. Errors are generic;
logs omit provider payloads, tokens, hints and callback parameters.

Keycloak brute-force protection is enabled. SAMMA login initiation permits 30
requests per minute in a shared PostgreSQL window and returns 429 thereafter;
it stores no emails or raw IPs. This conservative DEV limit is shared across
users. In addition, Caddy gates provider login-action and recovery-entry requests
through a small stock Nginx limiter: 30/minute per connection IP with burst 10,
120/minute globally with burst 20, returning 429 and Retry-After. Caddy supplies
the trusted client key; the limiter accepts requests only from that proxy. It
receives no passwords/cookies/auth headers or original URI/query. Provider
verification resend also retains its native cooldown. See
[operator setup and rollback](../infrastructure/auth/REGISTRATION.md).
Audit includes successful/denied login, logout, bootstrap, Governance
access/denial, session revocation and authorised record metadata reads.

Operator session revocation:

```sh
node_modules/.bin/tsx infrastructure/auth/revoke-sessions.ts TARGET_ACCOUNT_ID OPERATOR_ACCOUNT_ID
```

Run only in the configured operator environment. The operator Account must be
active and hold `platform.security.review`; revocation is audited. There is no
unauthorised web endpoint for this operation.

Deployment, checkpoint, checks and remaining human steps are recorded in
`docs/NUC-DEV-DEPLOYMENT.md`. Historical initial DNS blockage remains in
`docs/REAL-AUTHENTICATION-V1-PREFLIGHT.md`.

## Reference documentation

[Keycloak containers](https://www.keycloak.org/server/containers),
[hostname](https://www.keycloak.org/server/hostname),
[reverse proxy](https://www.keycloak.org/server/reverseproxy),
[Auth.js adapters](https://authjs.dev/reference/core/adapters), and
[Keycloak provider](https://authjs.dev/getting-started/providers/keycloak).
