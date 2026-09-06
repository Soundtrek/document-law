# Temporary NUC DEV deployment

## Locked runtime map — 2026-09-06

| Branch | Runtime | Purpose |
| --- | --- | --- |
| `experiment/*` | `http://192.168.1.152:2022` | Preview only |
| `dev` | `https://dev.samma.co.za` | Full real DEV integration |
| `main` | `https://samma.co.za` | RC |

Do not deploy experiments to the DEV hostname or mix these runtimes.
See [dedicated DEV operations](DEV-RUNTIME.md). Earlier runtime descriptions
below are historical where they conflict with this map.

## Build identity for the next DEV / candidate deployment

Use the [build overlay procedure](BUILD-VERSION-OVERLAY.md) for new builds.
It embeds the clean candidate checkout's branch and SHA in both UI and health
metadata. A checkout switch or container-label edit cannot update that identity.
Build in an isolated worktree with `infrastructure/docker/build-candidate.sh`;
keep the resulting `.next` artifact together with its matching source/dependencies.
The live cache is never used for candidate builds. Promotion still requires the
normal `experiment/* → dev → main` review; this feature does not deploy itself.

## Current authentication deployment — 2026-09-05

Real Authentication V1 supersedes the synthetic runtime described in historical
sections below. The validated target runs `next start` with
`SAMMA_DEV_IDENTITY_ENABLED=false`, while retaining `SAMMA_ENV=development`
and the explicitly approved temporary MFA exception. See
[authentication implementation](REAL-AUTHENTICATION-V1.md).

Keycloak 26.7.3 (pinned image digest) and its dedicated PostgreSQL 17 database
are managed by `infrastructure/docker/keycloak-compose.sh`. The wrapper checks
the existing archive UUID and requires `/srv/nuc-archive/juanity/keycloak-postgres`.
Both services have manual startup, log rotation, CPU/memory limits and persistent
private DB storage. Keycloak is limited to 1 GiB/0.75 CPU; its DB to 384 MiB/0.5 CPU.
The provider service joins `caddy-net`; its DB joins only `samma-auth-private`.
Only loopback `127.0.0.1:2021` exposes administration to the host. There is no
published database port. Caddy publishes only SAMMA realm/resources over HTTPS;
master realm and admin paths are blocked. Trusted proxy address is the current
Caddy container `172.28.0.4/32`; revalidate it if the proxy network changes.

The canonical application uses `/etc/samma-dev/web.env` (0600), which excludes
owner and Keycloak administrator passwords. Keycloak service secrets live in
`/etc/samma-dev/keycloak.env` (0600). Never display `docker compose config` or
container environment output containing those values.

Before migration, a 0600 PostgreSQL custom-format checkpoint was created at
`/srv/nuc-archive/juanity/backups/auth-v1/samma-before-auth.dump` and its archive
TOC verified. Reviewed migration `0002_real_authentication_sessions` only creates
AuthSession/AuthRateLimit and their keys/indexes. It applied successfully with
zero live schema drift. A private Keycloak checkpoint is at
`/srv/nuc-archive/juanity/backups/auth-v1/keycloak-after-bootstrap.dump`; it contains
sensitive provider credential hashes and must be handled as secret backup data.
These on-host DEV checkpoints are not an off-host production backup strategy.

Caddy's disk configuration matched its loaded configuration before the change;
both were backed up under the same `auth-v1` directory. Only a new
`samma-auth.caddy` include was added; complete validation passed before reload.
No unrelated include or service was modified. HTTPS discovery has the expected
issuer and S256 PKCE support; public admin returns 404.

Validation passed: Prisma validation, 14 unit tests, typecheck, lint, production
build; real OIDC browser login/PKCE/state/nonce and secure cookie checks; normal
user Governance denial; temporary test capability grant then immediate
revocation; missing logout CSRF rejection; local/provider logout and old-cookie
replay rejection; unverified account rejection; exact client/callback and OAuth
parameter override rejection; invalid callback/state rejection. Database negative
tests cover person/tenant isolation, role/membership revocation, Legal Access
scope/expiry/revocation, stable identity, no email merging, definition versions,
session expiry/suspension/unverified/unlinked rejection, and Governance not being
a record bypass. Existing storage quarantine/key isolation tests also pass.

