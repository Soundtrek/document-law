# Real Authentication V1

2026-09-06 registration completion preflight: **BLOCKED on dedicated SAMMA SMTP**.
Public registration and email recovery remain disabled; no delivery is claimed.
See [live findings and exact missing requirement](AUTH-REGISTRATION-V1-PREFLIGHT.md).

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
  Keycloak asks for confirmation because SAMMA does not retain ID tokens.
  Old SAMMA cookies cannot reopen protected pages after local logout.
- No refresh/access/ID tokens or passwords are stored in SAMMA PostgreSQL.
  Keycloak-side session revocation alone does not instantly delete SAMMA sessions;
  operators must revoke SAMMA sessions as well. Back-channel logout is not V1.

## Onboarding flow state

The `/onboarding` choice is limited to PERSON or COMPANY. After Auth.js accepts
sign-in CSRF, SAMMA encrypts a 15-minute, HttpOnly/Secure/SameSite=Lax host cookie,
bound to Auth.js's generated OAuth state. The verified callback consumes it and
clears it. Company setup receives a separately purpose-bound encrypted cookie
containing the resolved Account/identity and an opaque random nonce; it retains
the original expiry and is cleared after submission. New sign-in clears old setup.
No choice, Account classification, token or sensitive information is added to URLs.

The company POST requires the canonical Origin, valid setup cookie and a live
verified session for that same identity. Only one company-name field is accepted.
The transaction locks the Account, verifies the active approved OWNER definition,
creates Company/member/grant and audit together. The flow nonce is the opaque
Company ID, so a retry can recover an existing result after a lost response;
concurrent/repeated logins cannot duplicate an initial workspace. Revoked access
is never restored by replay. No new table, field or migration is needed.

Keycloak DEV self-registration remains disabled with SMTP unconfigured; this
experiment does not enable provider registration or change verification settings.

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
two DEV identities because SMTP is not configured. Keycloak records provider
administration; SAMMA records `AUTH_BOOTSTRAP_GOVERNANCE`. This does not claim
that a verification email was sent. Email recovery remains unavailable until
SMTP is configured; passwords are changed/recovered through Keycloak's intended
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
users. Audit includes successful/denied login, logout, bootstrap, Governance
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
