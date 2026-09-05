# Persistent storage V1 — live result

2026-09-05 — **PASS: storage implementation, DEV deployment and automated
validation.** The optional fresh Phil login/Governance confirmation was not
received during this run; it is not reported as a new owner login test.
Real synthetic OIDC and Governance capability regression passed separately.

## Storage and adapter

- Garage **v2.3.0**, linux/amd64 image:
  `dxflrs/garage:v2.3.0@sha256:dac0c92add4f1a0b41035e94b41036a270ffbe88a37c7ac9c3f19e6dc5bdccf2`.
- Endpoint `http://juanity-storage:3900`; region `garage`; bucket
  `samma-dev-documents`; dedicated `samma-web-dev` key with **read/write only**.
- Private internal `juanity-dev` network only. **Public exposure: NO.** No
  published ports, browser S3 access, website, public console or admin HTTP API.
  Anonymous S3 object request returned **403**.
- USB root `/srv/nuc-archive/juanity/object-storage/`, with `metadata/`, `data/`
  and bounded web-only `staging/`. All are UID/GID 1000, mode 0700. UUID verified:
  `e3a99255-e95b-4ae3-b80b-40fd1afe274a`; RW ext4; no root-filesystem fallback.
- Provider-neutral `S3StorageProvider` uses exact `@aws-sdk/client-s3` 3.1127.0
  and `@smithy/node-http-handler` 4.12.1. No Garage API calls in domain services.
- `SAMMA_STORAGE_DRIVER=s3`; S3 endpoint/region/bucket/access key/secret/path style
  and request timeout use `SAMMA_S3_*`. Size/staging use `SAMMA_UPLOAD_*`;
  `SAMMA_SCAN_POLICY=not-scanned-dev`. Credentials remain outside Git in
  `/etc/samma-dev/storage.env` (0600); Garage RPC config in
  `/etc/samma-dev/garage.toml` (0600). Web never receives Garage RPC credentials.
- Opaque immutable version keys: `records/<UUID>/files/<UUID>`. No email,
  employee/company name, title or original filename in keys. No permanent URLs.
- SHA-256 is computed during streamed USB staging, verified by streamed S3
  quarantine readback, persisted in PostgreSQL, and checked on streamed download.
- Quarantine/accept/reject remains separate from malware outcome. Files accepted
  under explicit DEV policy retain **NOT_SCANNED_DEV** in metadata, UI and audit.
  Other environments reject unscanned acceptance. No malware scanner was added.
- Deployed memory fallback is disabled. Missing/invalid configuration fails
  readiness. Garage outage caused upload/download/readiness failure with `s3`
  still reported; service recovery restored file access.

## Database and failure behavior

**Schema changed: YES**, only additive enum migration
`0003_explicit_dev_scan_state`. All three migrations applied; live zero-diff
passed. No unrelated domain model or existing scan values were rewritten.

Existing RecordFile key, filename, MIME, size, SHA-256, acceptedAt, timestamps
and isCurrent fields were retained. Metadata/current-version and success audit
commit atomically. A real PostgreSQL transaction rollback removed the fresh S3
object and preserved the previous current version. Ambiguous successful commit
is checked before deletion; an unreachable DB preserves the object for manual
reconciliation. Storage failure audit and bounded synchronous cleanup require
no worker. Crashes may still require staging/orphan reconciliation.

Fresh private pre-migration dump and verified archive TOC:
`/srv/nuc-archive/juanity/backups/storage-v1-before-migration-20260905T175835Z/`.
The earlier baseline checkpoint and inventory remain under
`/srv/nuc-archive/juanity/backups/storage-v1-preflight-20260905T173053Z/`.
Dumps are 0600; this was checkpoint/TOC validation, not a restore drill.

## Live validation