Keycloak and its database were restarted: owner subjects, verification and
mandatory password actions survived. Application restart retained the database
session and resolved the same Person. Real owner credentials were accepted by
Keycloak and stopped at the required password-change screen; owners must choose
and store final passwords before complete owner login/Governance validation.
Do not delete the bootstrap checklist or claim these human steps are complete.

The existing Prisma CLI dependency tree reports four high npm advisory findings
in `deepmerge-ts`, `mysql2` and their parent CLI packages. The authentication
change does not invoke those CLI paths in the web runtime. A forced Prisma
major downgrade/replacement was not applied; tooling remediation remains open.

Startup after reboot (archive must be mounted):

```sh
infrastructure/docker/keycloak-compose.sh up -d
infrastructure/docker/nuc-compose.sh up -d --no-deps --no-build web
```

Start the existing SAMMA DB first if it is not running. This remains DEV,
with no real sensitive documents, no SMTP recovery, no automatic public
onboarding and no production object-storage integration. Earlier deployment
sections below are historical and do not describe current authentication.

This deployment serves the existing synthetic UI at `https://samma.co.za`.
It is not a production deployment. UI forms currently demonstrate interactions;
they do not persist records. The separate Prisma integration check verifies the
repository's database boundary. Memory storage is intentionally nonpersistent.

## Runtime

- Checkout: `/opt/Juanita-Labour-Law`, branch `main`.
- Compose: `infrastructure/docker/compose.nuc.yml`, project `juanity-dev`.
- `juanity-app`: pinned official Node 22 Bookworm image (including OpenSSL) with the checkout mounted, running
  the repository's `next dev` command. No custom image build is required.
- `juanity-db`: pinned PostgreSQL 17 image, database `juanity_law`.
- Web publishes only `127.0.0.1:2020:3000` and joins `caddy-net` as `juanity-app`.
- PostgreSQL joins only the internal `juanity-dev` network, with no host port.
- Caddy proxies to `juanity-app:3000` through a separate `juanity.caddy` include.

The ignored `.env.nuc` file supplies a random development database password and
the pinned Node image reference. Keep its permissions at 0600. Do not copy it to
Git, logs or image layers. This development database user is scoped to the new
SAMMA instance; production role separation is outside this deployment.

## Resources and persistence

Web: 1 GiB / 0.75 CPU. PostgreSQL: 512 MiB / 0.5 CPU. Additional swap is disabled.
Each container has three 10 MB JSON log files. PostgreSQL data and Node/Next/npm
caches are under `/srv/nuc-archive/juanity`, with separate subdirectories.
Docker image storage remains in the existing Docker root.

Both services use `restart: "no"`. A daemon/host restart requires an explicit
SAMMA startup. Use `infrastructure/docker/nuc-compose.sh` for all operations;
it checks the archive UUID and required directories. Bind mounts disallow
automatic source-directory creation. Never recreate missing database directories
as an automatic recovery step. An absent USB disk must prevent startup.

After a host/daemon reboot, start from the checkout with:

```sh
infrastructure/docker/nuc-compose.sh up -d --no-build
infrastructure/docker/nuc-compose.sh ps
curl --fail http://127.0.0.1:2020/api/health
```

The checkout is writable by UID 1000 in this development container because
Next.js updates generated TypeScript configuration during development/builds.
No packages are installed automatically at web startup.

## Preparation and checks

After dependency installation has generated `package-lock.json`, subsequent
preparations use `npm ci`. Run tools through one-off web containers, not an
unbounded host build. Before starting, verify RAM/disk headroom and port 2020.

For preparation/validation only, set `SAMMA_WEB_MEMORY=2g`,
`SAMMA_WEB_CPUS=0.5`, and override
`NODE_OPTIONS=--max-old-space-size=1536` in the one-off container. Do not run the
web dev server concurrently with production build validation using the same
Next cache. Restore normal limits when starting the runtime.

The first migration is generated from the approved schema with Prisma's
`migrate diff --from-empty --to-schema prisma/schema.prisma --script` in the
database workspace. Apply with `prisma migrate deploy`; compare the live
datasource against the schema using `migrate diff --from-config-datasource
--to-schema prisma/schema.prisma --exit-code`. A successful empty diff exits 0.
Never substitute `db push` for migration history.

Run generation, schema validation, tests, typecheck, lint and the production
build. Then run `node_modules/.bin/tsx packages/database/verify-nuc.ts` in the
configured web environment. It writes synthetic Account/Identity/Person/Company/
Relationship/Record/Audit rows, reads them through a second Prisma client, then
removes only those rows. `/api/health` alone does not verify PostgreSQL.

