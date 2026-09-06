# Dedicated public DEV runtime

The locked map is `experiment/*` → `http://192.168.1.152:2022` (preview),
`dev` → `https://dev.samma.co.za` (real DEV integration), and
`main` → `https://samma.co.za` (RC). All host data remains synthetic DEV.

`compose.dev-runtime.yml` manages only `samma-dev-web`, on
`127.0.0.1:2023:3000`. It joins existing `juanity-dev` and `caddy-net` networks,
sharing PostgreSQL, Garage and Keycloak without managing their lifecycle.
Limits: 1 GiB RAM, no additional swap, 0.75 CPU, bounded logs, manual startup.
The existing archive mount checks must pass. The logout release requires the
additive `0004_session_logout_hint` migration before deploying its web build.

## Accepted release — 2026-09-06

DEV runs the focused logout/account-switching fix
`00afd5ae741eeebc801e26532b7fa5ed409d8720`, with overlay `DEV / dev / 00afd5a`.
Real HTTPS company owner → person → company owner switching passed in one
retained Chromium browser context, with automatic Keycloak logout, old-cookie
replay denial and CSRF checks. See [logout acceptance](LOGOUT-ACCOUNT-SWITCHING-REPORT.md).
Phil's named-account Chrome confirmation is pending. Older sessions may require
Keycloak confirmation once because they predate ID-token retention.

The nullable session logout-hint migration is applied; Keycloak client/realm
settings did not change. DEV health/readiness are healthy. Main/RC remains
`0bc1660f03b8380aedcf24a44881f4196e5eb4de`, with RC and experiment container IDs
and start times unchanged. Later acceptance/test/documentation commits do not
change the deployed build. No main promotion is included.

Earlier [Company onboarding acceptance](COMPANY-ONBOARDING-COMPLETION-FIX.md)
and [registration acceptance](AUTH-REGISTRATION-V1-REPORT.md) remain historical evidence.

## Build and start

1. Verify a clean `dev` matching `origin/dev`, host resources and free port 2023.
   Capture RC and experiment container IDs/start times/health before changes.
2. Commit approved scaffold/docs on `dev`. Create an isolated clone of that exact
   commit on branch `dev` under `/srv/nuc-archive/juanity/dev-releases/<SHA>`.
   Do not use or symlink RC/experiment `node_modules` or `.next` directories.
3. Run `infrastructure/docker/build-candidate.sh` from the clone with the approved
   digest-pinned `SAMMA_NODE_IMAGE`. This bounded production build embeds
   `SAMMA_SHOW_BUILD_OVERLAY=true`, channel/branch `dev`, and the exact source SHA.
   Synthetic build placeholders are replaced by runtime configuration; canonical
   auth URLs are read at request time. Keep release source and artifacts together.
4. Provision operator-owned 0600 `/etc/samma-dev/dev-runtime.env` with
   `SAMMA_NODE_IMAGE`, `SAMMA_DB_PASSWORD`, `SAMMA_DEPLOYED_SHA` and
   `SAMMA_DEV_RELEASE_DIR`. Keep secrets out of Git and command output.
   `/etc/samma-dev/dev-web.env` carries the existing DEV OIDC settings and a
   separate random `AUTH_SECRET`; set `SAMMA_BASE_URL=https://dev.samma.co.za`.
   Compose also fixes that canonical URL and disables synthetic identity bypass.
   Existing `/etc/samma-dev/storage.env` supplies the private storage adapter.
5. Run `infrastructure/docker/dev-runtime-compose.sh up -d --no-deps --no-build web`.
   The wrapper refuses non-dev, dirty, mismatched or missing release artifacts.
   Release source is mounted read-only; upload staging remains writable.
6. Verify loopback health/readiness and exact compiled build identity before
   publishing. Do not infer identity from container labels alone.

## Identity and proxy

Keep the existing confidential `samma-web` client, issuer, S256 PKCE and disabled
implicit/direct grants. Preserve RC settings, adding only these explicit values:

- Callback: `https://dev.samma.co.za/api/auth/callback/keycloak`.
- Post-logout redirect: `https://dev.samma.co.za/`.
- Web origin: `https://dev.samma.co.za`.

No wildcard URLs. `__Host-samma.session-token` remains Secure, HttpOnly, Lax,
path `/`, with no Domain attribute. Auth state and callback URLs use the DEV
origin. Browsers do not send DEV cookies to RC. The shared provider may retain
its normal SSO behavior; the shared synthetic database is not an independent
security boundary against manually copied bearer tokens.

Back up Caddy's on-disk and loaded config plus the Keycloak client representation
in a private operator directory before modifying either. Confirm Caddy disk and
loaded configuration agree. Install `samma-dev.caddy` in the existing include
directory, mapping only `dev.samma.co.za` to `samma-dev-web:3000`. Validate the
complete configuration before reloading Caddy; compare all unrelated routes
with the baseline. Do not recreate the proxy or restart RC/experiment services.

## Focused acceptance and rollback

Verify public `/`, `/api/health` and `/api/ready` return 200, and the visible
badge says `DEV`, `dev`, exact short SHA. Use a disposable synthetic identity for
one actual HTTPS Keycloak login, callback to DEV, authenticated Person page and
logout back to DEV. Check host-only cookies are absent on RC, missing CSRF and
cross-origin requests fail, unauthenticated Person/Governance access is denied,
and a revoked session cannot be replayed. Remove only disposable test identities.
No broad regression suite is required for this runtime-only change.

Recheck RC/experiment health, identity, container ID/start time, and unchanged
local/remote `main`. Keep validation evidence in the private deployment backup.
To roll back, stop only DEV web, remove only the new DEV Caddy include and validate
before reloading. Restore only the client callback/origin/logout fields added
here after checking for concurrent edits. Keep database/storage data intact.
For subsequent DEV releases, build a new clean exact-dev directory, update the
private release path/SHA, and recreate only DEV web after focused validation.
