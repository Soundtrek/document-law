# Real Authentication V1 — handoff report

2026-09-05. **STATUS: PARTIAL — real authentication is deployed; Juanita's final
password change and successful Governance login remain pending.** Phil has
completed his password change; SAMMA audit confirms successful authentication
and Governance access. Final password-manager/recovery checklist completion is
not confirmed for either owner. Automation has not selected their final passwords.

## OIDC and deployment

- Keycloak **26.7.3**, pinned by version and image digest in
  `infrastructure/docker/compose.keycloak.yml`.
- Realm `samma`; issuer `https://auth.samma.co.za/realms/samma`;
  confidential client `samma-web`.
- Public authentication host: `https://auth.samma.co.za`. Its root and admin
  paths deliberately return 404; the SAMMA realm discovery/login endpoints are
  served over valid HTTPS. SAMMA root and `/api/health` return 200.
- Exact callback: `https://samma.co.za/api/auth/callback/keycloak`.
- Keycloak persists in its own PostgreSQL database, credentials and archive
  directory. Both databases have no published port and are off `caddy-net`.
  Only the web and Keycloak frontends join that existing proxy network.
- Application/build commit: **`8ed98f5`**. Subsequent handoff commits
  change documentation and the operator browser check only. They do not require
  replacing the deployed application build.
- Runtime containers: `juanity-app`, `juanity-db`, `samma-keycloak`,
  `samma-keycloak-db`. Their legacy internal names are preserved.
- Certificate chain/hostname validation passed for both public hostnames.
  Certificates expire 2026-12-04 at 10:46:38 UTC (SAMMA) and 13:00:56 UTC (auth).

## Accounts and Governance

| Account | Stable SAMMA Account ID | Result |
| --- | --- | --- |
| phil@samma.co.za | `cmtogeyo400000jlml9dtd2jk` | Provider/Person linked; verified bootstrap; password changed; login and Governance access audited |
| juanita@samma.co.za | `cmtogeyvu000e0jlmg6l54z40` | Provider/Person linked; verified bootstrap; `UPDATE_PASSWORD` remains required; complete login pending |
| Disposable normal DEV fixture | `cmtoj2lr900000ksy1k60v2cu` | Real browser login passed; no Governance capabilities; Governance denied; removed after validation |
| Disposable unverified fixture | `cmtoj2lue00030ksy0uzf916i` | Sensitive access rejected; removed after validation |

Both owners have the current complete set of ten explicit SAMMA capabilities:
`platform.policy.manage`, `platform.definitions.manage`,
`platform.retention.manage`, `platform.roles.manage`,
`platform.companies.manage`, `platform.security.review`,
`platform.audit.review`, `platform.billing.manage`,
`platform.support.access`, `platform.system.configure`.
There is no universal record-access bypass. Keycloak administrator status and
realm roles do not grant SAMMA privileges. Issuer + provider subject resolves
AccountIdentity; email matching never silently links an existing Account.

## MFA, registration and sessions

- Keycloak retains TOTP/MFA capability. Enforcement is explicitly **disabled for
  DEV** through `SAMMA_GOVERNANCE_MFA_REQUIRED=false`. Enable and test Governance
  MFA before real employment/legal records. Non-development environments enforce
  the requirement.
- Public self-registration is disabled. SMTP verification and email recovery are
  unavailable; no verification message is claimed. Owner verification is the
  documented controlled bootstrap exception.
- Auth.js Core 0.41.3 handles Authorization Code, S256 PKCE, state, nonce and
  CSRF. Exact canonical callback/origin and redirect allow-list are enforced.
- Host-only `__Host-samma.session-token`: Secure, HttpOnly, SameSite=Lax,
  path `/`; revocable database session with an absolute one-hour deadline.
- Logout uses a CSRF-protected POST, deletes the local session, and completes
  Keycloak logout. Back/reload and replay of the old cookie cannot reopen
  protected content. Provider-side revocation alone is not immediate SAMMA
  revocation; operators must revoke SAMMA sessions too. Back-channel logout is
  outside V1.
