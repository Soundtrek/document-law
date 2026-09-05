# Persistent storage V1 — full preflight and implementation plan

2026-09-05: **READY WITH COMPENSATIONS**. No RED blocker identified. This
supersedes the initial scan-only stop report. The owner's follow-up explicitly
authorises the grouped changes below and continuation without individual gates.
This report precedes application/schema changes and Garage activation.

## Complete blocker matrix

| Area | Finding / classification | Compensation and impact |
| --- | --- | --- |
| 1 Domain | ORANGE: binary scanner result; permissive object transitions | Extend scan result; permit only quarantine → accepted/rejected; separate storage state from scan outcome in code |
| 2 Database | ORANGE: no unscanned status; existing fields otherwise adequate | Add only ScanStatus.NOT_SCANNED_DEV. acceptedAt denotes committed acceptance; quarantine state stays in private storage metadata. No new table/field |
| 3 Garage | YELLOW: provider not installed; tags/ACL/bucket versioning unavailable | Pin v2.3.0 amd64; use core S3 Put/Head/Get/Copy/Delete, metadata rather than object tags; key-scoped bucket permissions; test real wire operations |
| 4 USB | GREEN mount identity; YELLOW missing directories | UUID e3a99255-e95b-4ae3-b80b-40fd1afe274a, ext4 RW. Intentionally create metadata/data/staging under existing juanity/object-storage; verify same mounted filesystem before every start |
| 5 SDK | GREEN candidate audit; YELLOW integration | @aws-sdk/client-s3 3.1127.0 and @smithy/node-http-handler 4.12.1; Node >=20/>=18 respectively; isolated 27-package production audit has zero vulnerabilities |
| 6 Secrets/config | YELLOW no S3 settings | Server-only strict parser; /etc/samma-dev/storage.env and garage.toml, mode 0600; app gets bucket key only, never RPC secret |
| 7 Keys | YELLOW safe characters are not random identity | Keep records/<random UUID>/files/<random UUID>; new file UUID every version; filenames remain DB-only |
| 8 Upload | ORANGE no HTTP persistence; buffered service; no compensation | Authenticated raw-body route; bounded USB staging with streaming hash; explicit scanner policy; storage then transactional metadata/audit; cleanup on failure |
| 9 Download | ORANGE absent; existing helper only enforces canView | Shared helper gains explicit download operation requiring Legal Access canDownload as well as scoped view. Authorise before storage; stream through SAMMA only |
| 10 Memory | YELLOW defaults in health, examples, both Compose files | No default in production runtime factory; missing/invalid driver fails readiness; explicit memory restricted to isolated test/dev use; deployed Compose requires s3 |
| 11 Health | YELLOW /api/health only echoes env | Label liveness; /api/ready checks SELECT 1 + HeadBucket with bounded timeout and short cache; no secret/raw errors |
| 12 Auth | GREEN reusable verified session and role boundaries; YELLOW new paths | Reuse sessions unchanged; same-origin/custom-header upload CSRF guard; test role revocation, legal view-only denial, Governance isolation and real OIDC regression |
| 13 Limits | ORANGE route has no existing size/body policy | Default 10 MiB, hard safety ceiling 25 MiB; max 2 concurrent uploads per process; 120-second intake; 10-second S3 operation; abort stream on timeout/cancel; no formData buffering |
| 14 Networks | GREEN existing internal juanity-dev | Garage joins juanity-dev only, no ports published. App retains caddy-net. DB unchanged. No Caddy edits |
| 15 Bootstrap | ORANGE one-time layout and credentials | Inspect before mutation; initialise layout version 1 only when unconfigured; create absent bucket/key only; never reset existing layout/key/data |
| 16 Recovery | ORANGE single-node USB not backup | PostgreSQL + Garage metadata/data + protected config/secrets + checksummed manifest. Quiesced capture or coordinated snapshots; blocks alone insufficient; off-host restore remains future work |
| 17 Versions | YELLOW schema supports files/isCurrent, no replacement workflow | Serialize replacement metadata transaction on Record; clear old isCurrent/set new atomically; old object retained. Definition/version/dates remain unchanged |
| 18 Orphans | ORANGE DB error only logs reconciliation | Synchronous bounded delete on definite rollback; preserve on ambiguous commit until DB reconciliation confirms absence; report cleanup failures without document content; no worker |
| 19 Scan | ORANGE explicitly authorised model extension | NOT_SCANNED_DEV remains stored after acceptance; never rewrite to CLEAN/ACCEPTED; runtime SAMMA_ENV=development + explicit DEV policy required |
| 20 CI | GREEN baseline e9109e0 CI success; YELLOW new deps/fixtures | Full lockfile audit under existing exact DEV Prisma exception; no new exception. Mock S3 transport in unit tests; real Garage integration on NUC; npm ci |
| 21 Tests | YELLOW existing 5 storage/intake tests insufficient | Full matrix below, including failures and revocation during upload |
| 22 Resources | YELLOW nearly full historical swap; sufficient RAM/disk | 8.5 GiB available RAM, 33 GiB root, 188 GiB USB. Sampled swap-out zero. Garage 384 MiB/0.5 CPU/no added swap; monitor before and after |
| 23 UI | ORANGE legacy /company/people/alex/add-record is deliberately 404 | Add real relationship route from company list, server-filtered definitions, minimal file/title form, record download/history/replacement. No synthetic identity bypass |
| 24 Rollback | ORANGE memory cannot read durable documents; old generated client lacks enum | Before writes, old app/memory configuration can be restored explicitly. After writes, preserve S3 and roll forward or keep file routes unavailable; never pretend memory restores files. Preserve DB/objects/migration |