| Check | Result |
| --- | --- |
| Real OIDC login → authenticated Add Record UI → private upload | PASS, public HTTPS and isolated candidate |
| PostgreSQL/S3 metadata, opaque key and source/download SHA-256 | PASS |
| Unauthenticated/outsider download | DENIED, 401/404 |
| Unauthorised/role-revoked upload and hostile Origin | DENIED, 403 |
| Legal Access view-only grant download | DENIED; explicit scoped canDownload granted access |
| Replacement/new key/old object retained/current file selected | PASS |
| Application restart → same current/previous downloads/checksum | PASS |
| Garage restart → same current/previous downloads/checksum | PASS |
| SAMMA PostgreSQL restart → metadata linkage/download/checksum | PASS |
| DB rollback and failed replacement | Fresh object cleaned; previous current preserved |
| Empty/unsupported/oversize/cancelled staging | Rejected and staged files cleaned |
| Garage unavailable | Upload/download/readiness 503; no memory fallback |
| Session verification/revocation/expiry, stable identity/no email merging | PASS |
| Person/tenant isolation, role revocation, Legal Access scope/expiry/revocation | PASS |
| Governance capability grant/revocation and no sensitive-record bypass | PASS with disposable synthetic actor |
| Logout CSRF, local/provider logout, replay denial, unverified login denial | PASS |
| Known runtime secrets in candidate Git files/browser static assets | None found |

After persistence validation, only the identified synthetic accounts, records,
objects, roles, relationship and provider users were cleaned up. No real
employment/legal files were used. No temporary Governance grant remains.

Public `/api/health` returns HTTP 200, labelled `liveness`, with `storage=s3`.
`/api/ready` returns HTTP 200 with database/storage true and provider s3. Readiness
checks bounded DB access and authenticated bucket access with a 5-second cache.
Landing and Keycloak discovery return HTTP 200.

## Resources and isolation

Observed after restart checks: web approximately **136 MiB**, SAMMA DB **22 MiB**,
Garage **2.8 MiB** under the small synthetic test load. Caps: 1 GiB / 512 MiB /
384 MiB respectively, with no additional swap. Host available RAM **8.5 GiB**;
swap about **3.9/4 GiB**, sampled swap-in/out zero; USB **186 GiB free**; root
**33 GiB free**. Sampled CPU idle 80%; load 2.41/2.71/2.59. No SAMMA OOM kill.
These are DEV observations, not a production capacity benchmark.

Exactly three core SAMMA services remain. The temporary candidate was removed.
Existing Keycloak/service DB configuration and stable Account identity were
retained; only disposable test identities were provisioned and removed.
Person ↔ PersonCompanyRelationship ↔ Company and Legal Access architecture were
preserved. No Caddy edits or unrelated service recreation; unrelated container
IDs matched the pre-cutover inventory. Three existing unrelated public sites
still returned 200.

## Validation, Git and deployment

- Application/storage commit: `234c9b7`.
- Garage deployment commit / deployed application build:
  **`f985cf5aab952d3c2fa59e9af2c8f797a207a24d`**.
- Fast-forward push to origin/main; no force push.
- npm ci, Prisma generate/validate/status/zero-diff, **58 unit tests**, typecheck,
  lint, production build and production audit gate passed.
- Audit uses only the existing exact, documented Prisma DEV exception. The S3
  candidate audit had zero findings; no new exception was added.
- [GitHub CI passed on the deployed SHA](https://github.com/Soundtrek/document-law/actions/runs/33983479980).
- Runtime Docker revision label matches the validated build SHA. Build ID,
  lockfile checksum and validation evidence are under
  `/srv/nuc-archive/juanity/validation/storage-private/`.
- A subsequent documentation-only commit records this report and removes stale
  memory-storage claims; it does not change or rebuild the deployed application.
- Previous artifacts are retained at `node_modules-before-storage-f985cf5` and
  `next-cache-before-storage-f985cf5` under the existing archive root. Private
  pre-cutover config/client checkpoint is in `backups/storage-v1-cutover-f985cf5`.

## Remaining work

Malware scanning; tested off-host backup/restore of **PostgreSQL plus Garage
metadata and blocks**; approved production provider/region and sensitive-data
controls. This persistent single-node DEV setup is not production-ready.

See [full preflight](PERSISTENT-STORAGE-V1-PLAN.md),
[runbook](PERSISTENT-STORAGE-V1-DEPLOYMENT.md) and
[storage architecture](STORAGE-ARCHITECTURE.md).