Validate local routes before adding a Caddy include. Back up the existing proxy
configuration, compare on-disk and loaded configurations, validate the complete
Caddyfile, then reload the existing Caddy container without recreating it.
Check HTTPS and the certificate for `samma.co.za`, and compare existing site
responses before and after reload.

## Deployment validation — 2026-09-05

- Migration `0001_initial_schema` was generated from the unchanged approved
  Prisma schema and applied successfully. Live database/schema comparison
  returned no differences; migration status was up to date.
- Focused local migration commit: `279059d03cd45f25da4338bf2f74cc5500199dfe`.
  It contains only the migration SQL and migration lock file. No push was made.
- Prisma generation/validation, all 12 tests, typecheck, lint and the production
  build passed. Runtime uses the repository's development command.
- Both containers are healthy. The explicit Prisma integration check passed
  inside the running app container, including committed writes, independent
  client readback and cleanup of the synthetic test rows.
- Local HTTP 200: `/`, `/api/health`, `/sign-in`, `/person`, `/company`,
  `/company/people/alex`, `/company/people/alex/add-record`,
  `/company/people/alex/grant-legal-access`, `/company/team/invite`,
  `/legal-access`, `/governance`, `/records/record-payslip-2026-08` and
  `/records/record-proof-address`.
- Public HTTPS passed for `/`, `/api/health`, `/person`, `/company` and a
  JavaScript asset. Health reports `ok`, `development`, `memory`; this endpoint
  does not itself check the database.
- DNS A `105.233.36.146` matched the NUC's observed public address. Let's Encrypt
  issued a certificate for `samma.co.za` through TLS-ALPN validation. Certificate
  chain and hostname verification passed; expiry is 2026-12-04 10:46:38 UTC.
- Added `/home/philip/Projects/crewfinder-app/caddy-conf.d/juanity.caddy`.
  Main Caddyfile and existing includes were unchanged. Backup of those files
  and the active JSON is at
  `/srv/nuc-archive/juanity/backups/caddy-20260905T114030Z`.
- Complete Caddy validation passed. Configuration comparison confirmed only
  the new domain route and its automatic TLS/logging entries. Reloaded
  `crewfinder-app-caddy-1` without restarting or recreating it.
- Existing `app.crewfinder.co.za`, `calender-dev.soundtrek.co.za` and
  `celestine.soundtrek.co.za` returned HTTP 200 both before and after reload.
- Post-deployment snapshot: 15 GiB RAM total, 7.2 GiB available; swap 2.3/4.0 GiB
  used; root 28 GiB free; USB archive 192 GiB free. App and database limits remain
  1 GiB and 512 MiB respectively. Neither container reported an OOM kill.

The deployment configuration, lockfile, verification script, generated Next type
declarations and initial notes were preserved in checkpoint commit `d5ca5a6`
before the SAMMA rename. The ignored
`.env.nuc` is mode 0600. No unrelated service configuration, host firewall,
Apache configuration, DNS record or systemd unit was modified.

## Limitations

All data must be synthetic. In-memory documents disappear on process restart.
The current UI's successful render does not establish persisted form workflows,
real identity, production MFA or durable document storage. The attached USB SSD
is not an off-host backup. No additional services are part of this deployment.


## SAMMA branding and landing deployment

The current product is SAMMA — Employment Records & Document Management.
Runtime identifiers listed above are **LEGACY INTERNAL NAME — SAFE TO RENAME
LATER**; the rename does not recreate the database or change Caddy.

Phase A commit `d5b6673b745ab508c90002ad84d9b3a09a2f0477` updates product
strings, `@samma/*` workspaces, `SAMMA_*` configuration and current documentation.
The separate landing commit adds the public `/` email entry and retains all
existing application routes. Both phases pass tests, typecheck, lint and a
production build before deployment. The runtime remains the existing DEV server.

Coordinate the ignored environment keys (`SAMMA_DB_PASSWORD`, `SAMMA_NODE_IMAGE`)
with Compose and workspace symlinks when deploying this rename. Values and image
digests do not change. Stop only the app, fast-forward the canonical checkout,
update the keys and workspace links, preserve the old Next cache as a rollback
artifact, then start only web with `up -d --no-deps --no-build web`.
No migration command is part of this branding deployment.