## Schema and scan plan

Only proposed SQL:

```sql
ALTER TYPE "ScanStatus" ADD VALUE 'NOT_SCANNED_DEV';
```

No existing values/rows are rewritten. Existing key/checksum/size/MIME/filename,
acceptedAt and isCurrent fields suffice. A single configured bucket supplies the
provider reference; changing that bucket requires a deliberate data migration,
not merely editing environment variables. No public URL is stored.

| Scanner outcome | Policy | Object transition | Persisted file scanStatus |
| --- | --- | --- | --- |
| CLEAN | real scanner | QUARANTINED → ACCEPTED | ACCEPTED (existing legacy clean meaning) |
| NOT_SCANNED_DEV | development + explicit not-scanned-dev policy | QUARANTINED → ACCEPTED | NOT_SCANNED_DEV |
| NOT_SCANNED_DEV | all other modes | rejected/cleaned | no accepted file row |
| REJECTED / scanner error | every mode | rejected/cleaned | no accepted file row |

PENDING is retained for compatibility. Storage acceptance must not imply malware
cleanliness. NODE_ENV=production is Next's build/server mode, not permission to
use real sensitive data: this deployed DEV app explicitly uses SAMMA_ENV=development.
Unknown/production SAMMA_ENV rejects DEV scanner configuration and unscanned reads.

The enum addition is database-additive, but old generated Prisma clients cannot
safely decode its new value. Rollback after new writes must use an enum-aware
client or the previous app with affected file routes unavailable; never remove
the enum or rewrite unscanned files as clean. This is a documented application
compatibility constraint, not a destructive down migration.

## Garage and host plan

Pin `dxflrs/garage:v2.3.0@sha256:dac0c92add4f1a0b41035e94b41036a270ffbe88a37c7ac9c3f19e6dc5bdccf2`
(verified linux/amd64 manifest). Compressed layer 28,498,963 bytes; budget 200 MiB
root for pull/unpack. Source Dockerfile is FROM scratch and has `/garage` only,
no shell/curl/wget. Use exec-form `/garage status` probe; app's authenticated
HeadBucket verifies actual bucket readiness. No separate admin container needed:
`docker exec juanity-storage /garage ...` runs the same binary.

