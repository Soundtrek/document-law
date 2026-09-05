# 2026-09-05 — Persistent document storage V1

## Result

BLOCKED at the explicit scan-model stop condition. Baseline and private database
checkpoint completed; no implementation or runtime changes. See
[preflight report](../../docs/PERSISTENT-STORAGE-V1-PREFLIGHT.md).

## Owner request (verbatim)

```text
SAMMA — PERSISTENT DOCUMENT STORAGE V1

GOAL

Replace SAMMA's development-only in-memory document storage with persistent private S3-compatible object storage.

Repository:

/opt/Juanita-Labour-Law

Remote:

Soundtrek/document-law

Current branch:

main

Current public app:

https://samma.co.za

Authentication:

REAL KEYCLOAK AUTHENTICATION LIVE

Current storage:

SAMMA_STORAGE_DRIVER=memory

Target storage:

Garage
single-node DEV
private S3-compatible object storage

This remains DEV and synthetic/non-sensitive data only.

==================================================
PHASE 0 — BASELINE / SAFETY
==================================================

Before changes:

- confirm clean repository
- fetch origin
- record current SHA
- record current Docker containers/networks
- record current SAMMA app/database health
- record disk/RAM/swap
- record USB archive mount identity and free space
- record current database fingerprint/migration status
- create a pre-change database checkpoint
- record current /api/health output

Do not modify unrelated NUC services.

No broad Docker prune.

==================================================
PHASE 1 — INSPECT EXISTING STORAGE ENGINE
==================================================

Inspect the existing provider-neutral storage boundary.

Identify:

- StorageProvider interface
- in-memory adapter
- quarantine API
- accept/reject lifecycle
- checksum handling
- RecordFile metadata
- object-key generation
- upload orchestration
- malware-scan interface
- audit integration
- tests
- environment/config parsing

The architecture already supports a storage provider boundary.

Do NOT redesign the document knowledge engine unless a real implementation gap is found.

Do NOT hardcode Garage-specific behaviour into domain services.

==================================================
PHASE 2 — TARGET ARCHITECTURE
==================================================

Use Garage as DEV S3-compatible object storage.

Runtime:

SAMMA app
+
PostgreSQL
+
Garage

Exactly three core SAMMA runtime services for this phase.

Do NOT add:

Redis
BullMQ
worker
ClamAV
MinIO
SeaweedFS
Moodle
mail server
management UI

==================================================
PHASE 3 — STORAGE LOCATION
==================================================

Persistent Garage data must live on the USB archive, not the root filesystem.

Use the established Juanity/SAMMA archive location unless current deployment has already adopted a canonical SAMMA path.

Preferred existing data root:

/srv/nuc-archive/juanity/object-storage/

with:

metadata/
data/

If a current SAMMA-specific path already exists and is documented, use that instead.

Do NOT silently create a second storage root.

Before starting Garage verify:

- /srv/nuc-archive is an actual mounted filesystem
- expected filesystem UUID
- read-write state
- sufficient free space
- target directories exist intentionally
- target directories are not root-filesystem fallbacks

Use long-form bind mounts with:

create_host_path: false

if supported by current Compose setup.

Do not let Compose auto-create missing persistence directories.

==================================================
PHASE 4 — GARAGE
==================================================

Deploy a stable pinned Garage release.

Use exact version and image digest.

Configuration:

- single node
- replication factor 1
- private only
- S3 API internal Docker network only
- no public browser endpoint
- no public storage console
- persist metadata
- persist data blocks
- enable metadata_fsync if supported/recommended
- enable data_fsync if supported/recommended
- website serving disabled

Do not expose Garage's S3 API directly on the public host unless a temporary localhost-only diagnostic port is truly needed.

Preferred app endpoint:

http://juanity-storage:3900

or stable service name chosen by the actual Compose project.

Keep Garage on SAMMA's private application network.

Do not put its internal admin/RPC ports onto the public Caddy network.

==================================================
PHASE 5 — BUCKET / KEY
==================================================

Create:

bucket:
juanity-dev-documents

or rename to a SAMMA equivalent only if doing so does not conflict with existing approved deployment docs.

Preferred public-facing/product terminology:

samma-dev-documents

But do NOT rename existing active storage identifiers merely for branding if they already exist.

Create a dedicated application S3 key.

The SAMMA web app gets only the permissions it actually requires for its bucket.

Do not reuse Garage administration credentials.

Keep:

- Garage admin credentials
- application S3 key
- secret key

outside Git.

Use /etc/samma-dev or current established SAMMA secret location.

Permissions:

0600 where appropriate.

Never print secrets in final reports.

==================================================
PHASE 6 — S3 ADAPTER
==================================================

Implement a production-compatible S3 storage adapter behind the existing StorageProvider interface.

Use a standard supported S3 SDK.

Configuration must be provider-neutral:

SAMMA_STORAGE_DRIVER=s3

SAMMA_S3_ENDPOINT
SAMMA_S3_REGION
SAMMA_S3_BUCKET
SAMMA_S3_ACCESS_KEY_ID
SAMMA_S3_SECRET_ACCESS_KEY
SAMMA_S3_FORCE_PATH_STYLE

or equivalent names consistent with current config design.

Do not use Garage-specific API calls in domain/application services.

The adapter should also be usable later with:

AWS S3
Cloudflare R2
Backblaze B2 S3
other compatible provider

subject to integration testing.

==================================================
PHASE 7 — OBJECT KEY POLICY
==================================================

Never use:

user email
company name
employee name
record title
original filename

as permanent object paths.

Generate opaque object keys.

Example conceptual shape:

records/<random-id>/<file-version-id>

or a completely opaque UUID-based key.

Original filename belongs in PostgreSQL metadata.

Object keys must not disclose personal/employment information.

Do not store permanent signed/public URLs in PostgreSQL.

Store:

object key
bucket/provider reference if needed
size
MIME/type metadata
SHA-256 checksum
storage state
timestamps

==================================================
PHASE 8 — QUARANTINE / ACCEPT FLOW
==================================================

Preserve the current intake contract:

authorisation
  ↓
quarantine
  ↓
validation
  ↓
scan
  ↓
storage acceptance
  ↓
metadata
  ↓
audit

For this phase ClamAV is NOT being added.

Therefore implement the existing scan boundary with an explicit DEV scan policy.

Do not pretend malware scanning occurred.

A clean pattern is:

scan_status = NOT_SCANNED_DEV

or repository-equivalent explicit state.

If the current model requires PASS/FAIL only and cannot represent unavailable scanning safely:

STOP and report the model gap before weakening semantics.

Do not silently mark uploads clean.

==================================================
PHASE 9 — UPLOAD VALIDATION
==================================================

Apply bounded validation before acceptance.

At minimum:

- authenticated actor
- authorised relationship/context
- non-zero size
- configured maximum file size
- filename metadata sanitisation
- content-type handling
- extension not treated as security proof
- SHA-256 calculation
- duplicate checksum handling according to existing design
- explicit storage state transitions

Do not rely only on browser MIME type.

Do not attempt full antivirus implementation in this phase.

==================================================
PHASE 10 — STREAMING
==================================================

Prefer streaming uploads through SAMMA.

Do not load whole large files into memory unnecessarily.

Browsers must upload/download through authenticated SAMMA routes.

Do not expose internal S3 object URLs to the browser.

If temporary filesystem staging is required:

- keep it bounded
- use USB-backed staging if available
- clean up on success/failure
- do not persist documents in app container filesystem

==================================================
PHASE 11 — DOWNLOAD / READ
==================================================

Every document read must flow through SAMMA authorisation.

Flow:

request file
  ↓
authenticate
  ↓
authorise current actor/context
  ↓
resolve RecordFile
  ↓
fetch private object
  ↓
stream response

Do not implement:

public bucket
public object URL
predictable direct download URL
client-side Garage credentials

Use safe Content-Disposition headers.

Original filename may be used for download presentation after sanitisation.

==================================================
PHASE 12 — RECORD VERSIONING
==================================================

Document versions must remain immutable objects.

When replacing/updating a record file:

create a new object key.

Do not overwrite the old object in-place if history/versioning expects immutability.

Database history determines which version is current.

Do not depend on S3 bucket versioning.

==================================================
PHASE 13 — FAILURE SEMANTICS
==================================================

Storage failures must fail closed.

If Garage is unavailable:

- upload fails clearly
- download fails clearly
- metadata must not claim successful acceptance if object write failed
- no fallback to local memory storage
- no fallback to app filesystem

If PostgreSQL write fails after object acceptance:

use existing compensating cleanup strategy if available.

If none exists:

implement the smallest safe rollback/cleanup behaviour and test it.

Avoid orphaned objects where practical.

==================================================
PHASE 14 — STARTUP / HEALTH
==================================================

Update health/readiness semantics.

Current /api/health should not falsely claim full readiness merely because the process is running.

Prefer separate concepts if appropriate:

liveness:
process is alive

readiness:
database reachable
storage provider configured
bucket access succeeds

Do not expose secrets in health payloads.

At minimum confirm application can authenticate to the configured bucket during readiness/integration tests.

==================================================
PHASE 15 — DATABASE
==================================================

Inspect whether the current RecordFile/storage schema already contains all fields required.

If yes:

NO MIGRATION.

If a migration is genuinely required:

- keep it storage-specific
- review SQL
- create database backup/checkpoint
- apply through controlled migration process
- zero-diff afterwards

Do not redesign unrelated models.

==================================================
PHASE 16 — EXISTING MEMORY DRIVER
==================================================

Keep memory storage adapter for automated tests and isolated unit tests if useful.

But public deployed SAMMA runtime must use:

SAMMA_STORAGE_DRIVER=s3

Memory storage must not be an automatic fallback.

If S3 config is missing in deployed runtime:

fail startup/readiness rather than silently switching to memory.

==================================================
PHASE 17 — TESTS
==================================================

Add focused tests for:

- S3 adapter put/get/delete
- opaque object keys
- checksum persistence
- authorisation before download
- unauthorised read denied
- upload failure does not create accepted metadata
- DB failure/object cleanup path
- replacement creates new immutable object
- S3 unavailable -> no memory fallback
- invalid/missing S3 configuration fails closed

Use disposable/synthetic test fixtures only.

==================================================
PHASE 18 — INTEGRATION VALIDATION
==================================================

On the NUC with Garage running:

Create synthetic test actor/company/relationship.

Upload a synthetic file.

Validate:

1. SAMMA authorises upload
2. object appears in Garage
3. PostgreSQL RecordFile metadata created
4. SHA-256 matches source
5. opaque key contains no personal filename/email/company data
6. authorised user can download
7. downloaded SHA-256 matches original
8. unauthorised user denied
9. app restart
10. file still downloads
11. Garage restart
12. file still downloads
13. PostgreSQL restart
14. metadata linkage survives

Then replace/version the synthetic document.

Confirm:

- new object key
- old object remains according to record history policy
- current version resolves correctly

Delete/reject only according to existing record policy.

==================================================
PHASE 19 — BACKUP NOTE
==================================================

Do not build full backup automation in this task.

But document the minimum recovery requirement:

A SAMMA recovery set must include BOTH:

- PostgreSQL
- Garage metadata + object data

Copying Garage object blocks alone is insufficient.

Do not call DEV storage production-ready until off-host backup/restore is implemented and tested.

==================================================
PHASE 20 — RESOURCE VALIDATION
==================================================

After Garage starts, measure:

- Garage RSS/memory
- app RSS
- PostgreSQL RSS
- host available RAM
- swap
- CPU idle/load
- USB free space
- root free space

If Garage materially destabilises the NUC:

STOP and report.

Do not add more infrastructure.

==================================================
PHASE 21 — DOCUMENTATION
==================================================

Update:

docs/STORAGE-ARCHITECTURE.md
README
deployment docs
.env.example
decision log

Document:

- Garage selected for current DEV S3 implementation
- provider-neutral adapter retained
- production provider is not fixed to Garage
- private objects only
- opaque keys
- checksum metadata
- streaming through SAMMA
- DEV scan policy
- no public bucket access
- memory driver remains test-only
- persistent storage still not approved for sensitive production data
- backup/restore remains required before production

No secrets in docs.

==================================================
PHASE 22 — COMMIT / CI
==================================================

Use focused commits.

Suggested split:

feat: add persistent S3 document storage

and, if needed separately:

chore: add Garage DEV deployment

Run full validation:

npm ci
prisma generate
prisma validate
migration status
zero-diff
tests
typecheck
lint
production build
production audit gate

Push only fast-forward safe.

No force push.

GitHub CI must pass.

==================================================
PHASE 23 — DEPLOY
==================================================

Deploy only the exact validated SHA.

Update SAMMA runtime:

SAMMA_STORAGE_DRIVER=s3

plus secure S3 config.

Do not expose credentials.

Bring Garage up first and verify it.

Then restart/deploy SAMMA web.

Verify:

https://samma.co.za
https://samma.co.za/api/health

and the real auth flow remains working.

==================================================
PHASE 24 — FINAL LIVE VALIDATION
==================================================

Confirm:

Phil login -> PASS

Governance -> PASS

Synthetic document upload -> PASS

Synthetic document persistence after app restart -> PASS

Synthetic document download -> PASS

Unauthorised download -> DENIED

Storage provider reported as:

s3

not:

memory

No public Garage endpoint exposed.

No real employment/legal files used.

==================================================
STOP CONDITIONS
==================================================

STOP rather than improvise if:

- USB mount identity cannot be verified
- Garage persistence path could fall back to root filesystem
- S3 credentials would need to enter Git
- existing StorageProvider interface cannot represent safe scan state
- object writes require public bucket access
- browser must receive S3 credentials
- schema change unexpectedly affects unrelated document/domain models
- Garage materially destabilises NUC resources
- no safe way exists to prevent memory fallback
- CI/security gate fails
- auth regresses
- unrelated NUC services would be affected

==================================================
FINAL REPORT
==================================================

STATUS: PASS / PARTIAL / BLOCKED

STORAGE
- provider/version
- image digest
- endpoint
- bucket
- persistence paths
- public exposure: YES/NO

SAMMA ADAPTER
- StorageProvider implementation
- config keys
- object key policy
- checksum
- quarantine/accept behaviour
- scan state

DATABASE
- schema changed: YES/NO
- migration
- zero-diff
- RecordFile metadata

SECURITY
- private bucket
- browser S3 access: YES/NO
- unauthorised download result
- memory fallback disabled
- secrets locations/permissions

PERSISTENCE TEST
- upload
- download
- app restart
- Garage restart
- PostgreSQL restart
- checksum verification
- version replacement

HEALTH
- readiness DB
- readiness storage
- /api/health

RESOURCES
- app memory
- db memory
- Garage memory
- host RAM
- swap
- USB free
- root free

CI
- tests
- typecheck
- lint
- build
- audit gate
- workflow result

GIT
- commits
- pushed SHA
- deployed SHA
- working tree

UNTOUCHED
- auth/Keycloak
- Person ↔ PersonCompanyRelationship ↔ Company
- Legal Access architecture
- unrelated NUC services

FOLLOW-UP
- malware scanning
- off-host backup/restore
- production object-storage decision
```