- Person, company/nested company, Legal Access, Governance and record routes
  require a server-validated session. Unauthorised resources/Governance deny
  with not-found. Authorisation rereads current membership, roles and grants.
- `NODE_ENV=production`, `SAMMA_ENV=development`,
  `SAMMA_DEV_IDENTITY_ENABLED=false`. No public synthetic identity activation
  route, cookie, query parameter or UI was found.

## Database, secrets and checkpoints

- Pre-migration dump:
  `/srv/nuc-archive/juanity/backups/auth-v1/samma-before-auth.dump`.
  The same directory contains the pre-change Caddy checkpoint and the provider
  backup. No Caddy configuration changed during this handoff.
- Fresh application/provider dumps, container snapshot and proxy-network snapshot:
  `/srv/nuc-archive/juanity/backups/auth-handoff-20260905T151632Z/`.
  Both dump archives passed `pg_restore --list`; this is an on-host checkpoint,
  not an off-host backup or full restore rehearsal.
- Applied migration `0002_real_authentication_sessions` adds only AuthSession
  and AuthRateLimit. Existing domain models are preserved. Migration status,
  repository SQL checksums and Prisma live-schema **zero-diff passed**.
  No further migration was needed for this handoff.
- `/etc/samma-dev/` is `philip:philip`, mode 0700; web/provider configuration,
  subject manifest and owner bootstrap worksheet are mode 0600. Ignored
  `.env.nuc` remains mode 0600. No administrator credentials or owner worksheet
  are mounted into the web application.
- Known-secret scanning passed across the authentication commits, tracked files
  and deployed browser assets. No passwords, provider tokens or client secrets
  are persisted in SAMMA domain/session tables.
- `/etc/samma-dev/bootstrap-credentials.txt` remains host-only, owned by Philip,
  mode 0600. Keep it until both owners have completed their password changes and
  safely stored credentials/recovery information; then delete it. Do not paste
  passwords into chat or Git.

## Validation and remaining work

- Prisma generate/validate, migration status/zero-diff, **14 unit tests**,
  workspace typecheck, lint and production build passed in the isolated auth
  worktree with conservative container limits.
- Database integration passed stable identity, rejection of email-only linking,
  session expiry/revocation/suspension/unverified/unlinked cases, person/tenant
  isolation, role and membership revocation, Legal Access scope/expiry/revocation,
  definition-version integrity and denial of Governance as a private-record
  bypass. Storage isolation tests passed in the unit suite.
- Public Chromium checks passed at 1440×1000 and 390×844: protected-route login
  redirects, complete synthetic user OIDC login, provider email hint, secure
  cookie, normal-user Governance denial, unverified rejection, missing logout
  CSRF rejection, provider/local logout, back/reload and old-cookie replay.
- HTTP checks passed fixed client/callback/PKCE, rejection of OAuth parameter
  overrides and hostile Origin, and invalid callback/state rejection.
- Restarted both SAMMA databases, Keycloak and web. Before/after identity
  fingerprints matched; subsequent mobile login/logout passed. Unrelated
  container start times were unchanged.
- Sanitized evidence:
  `/srv/nuc-archive/juanity/validation/auth-handoff-20260905/`.
  Disposable provider/application test identities and their credential manifests
  were removed; only the two approved bootstrap owners remain from provisioning.
- Juanita must sign in at `https://samma.co.za`, replace her temporary password
  directly in Keycloak, and open Governance. Confirm both owners' credential
  storage/recovery checklist before deleting the worksheet. Owner bootstrap
  password tests can now be explicitly skipped so obsolete temporary passwords
  are never retried after an owner has changed them.

The Document Knowledge Engine, Person ↔ PersonCompanyRelationship ↔ Company,
Legal Access model and unrelated NUC services remain unchanged. Keep all records
synthetic until security hardening is complete.