Override user to 1000:1000; owned 0700 persistence directories and 0600 config.
Container paths `/var/lib/garage/meta`, `/var/lib/garage/data`; host paths
`/srv/nuc-archive/juanity/object-storage/metadata`, `data`, `staging`. Staging
mounts into web only. All long-form binds use create_host_path:false, supported
by installed Compose v5.5.0. Launcher checks mount UUID, RW, device identity,
non-symlink paths and existing directories; no automatic mkdir on startup.
Manual restart policy avoids unattended root fallback. Mount loss while running
is still an operational risk: stop SAMMA file work on I/O errors; never remount
or repair the disk automatically. Systemd mount dependencies remain future work.

Use replication_factor=1, consistency_mode=consistent, db_engine=lmdb,
metadata_fsync=true, data_fsync=true, block_ram_buffer_max=32MiB. S3 binds 3900
on private network; RPC 3901 and optional admin 3903 bind loopback inside the
container; no website section/3902 listener. Endpoint
`http://juanity-storage:3900`, region `garage`, bucket `samma-dev-documents`.
No existing active Garage bucket/root was found to rename.

Initialise once: verify mount → create directories/config → start service →
inspect node/status → assign node zone nuc-dev/capacity 1G (single-node capacity
is informational) → apply layout version 1 → create absent bucket → create
samma-web-dev key with output captured privately → grant read/write only (no
owner/create-bucket permission) → persist app config → authenticated put/head/
get/copy/delete probe. Subsequent starts only verify these; do not replay bootstrap
blindly. Layout reset/key deletion/data deletion are not rollback steps.

## S3 adapter and route plan

Retain StorageProvider with streaming extensions; isolate AWS SDK in storage
package. Use Node Route Handlers, not Edge/Server Actions. Browser sends raw File
bytes plus bounded encoded metadata headers to same-origin SAMMA. Validate
session, company/relationship/current roles and definition before consuming body;
recheck access at commit to catch revocation. Stage through a counted stream on
USB with 0600 random files; calculate SHA-256, detect supported PDF/PNG/JPEG from
signature and safe text from bytes (never extension/browser MIME alone).
Reject unsupported/empty/oversized input; sanitise presentation filename. Expose
supported types in UI; no OCR, office parser or antivirus claim.

Use a bounded single PutObject stream with known length from staging, not
multipart; no lib-storage/parser dependency. AWS checksum defaults can produce
trailing encoding: explicitly use WHEN_REQUIRED and calculated checksum metadata,
then verify quarantined payload SHA-256 by streaming readback before acceptance.
SDK network requests have timeouts/abort; body streams must also be destroyed on
errors/cancel to free sockets. This conservative compatibility path avoids
assuming every provider implements optional checksum headers.

Object state is private S3 user metadata, not unsupported tags. Put rejects an
existing key; random server-generated UUIDs prevent reuse. Accept/reject uses
CopyObject with metadata replacement while quarantined; accepted payloads are
never updated. Replacement always allocates a new file key. No reliance on
bucket versioning or destination conditional-copy support. The provider owns
opaque keys; clients cannot supply them. Head/get verify metadata shape/state.
Download verifies persisted checksum/size against storage metadata and streams
with attachment disposition, nosniff and private no-store headers. Missing,
quarantined or rejected objects fail closed; midstream errors terminate response.

No global checksum deduplication: equal content can create distinct independent
versions/records with equal checksums and different keys, preventing cross-tenant
existence leaks. UI must not claim a failed response means no commit: if DB commit
succeeded but response failed, valid metadata/object remains. Definite DB rollback
triggers deletion; ambiguous commit first queries file ID before deciding.

