# Persistent document storage V1 — preflight

2026-09-05 — **Historical STATUS: BLOCKED** at the owner's original scan-model stop condition.

The owner subsequently authorised the explicit DEV scan extension and all
grouped non-destructive compensations. See [the full preflight and continuation
plan](PERSISTENT-STORAGE-V1-PLAN.md); this initial stop report is historical.

## Blocking evidence

- `packages/application/src/index.ts`: `UploadScanner.scan()` returns only
  `CLEAN | REJECTED`. Intake rejects every result other than `CLEAN`.
- `AllowAllSyntheticScanner` returns `CLEAN` without scanning. Reusing this for
  persistent DEV uploads would misrepresent the required scan policy.
- `packages/domain/src/model.ts` and `packages/database/prisma/schema.prisma`:
  `ScanStatus` has only `PENDING | ACCEPTED | REJECTED`. Intake writes `ACCEPTED`
  after the clean result. There is no explicit accepted-but-unscanned DEV state.
- The storage interface itself supports quarantine/accept/reject, but the
  end-to-end scanner and persisted model cannot represent `NOT_SCANNED_DEV`.

Phase 8 says: “If the current model requires PASS/FAIL only and cannot represent
unavailable scanning safely: STOP and report the model gap before weakening
semantics.” No scanner bypass, enum change or migration was implemented.

Proposed continuation, requiring resolution of this stop condition: add an
explicit `NOT_SCANNED_DEV` scanner result and persisted scan status with a small
storage-specific enum migration, and permit it only under explicit DEV policy.
Keep actual clean/rejected outcomes distinct and reject unscanned acceptance
outside that policy. Preserve historical statuses. Test these negative cases
before implementing and deploying the S3 adapter. This proposal is not an
accepted additional decision or an implemented migration.

## Baseline and checkpoint

- Clean `main` at `e9109e0a2964a14d66468bb5180d87c71bd12e1b`; fetched origin,
  which matched the local branch.
- Container/network inventory, database system identity and migration checksums,
  health, disk, RAM/swap and load captured privately under
  `/srv/nuc-archive/juanity/backups/storage-v1-preflight-20260905T173053Z`.
- Database checkpoint: `samma-before-storage.dump` in that directory, 64,960
  bytes, mode 0600; directory mode 0700. `pg_restore --list` succeeded and a
  SHA-256 file was recorded. This verifies the archive TOC, not a restore drill.
- Actual archive mount: `/dev/sda1`, ext4, read-write, UUID
  `e3a99255-e95b-4ae3-b80b-40fd1afe274a`, matching `nuc-compose.sh`.
- Preferred `/srv/nuc-archive/juanity/object-storage` does not yet exist. No
  second storage root or persistence directories were created.
- Both existing migrations are applied; Prisma migration status is up to date;
  live schema diff exits 0 with “No difference detected.” No schema change.

## Existing engine inspection

`InMemoryStorageProvider` implements put-quarantined, accept, reject,
read-accepted, metadata and delete; SHA-256 is calculated from bytes. Keys use
`records/<technical-id>/files/<technical-id>`. The current safe-character check
does not itself guarantee random IDs; deployed integration will need opaque ID
generation. RecordFile already stores key, filename, type, size, checksum,
scan status, current-version flag and creation/acceptance timestamps.

Intake checks relationship/company/functional role before storage, then
quarantines, scans, accepts, writes metadata and records activity. Metadata-write
failure currently records reconciliation activity but does not delete the
accepted object. Existing tests cover role denial, scan rejection, opaque-key
format and quarantine read denial. Upload/read interfaces currently buffer
`Uint8Array`; streaming is not implemented. The add-record form explicitly
reports a UI proof and does not persist uploads. These remain implementation
work after the scan-model blocker is resolved; selecting S3 alone is insufficient.

## Requested final-report status

| Area | Observed result |
| --- | --- |
| Storage | Current `memory`; Garage version/digest/endpoint/bucket not selected or deployed; no Garage public endpoint |
| Adapter | Existing memory implementation only; no S3 config or DEV scan policy introduced |
| Database | Unchanged; 2 applied migrations; zero drift; no new RecordFile rows |
| Security | No S3 credentials created or browser S3 access introduced; existing `/etc/samma-dev/web.env` and `.env.nuc` are 0600; S3 failure/no-fallback tests pending |
| Persistence tests | Upload/download, unauthorised download, all restart tests, checksum round trip and version replacement not run |
| Health | Public `/api/health` returns HTTP 200 with `status=ok`, `service=samma-web`, `mode=development`, `storage=memory`; it does not check DB or storage readiness |
| Database reachability | Confirmed independently through live SQL and Prisma checks |
| Resources | App approximately 149 MiB; DB approximately 21 MiB; no Garage; host available RAM 8.6 GiB; swap nearly full (49 MiB free of 4 GiB); USB 188 GiB free; root 33 GiB free; load 1.45/1.60/1.78 |
| CI | No implementation; npm ci, generation, tests, typecheck, lint, build, audit gate and GitHub workflow not rerun for this preflight |
| Git | No implementation commit, push or deployment; only preflight report, prompt capture and decision-log additions |
| Live auth | Not modified or retested; prior Phil/Governance validation is not claimed as a new storage validation |

No containers were started, stopped or restarted. Authentication/Keycloak,
Person ↔ PersonCompanyRelationship ↔ Company, Legal Access, Caddy and unrelated
NUC services were untouched. No document fixtures or real employment/legal
files were uploaded. The private checkpoint necessarily contains existing
application database state and must remain protected.

On continuation, recheck resources, especially swap activity, before provisioning.
Garage is the requested DEV provider; production provider selection remains open.
Recovery must include PostgreSQL **and Garage metadata plus object data**; blocks
alone are insufficient. Malware scanning and tested off-host backup/restore
remain required follow-ups before sensitive production use.
