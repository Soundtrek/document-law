# Temporary NUC DEV deployment

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
Juanity instance; production role separation is outside this deployment.

## Resources and persistence

Web: 1 GiB / 0.75 CPU. PostgreSQL: 512 MiB / 0.5 CPU. Additional swap is disabled.
Each container has three 10 MB JSON log files. PostgreSQL data and Node/Next/npm
caches are under `/srv/nuc-archive/juanity`, with separate subdirectories.
Docker image storage remains in the existing Docker root.

Both services use `restart: "no"`. A daemon/host restart requires an explicit
Juanity startup. Use `infrastructure/docker/nuc-compose.sh` for all operations;
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

For preparation/validation only, set `JUANITY_WEB_MEMORY=2g`,
`JUANITY_WEB_CPUS=0.5`, and override
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

Deployment configuration, lockfile, verification script, generated Next type
declarations and these notes remain local uncommitted changes. The ignored
`.env.nuc` is mode 0600. No unrelated service configuration, host firewall,
Apache configuration, DNS record or systemd unit was modified.

## Limitations

All data must be synthetic. In-memory documents disappear on process restart.
The current UI's successful render does not establish persisted form workflows,
real identity, production MFA or durable document storage. The attached USB SSD
is not an off-host backup. No additional services are part of this deployment.