Required server configuration: SAMMA_STORAGE_DRIVER, SAMMA_S3_ENDPOINT,
SAMMA_S3_REGION, SAMMA_S3_BUCKET, SAMMA_S3_ACCESS_KEY_ID,
SAMMA_S3_SECRET_ACCESS_KEY, SAMMA_S3_FORCE_PATH_STYLE,
SAMMA_S3_REQUEST_TIMEOUT_MS, SAMMA_UPLOAD_MAX_BYTES,
SAMMA_UPLOAD_STAGING_DIR, SAMMA_SCAN_POLICY. No NEXT_PUBLIC equivalents. CI uses
synthetic values/mocked transport; readiness is never executed during build.

## Full test and deployment plan

Unit tests: S3 put/get/delete/metadata and stream checksum; malformed states,
quarantine read denial, duplicate key, immutable replacement; missing/invalid
configuration and unknown driver, unavailable provider/no memory fallback;
DEV scan acceptance/non-DEV rejection, filename/header injection, unsupported
MIME/signature and empty/oversize/truncated stream; abort/timeout; synchronous
cleanup and cleanup-failure reporting; metadata/audit transaction behavior.

Integration: disposable Account/Person/company/relationship/version/role fixture;
actual authenticated upload/download through routes; readback SHA-256 in DB/S3/
response; denied unauthenticated/outsider/wrong-tenant, owner-without-role, revoked
role/membership, Legal Access view-only/expired/revoked/wrong scope, Governance
not a sensitive-record bypass. Test private-person isolation, definition-version
pinning, stable Account identity, and current version surviving failed replacement.
Test storage unavailable and DB-failure compensation. No real employment files.

Run npm ci, Prisma generate/validate, migration status and schema diff; unit and
security tests, typecheck, lint, production build, exact DEV audit gate. Use
isolated USB worktree/artifacts and resource-limited Node 22 tooling; never write
live Next cache during build. Apply reviewed additive migration after fresh
checkpoint. Validate candidate with live DB/isolated build, then fast-forward
push; GitHub CI must pass on exact commit before public web cutover. Start Garage
and check bucket before web gets S3 settings. Preserve old artifacts/config.

Liveness `/api/health` labels its limited purpose and actual configured driver;
readiness `/api/ready` uses bounded SELECT 1 + HeadBucket, caches briefly (5s),
returns generic 503 on failure. Docker web health uses readiness. Verify public
landing, both health concepts and real OIDC/login/logout/Governance regression.
Then restart only web, Garage, SAMMA DB individually and after each verify the
same file/metadata/checksum. Replace document and verify old object/history stays.
Final measure memory/CPU/swap/root/USB; compare unrelated service state/exposure.

Garage estimate 50–150 MiB idle (to measure), cap 384 MiB; core stack caps about
1.9 GiB including existing web/DB. Staging at most 20 MiB active under defaults;
clean on success/failure and remove stale task-owned staging files on controlled
startup. Crashes may leave staging/orphans requiring operator reconciliation;
no worker or infrastructure expansion. Benchmark before raising limits.

Recovery needs quiesced PostgreSQL and Garage metadata/data plus protected
configuration/key recovery. `garage meta snapshot` is a cleaner metadata snapshot
than copying a live DB file, but does not export blocks or a complete recovery
set. No full backup automation here. Single-node DEV remains synthetic-only.

## Primary sources checked

- [Garage v2.3.0 source Dockerfile](https://github.com/deuxfleurs-org/garage/blob/v2.3.0/Dockerfile)
- [Garage S3 compatibility](https://garagehq.deuxfleurs.fr/documentation/reference-manual/s3-compatibility/)
- [Garage configuration](https://garagehq.deuxfleurs.fr/documentation/reference-manual/configuration/)
- [Garage bootstrap](https://garagehq.deuxfleurs.fr/documentation/quick-start/)
- [Garage recovery source](https://github.com/deuxfleurs-org/garage/blob/v2.3.0/doc/book/operations/recovering.md)
- [AWS JS streaming behavior](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-s3.html)
- [AWS checksum configuration](https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html)
- [Next Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)

Registry metadata/isolated SDK audit were checked before dependency addition;
real S3 compatibility remains an integration gate, not a claim based only on docs.
