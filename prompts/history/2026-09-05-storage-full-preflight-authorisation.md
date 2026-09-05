# Storage full preflight and compensation authorisation

The owner authorises grouped non-destructive YELLOW/ORANGE changes, including
NOT_SCANNED_DEV, then implementation, CI, fast-forward push and DEV activation.
RED conditions still stop work.

## Verbatim request

```text
SAMMA — PERSISTENT DOCUMENT STORAGE V1
FULL PREFLIGHT + BLOCKER RESOLUTION PLAN

GOAL

Before implementing persistent document storage, perform a complete end-to-end preflight across the entire storage mission.

Do NOT stop at the first minor design gap.

Identify ALL likely blockers across:

- domain model
- scanner states
- persistence model
- Prisma/schema
- Garage deployment
- S3 adapter
- object keys
- upload/download routes
- health/readiness
- Docker networking
- USB persistence
- secrets
- resource limits
- tests
- CI
- auth regression
- Caddy exposure
- restart/persistence validation
- backup implications

Then classify each blocker and propose the smallest safe compensation.

Repository:

/opt/Juanita-Labour-Law

Current branch:

main

Current storage:

memory

Target:

private persistent S3-compatible storage using Garage for DEV

==================================================
OPERATING MODE
==================================================

This is NOT a start-stop implementation.

First perform FULL PREFLIGHT.

Then produce:

1. blockers found
2. risks
3. compensations
4. schema changes required
5. runtime changes required
6. security implications
7. whether each item can be safely authorised now

Do not make runtime/storage changes until the full preflight is complete.

Minor expected implementation gaps should be grouped and resolved together.

Only stop immediately for destructive/high-risk findings.

==================================================
PRE-AUTHORISED DESIGN CHANGE
==================================================

The current scanner/status model cannot honestly represent a DEV upload that has not been malware scanned.

You are authorised to extend the model with an explicit DEV-only state.

Preferred semantic concept:

NOT_SCANNED_DEV

Use the repository's naming conventions if an equivalent term is cleaner.

Requirements:

- scanner result can represent NOT_SCANNED_DEV
- persisted scan state can represent NOT_SCANNED_DEV
- this state must be distinct from CLEAN/ACCEPTED
- production/sensitive-data policy must never treat NOT_SCANNED_DEV as malware-clean
- only development runtime may accept this state
- production-like runtime must fail closed unless a real scanner result is CLEAN/ACCEPTED according to policy
- UI/metadata/audit must not claim the file was scanned clean
- add tests for DEV acceptance and non-DEV rejection

A Prisma migration is authorised if required solely for this explicit scan state.

Do not redesign unrelated document states.

==================================================
FULL PREFLIGHT AREAS
==================================================

1. STORAGE DOMAIN MODEL

Inspect:

- StorageProvider
- scanner interface
- scan result enum/types
- persisted RecordFile scan/storage state
- quarantine lifecycle
- accept/reject transitions
- delete/rollback semantics
- checksum fields
- metadata fields
- versioning semantics

Identify any state machine mismatch before implementation.

==================================================
2. PRISMA / DATABASE

Determine whether fields/enums already support:

- S3 object key
- bucket/provider reference
- checksum
- size
- MIME metadata
- scan status
- storage state
- immutable versions
- quarantine/accepted lifecycle

If changes are required:

list them ALL now.

Do not discover them one by one later.

Generate a proposed migration plan but do not apply yet during preflight.

==================================================
3. GARAGE COMPATIBILITY

Inspect exact stable Garage version intended.

Confirm before deployment:

- image supports amd64
- expected internal ports
- required config syntax
- single-node bootstrap process
- metadata/data paths
- S3 compatibility required by chosen SDK
- path-style support
- bucket creation procedure
- key creation procedure
- health/readiness method
- whether admin CLI requires a separate invocation
- whether image contains needed probe tools
- exact ownership/UID expectations for bind mounts

Identify all host preparation required.

==================================================
4. USB STORAGE

Verify:

- exact mountpoint
- filesystem UUID
- RW status
- free space
- metadata directory
- data directory
- staging directory if needed
- ownership requirements
- root fallback risk

Determine whether Compose can use:

bind:
  create_host_path: false

and whether all directories already exist intentionally.

If systemd/mount guards are not yet required for DEV activation, document the risk and minimum safe launcher check.

==================================================
5. S3 SDK

Inspect package compatibility with:

- Node 22
- Next.js runtime
- current TypeScript
- Garage S3 API
- streaming uploads
- streaming downloads
- path-style endpoints
- checksum handling
- abort/error behaviour

Select exact SDK/package.

Check for dependency/security audit implications BEFORE adding it.

If a candidate introduces high/critical findings, evaluate alternatives during preflight.

==================================================
6. CONFIG / SECRETS

Identify every required config value before implementation:

- storage driver
- endpoint
- region
- bucket
- access key
- secret
- path style
- optional request timeout
- upload size limit

Determine exact secret storage location.

Confirm:

- not in Git
- not browser-visible
- not logged
- safe Docker injection
- safe CI test substitutes

==================================================
7. OBJECT KEY DESIGN

Confirm opaque key strategy.

Define one stable format now.

Requirements:

- no names
- no email
- no company name
- no original filename
- no legal/employment metadata leakage
- immutable per version

Avoid later migration if possible.

==================================================
8. UPLOAD PIPELINE

Trace the entire current upload path.

Identify whether it currently:

- buffers entire file
- streams
- creates metadata before storage
- creates storage before metadata
- supports rollback
- supports quarantine
- handles duplicate checksum
- handles cancellation
- handles partial failure

List every implementation gap now.

==================================================
9. DOWNLOAD PIPELINE

Trace all document read/download routes.

Confirm:

- authentication
- authorisation
- RecordFile lookup
- storage fetch
- streaming
- Content-Disposition
- filename sanitisation
- MIME handling
- error handling

Identify any route that can bypass policy.

==================================================
10. MEMORY FALLBACK

Search for every place memory storage may be:

- default
- fallback
- implicit test adapter
- environment default

Plan exact changes so deployed runtime with:

SAMMA_STORAGE_DRIVER=s3

cannot silently fall back to memory.

Tests may keep explicit memory adapters.

==================================================
11. HEALTH / READINESS

Inspect current:

/api/health

Decide whether to add:

/api/ready

or equivalent.

Define now:

LIVENESS:
process running

READINESS:
database reachable
storage configured
bucket credentials valid
bucket reachable

Do not make every health request perform expensive storage I/O if a cached/bounded readiness strategy is better.

==================================================
12. AUTH REGRESSION RISK

Identify whether upload/download route changes touch:

- middleware
- OIDC session
- Account resolution
- Governance
- company roles
- Legal Access

Plan regression tests before coding.

==================================================
13. FILE SIZE / RESOURCE LIMITS

Choose conservative DEV limits now.

Inspect current request/body limits and Next.js constraints.

Determine:

- maximum upload size
- memory buffering risk
- streaming feasibility
- staging requirements
- timeout behaviour

Do not leave this implicit.

==================================================
14. GARAGE NETWORKING

Map exact Docker networks.

Expected:

SAMMA app:
- private SAMMA network
- existing Caddy proxy network if already required

PostgreSQL:
- private SAMMA network only

Garage:
- private SAMMA network only

Confirm no Garage port needs public exposure.

==================================================
15. GARAGE STARTUP / INITIALISATION

Define exact safe sequence:

- create data dirs
- start Garage
- initialise node/layout
- create bucket
- create app key
- assign bucket permissions
- persist configuration
- verify S3 operation

Determine which steps are:

- one-time
- repeatable/idempotent
- destructive if repeated

Document this before activation.

==================================================
16. BACKUP / RECOVERY IMPLICATION

Confirm what must be backed up for a recoverable DEV dataset.

At minimum:

- PostgreSQL
- Garage metadata
- Garage data
- deployment config
- object storage configuration
- non-secret manifest/checksums

Identify whether Garage offers a cleaner export than raw persistent-state backup.

Do not implement full automation yet.

==================================================
17. VERSIONING / REPLACEMENT

Trace existing Record/RecordFile versioning.

Confirm whether old object retention matches current document-history semantics.

Determine whether any deletion logic currently assumes mutable/in-memory storage.

==================================================
18. ORPHAN CLEANUP

Define failure cases:

A.
object write fails
-> no accepted DB metadata

B.
object succeeds
DB metadata fails
-> delete object or record orphan cleanup

C.
DB metadata succeeds
response fails
-> state remains valid

D.
download storage error
-> fail closed

E.
replacement upload fails
-> old version remains current

Identify whether cleanup requires a new background worker.

Prefer synchronous bounded compensation in V1 if safe.

Do NOT add Redis/worker just for this unless unavoidable.

==================================================
19. SCAN STATE

Implement approved preflight design:

NOT_SCANNED_DEV

Define exact transition table.

Example concept:

PENDING
  ↓
NOT_SCANNED_DEV   [DEV only]
  ↓
ACCEPTED

or if scan and storage state are separate:

scan:
PENDING
NOT_SCANNED_DEV
CLEAN
REJECTED

storage:
QUARANTINED
ACCEPTED
REJECTED

Prefer separating scan semantics from storage semantics if current model already distinguishes them.

Do not conflate malware state with storage acceptance.

==================================================
20. CI / AUDIT

Before adding dependencies:

determine whether:

- S3 SDK
- Garage tooling-related packages
- streaming helpers

introduce security findings.

Plan CI fixtures for S3 adapter without requiring a real Garage service in every unit-test job unless integration CI is intentionally added.

==================================================
21. TEST PLAN

Create the complete test matrix before implementation.

Must cover:

- S3 put
- S3 get
- S3 delete
- checksum
- opaque keys
- no filename leakage
- unauthorised read denied
- unauthorised upload denied
- missing config fails startup/readiness
- Garage unavailable
- no memory fallback
- NOT_SCANNED_DEV DEV accepted
- NOT_SCANNED_DEV non-DEV rejected
- DB failure cleanup
- replacement/new immutable key
- app restart persistence
- Garage restart persistence
- DB restart persistence

==================================================
22. RESOURCE CAPACITY

Estimate before starting Garage:

- expected image size
- root pull/unpack requirement
- Garage RAM
- total stack RAM
- USB write volume

Compare with current:

RAM
swap
root free
USB free

If deployment is likely safe, say so.

If close to threshold, propose a smaller safe limit rather than stopping immediately.

==================================================
23. USER-FACING UI IMPACT

Inspect whether current synthetic Add Record workflow can actually select/upload a file through the live authenticated UI.

If not, identify whether:

- backend storage can be completed first
or
- a minimal file input/upload route is required in the same mission

Avoid finishing S3 infrastructure with no usable application path if a small safe UI completion is required.

==================================================
24. DEPLOYMENT / ROLLBACK

Define rollback before deployment.

Must answer:

- how to return app to memory driver if new storage deployment fails
- whether migration is backward compatible
- how to preserve newly written Garage objects
- how to revert app SHA
- whether old app can run against new schema
- whether Garage can remain stopped safely

Prefer additive/backward-compatible migration.

==================================================
BLOCKER CLASSIFICATION
==================================================

Classify every finding as:

GREEN
No issue.

YELLOW
Known implementation work; safe to compensate in this mission.

ORANGE
Material design/runtime change requiring explicit documentation but authorised if non-destructive.

RED
Stop condition.

Only RED items should block implementation after this preflight.

Examples of RED:

- data-destroying migration
- public bucket required
- credentials must enter browser/Git
- USB mount cannot be reliably distinguished from root
- Garage incompatible with required S3 operations
- provider SDK introduces unresolved critical vulnerability
- domain model cannot enforce authorisation
- migration cannot be made backward-compatible
- host resource capacity genuinely unsafe

The already identified NOT_SCANNED_DEV model gap is YELLOW/ORANGE and is AUTHORISED.

==================================================
PREFLIGHT OUTPUT REQUIRED
==================================================

Before implementation, return:

STATUS:
READY / READY WITH COMPENSATIONS / BLOCKED

BLOCKER MATRIX

For each item:

- area
- finding
- GREEN/YELLOW/ORANGE/RED
- compensation
- code/schema/runtime impact

SCHEMA PLAN

- exact enum/field changes
- migration requirement
- backward compatibility

GARAGE PLAN

- version
- image
- ports
- data paths
- init steps
- bucket/key plan

S3 ADAPTER PLAN

- SDK
- config
- streaming strategy
- key strategy
- error/rollback strategy

SCAN PLAN

- exact states
- DEV policy
- production policy

TEST PLAN

- unit
- integration
- restart persistence
- auth negative tests

RESOURCE PLAN

- expected RAM
- root disk impact
- USB usage

DEPLOYMENT PLAN

- order
- rollback
- health/readiness

ONLY AFTER THIS FULL PREFLIGHT:

Proceed directly with implementation if there are no RED blockers.

Do not pause for individual YELLOW/ORANGE findings already covered by this authorisation.

==================================================
IMPLEMENTATION AUTHORITY
==================================================

If preflight result is:

READY
or
READY WITH COMPENSATIONS

then proceed through implementation, migration, Garage setup, validation, CI, push and DEV deployment WITHOUT requesting repeated approval for each minor blocker.

You are authorised to make the documented YELLOW/ORANGE compensations identified during preflight.

Still stop for newly discovered RED conditions.

==================================================
FINAL IMPLEMENTATION TARGET
==================================================

At completion:

SAMMA_STORAGE_DRIVER=s3

Garage persistent on USB.

Private bucket.

Opaque immutable object keys.

SHA-256 verified.

Real authenticated upload/download.

Unauthorised access denied.

Explicit NOT_SCANNED_DEV status for DEV.

No public S3 access.

No memory fallback.

Persistence survives:

- app restart
- Garage restart
- PostgreSQL restart

CI green.

Exact deployed SHA reported.
```