Chromium checks of the production build passed at 1440×1000, 768×1024,
390×844 and 320×740. The card is 580px on desktop/tablet and fits mobile
without horizontal overflow. Empty/malformed emails show an accessible inline
error; keyboard submission reaches `/sign-in`, consumes the temporary email
handoff, and never claims to send email. Blocked browser storage also permits
the handoff. All existing synthetic routes and `/api/health` passed.

Screenshots, the executable browser check and detailed results are retained at
`/srv/nuc-archive/juanity/validation/samma-brand-landing`. The original deployment
validation above remains historical evidence.

DEV-mode browser validation additionally checks that JavaScript assets load
through the deployment origin. Next's development-origin allowlist is limited
to `samma.co.za` and `127.0.0.1`; no wildcard is enabled. The development badge
is disabled. The form also has a native validation/navigation fallback when
JavaScript is unavailable; its input has no submission name, preventing email
from appearing in a fallback GET URL.

## Real Authentication V1 public cutover result

For the subsequent validation, owner onboarding status, restart evidence and
handoff checkpoint, see [the authentication report](REAL-AUTHENTICATION-V1-REPORT.md).
The cutover observations below are historical; Phil has since completed his
password change and accessed Governance. Juanita's final login remains pending.

Application commit `8ed98f5` was fast-forwarded into the canonical `main` checkout
and deployed on 2026-09-05. Only `juanity-app` was stopped/recreated for the
production command/configuration change; the SAMMA DB was retained. Validated
worktree dependencies/build artifacts were copied into the existing archive
mount paths. Previous artifacts remain at
`/srv/nuc-archive/juanity/node_modules-before-real-auth` and
`/srv/nuc-archive/juanity/next-cache-before-real-auth`. The app was briefly
unavailable during cutover; the public landing then returned HTTPS 200.
Do not restore the old synthetic public runtime as an authentication rollback.

Live verification confirms `NODE_ENV=production`, `SAMMA_ENV=development`,
`SAMMA_DEV_IDENTITY_ENABLED=false`, `SAMMA_GOVERNANCE_MFA_REQUIRED=false`, and
no owner bootstrap file mounted inside web. The standard Keycloak and Node
images are used; no credentials were copied into an image. Web and both
PostgreSQL containers are healthy, and provider HTTPS discovery returns 200.

The browser suite was repeated against the actual public URLs without candidate
interception: verified test login and Person projection, protected-route
redirects, non-Governance denial, secure host cookie, missing logout CSRF
rejection, provider logout, old-cookie replay rejection, unverified rejection,
and both approved owners' mandatory password-change screens all passed. HTTP
checks for canonical client/redirect/PKCE, hostile Origin and invalid callback
also passed publicly. Full owner SAMMA/Governance login remains pending their
final password changes; successful temporary-password acceptance is not reported
as a completed owner login.

Temporary synthetic Keycloak users, matching SAMMA Accounts/Person/Identity/
session/capability test rows and private validation credential manifests were
removed after testing. The candidate container was stopped/removed. Only the
two approved initial Governance Owners remain from this provisioning.

Existing `app.crewfinder.co.za`, `calender-dev.soundtrek.co.za` and
`celestine.soundtrek.co.za` each returned 200 before and after the change.
Measured steady-state memory: web ~139 MiB, Keycloak ~451 MiB, Keycloak DB
~30 MiB, SAMMA DB ~29 MiB. Unrelated NUC workloads were not modified.

The 0600 `philip:philip` owner credential checklist remains present pending
confirmed final password-manager/recovery completion. No passwords or service
secrets were committed. Known-secret scanning covered Git candidate files and
browser static assets. The generated migration's trailing blank line was kept
unchanged to preserve its already-applied checksum; SQL semantics and live
schema drift checks passed.

## Persistent Storage V1 supersedes historical memory-storage sections

The storage implementation and activation runbook is now
[Persistent Storage V1](PERSISTENT-STORAGE-V1-DEPLOYMENT.md). It adds private Garage
on the verified USB archive, strict S3 runtime config, explicit NOT_SCANNED_DEV,
authenticated file routes and DB/storage readiness. Earlier descriptions of
memory storage and non-persisting forms are historical. See the storage report
for the exact validated/deployed SHA and observed cutover results; this runbook
alone is not evidence of successful deployment.
