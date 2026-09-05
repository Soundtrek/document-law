# Persistent storage V1 — DEV runbook

See [the complete preflight](PERSISTENT-STORAGE-V1-PLAN.md) for decisions,
compatibility evidence and the full test matrix. This remains synthetic-only DEV.

## Runtime and configuration

Core services are `juanity-app`, `juanity-db`, `juanity-storage`. The existing
Keycloak/provider DB stay separate and unchanged. Compose merges
`compose.nuc.yml` and `compose.garage.yml` via `nuc-compose.sh`. Garage is pinned:

`dxflrs/garage:v2.3.0@sha256:dac0c92add4f1a0b41035e94b41036a270ffbe88a37c7ac9c3f19e6dc5bdccf2`

It joins only the internal `juanity-dev` network. No published ports, public
console or website listener. S3 uses 3900 internally; RPC binds container
loopback 3901. There is no admin HTTP listener. Caddy does not proxy Garage.

- Endpoint: `http://juanity-storage:3900`; region: `garage`.
- Bucket: `samma-dev-documents`; dedicated key label: `samma-web-dev`.
- Host metadata: `/srv/nuc-archive/juanity/object-storage/metadata`.
- Host blocks: `/srv/nuc-archive/juanity/object-storage/data`.
- Host staging: `/srv/nuc-archive/juanity/object-storage/staging`.
- Private Garage config/RPC secret: `/etc/samma-dev/garage.toml`, 0600.
- Private application S3 config: `/etc/samma-dev/storage.env`, 0600.
- Existing auth config: `/etc/samma-dev/web.env`, 0600; contains no Garage RPC secret.
- Directory/config ownership: UID/GID 1000; object-storage directories 0700.

Never print Compose's expanded configuration, container environment, key-create
output or key-info output into reports. Garage key creation displays credentials;
capture it directly into an operator-only file and parse there. Web gets only
read/write on its bucket, no owner/create-bucket rights. Do not change bucket
configuration without migrating existing keys and database linkage.

## Mount guard and startup

The USB must be mounted at `/srv/nuc-archive`, UUID
`e3a99255-e95b-4ae3-b80b-40fd1afe274a`, RW and separate from `/`.
`check-storage-mount.sh` checks directory device identity, rejects symlinks and
requires at least 1 GiB free. No startup command creates persistence directories.
All long-form binds disable automatic path creation. Startup remains manual.

```sh
infrastructure/docker/check-storage-mount.sh
infrastructure/docker/nuc-compose.sh up -d --no-deps storage
# Verify status/layout and authenticated bucket readiness before switching web.
docker exec juanity-storage /garage status
infrastructure/docker/nuc-compose.sh up -d --no-deps --no-build web
curl --fail https://samma.co.za/api/ready
```

Start the existing SAMMA DB first if stopped. Do not start/recreate all host
services, remove unrelated orphans, prune Docker or change Caddy networks.

Initial bootstrap already applies a one-node `nuc-dev` layout version 1, bucket
and key. Do not rerun layout creation or replace credentials on restart. For a
fresh empty environment only: intentionally create guarded directories/config
from `garage.toml.example`; start Garage, inspect node ID, assign `-z nuc-dev -c
1G`, apply layout `--version 1`, create absent bucket/key and grant `--read
--write` only. Save config/secrets outside Git, then run
`infrastructure/storage/verify-s3.ts` in a configured Node 22 container. Do not
use reset/delete layout commands as recovery.

Garage memory 384 MiB/no additional swap, CPU 0.5, log rotation 3 × 10 MB,
read-only container root, all capabilities dropped. Web 1 GiB, DB 512 MiB.
Default file limit 10 MiB (configurable with a 25 MiB hard ceiling), two concurrent
uploads per process, bounded 120-second staging, 10-second S3 calls. Staging
cleanup occurs on normal success/failure/cancellation. After a process crash,
stop file intake and remove only stale `samma-upload-*` staging directories after
confirming no request owns them. Never clean Garage data with filesystem deletes.

## Validation and readiness

`/api/health` is labelled liveness. `/api/ready` checks a bounded DB query and
authenticated HeadBucket, briefly caches results (5 seconds) and returns generic
503 on failure; Docker web health uses readiness. File requests still perform
fresh resource and object checks. No secret or internal endpoint is returned.

Run npm ci, Prisma generate/validate/status/zero-diff, tests, typecheck, lint,
production build and `SAMMA_ENV=development npm run audit:production`. The exact
pre-existing Prisma advisory exception is unchanged. Unit tests fake S3 transport;
`verify-s3.ts` checks real Garage put/get/head/copy/delete and checksum. Other
`infrastructure/storage` scripts validate synthetic DB rollback and browser paths.
The browser harness supports an isolated candidate via SAMMA_CANDIDATE_URL;
PLAYWRIGHT_MODULE is operator tooling, not a production dependency.

The only schema migration is `0003_explicit_dev_scan_state`, adding enum value
NOT_SCANNED_DEV. Checkpoint before application, migrate deploy, then zero-diff.
Current file version is selected by RecordFile.isCurrent under a serialized
transaction; previous objects remain. Existing definitions/dates are unchanged.

## Cutover and rollback

Build in an isolated USB worktree with separate dependencies/Next cache. Pass only
synthetic auth inputs during build. Validate candidate, commit and push with no
force, wait for green GitHub CI on exact SHA, then fast-forward canonical main.
Preserve old dependency/cache directories before copying the validated artifacts
into the existing mounted locations. Stop only web during the artifact switch;
start Garage first, then restart only web with S3 environment. Check public
landing/readiness, OIDC/Governance and file download before declaring success.

Before any new files, restore the previous app/artifacts/config explicitly if
necessary. After files exist, preserve DB and Garage: memory cannot read those
objects. The previous app's file routes are unavailable and can serve as limited
UI rollback while storage remains preserved, or use an enum-aware corrective
build with S3. Old generated Prisma clients must not read NOT_SCANNED_DEV values.
Do not remove the enum, restore a stale DB over new uploads, or relabel files as
clean. Garage may remain stopped with data/config preserved; file readiness and
operations will fail until restarted. Prefer an enum-aware forward fix.

Restart only app, Garage and SAMMA PostgreSQL individually; after each, verify
same file download and SHA-256. Then replace a file and verify current/previous
history and key independence. Keep validation datasets synthetic and delete only
identified fixtures after verification.

## Recovery boundary

Minimum consistent recovery set: PostgreSQL dump; Garage metadata (including node
identity/layout) and blocks; deployment/adapter configuration; encrypted or
otherwise protected key/config recovery; non-secret manifest/checksums. Quiesce
writers for a coordinated checkpoint. `garage meta snapshot` can produce a
consistent metadata DB snapshot, but is not a complete export/backup.

On-host checkpoints are not off-host backup. Before sensitive production use,
implement malware scanning and tested off-host backup/restore, and approve the
production object-storage provider/region. No backup automation was added here.
