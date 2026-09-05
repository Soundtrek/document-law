# Storage Architecture

## Decision

SAMMA separates **document knowledge** from **document binaries**.

```text
PostgreSQL
├── Accounts / People / Companies
├── Relationships
├── Record definitions and versions
├── Record metadata
├── permissions / role policy
├── retention and review dates
├── legal access grants
├── activity / audit
└── RecordFile storage references / checksums

Private S3-compatible object storage
└── binary files only
    ├── PDFs
    ├── payslips
    ├── contracts
    ├── certificates
    ├── identity/supporting documents
    └── other uploaded/generated files
```

Binary document content is **not stored in PostgreSQL by default**.

## Provider-neutral boundary

Application/domain code talks to a `StorageProvider` interface.

```text
Document Knowledge Engine
        ↓
StorageProvider
        ↓
S3-compatible adapter
        ↓
Private object storage
```

The engine must not depend on provider-specific bucket URLs, filesystem paths or vendor-specific object semantics.

This keeps SAMMA free to change physical storage provider/location later without redesigning the record engine.

## Separate from the application host

### Development

Before the dedicated Law VM, tests may use an in-memory or development filesystem adapter behind the same interface.

On the dedicated Law development VM, use an S3-compatible development object store so the real API boundary can be tested together with upload validation and malware scanning.

### Production

Production document storage should be **independent of the application VM** and recoverable from a separate failure domain.

Losing the application VM must not imply losing the document repository.

A future production provider may be managed S3-compatible storage or separately hosted S3-compatible infrastructure. Provider and region are later approval decisions based on privacy/POPIA requirements, resilience, encryption, backup, cost and operations.

## Private-by-default storage

Buckets/containers are private.

SAMMA authorisation happens before object access:

```text
User requests file
      ↓
SAMMA resolves actor and context
      ↓
Company / Person / Relationship / LegalAccessGrant
      ↓
Record definition + role/access policy
      ↓
ALLOW / DENY
      ↓
Short-lived authorised object access if allowed
```

Do not use permanent public object URLs as document sharing.

A storage object key, bucket path or signed URL possession is never a substitute for SAMMA authorisation.

Signed URLs, where used, must be short-lived and issued only after a current server-side authorisation decision.

## Opaque object keys

Object keys must not reveal sensitive business or personal information.

Do not use paths such as:

```text
/acme/phil-venter/disciplinary-warning.pdf
```

Prefer opaque identifiers, for example:

```text
records/<record-id>/files/<file-id>
```

The PostgreSQL knowledge model determines what the object means.

Original filenames may be retained as protected metadata where useful, but must not become the security boundary or public storage path.

## RecordFile metadata

A `RecordFile` should contain technical metadata such as:

```text
RecordFile
├── id
├── record_id
├── storage_provider
├── storage_key
├── original_filename
├── content_type
├── size_bytes
├── checksum
├── scan_status
├── processing_status
├── created_at
└── accepted_at
```

The final schema may refine names, but the separation between business record metadata and object storage location is mandatory.

## Upload acceptance pipeline

Real uploads use a trust pipeline:

```text
Upload
  ↓
Quarantine / untrusted object state
  ↓
Validate size and allowed type
  ↓
Normalise/safely retain filename metadata
  ↓
Malware scan
  ↓
Calculate checksum
  ↓
Mark accepted / move or promote to trusted object state
  ↓
Record becomes available according to SAMMA permissions
```

An upload that is failed, rejected or not yet scanned must not silently become an available trusted record.

The implementation may use separate quarantine and accepted buckets/prefixes or equivalent provider-safe states; the application contract must preserve the trust distinction.

## Integrity

Accepted file objects carry an integrity checksum stored in PostgreSQL metadata.

Checksum/inventory data supports:

- corruption detection;
- restore validation;
- database/object inventory reconciliation;
- incident investigation;
- controlled migration between storage providers.

Do not use checksums as a user-facing permission or identity mechanism.

## Retention and review authority

SAMMA Governance defines retention and review/renewal policy through versioned record definitions/policies.

The Document Knowledge Engine remains authoritative for:

- `retain_until`;
- `review_due_at`;
- replacement/supersession knowledge;
- legal/approved hold state if later introduced;
- audit of retention actions.

S3 lifecycle rules may support storage operations, but **must not be the sole source of truth for legal/business retention behaviour**.

A provider lifecycle rule must never delete an object earlier than SAMMA policy permits.

Final automated deletion/destruction remains a controlled legal/compliance and implementation gate.

## Backups and failure domains

Primary object storage is not itself a backup.

Production target:

```text
Primary private object storage
          ↓
versioning / protected recovery points where appropriate
          ↓
backup or replication
          ↓
separate failure domain / provider where practical
```

Requirements:

- object backup independent of the application VM;
- encrypted/protected backup appropriate to sensitive content;
- regular inventory comparison between PostgreSQL `RecordFile` metadata and stored objects;
- restore procedure that preserves private access;
- checksums used during restore verification;
- backup retention aligned with approved record-retention/destruction policy.

## Database and object restore must be reconciled

A valid recovery requires both sides:

```text
PostgreSQL knowledge metadata
+
matching object binaries
+
correct permissions/context
=
restored document knowledge
```

Restoring files without their access/relationship metadata is incomplete and potentially dangerous.

Restoring metadata without matching files is also incomplete.

## Security invariants

- No public document bucket.
- No permanent unauthorised file URL.
- No client-supplied storage key trusted as proof of access.
- No sensitive information in object keys.
- Server authorisation before object access.
- Uploads untrusted until accepted by validation/scanning.
- Sensitive object-access events audited where policy requires.
- Storage credentials remain server-side secrets.
- Backup copies receive equivalent confidentiality protection.

## V1 implementation boundary

V1 code may implement now:

- `StorageProvider` interface;
- `RecordFile` metadata model;
- opaque key generation;
- checksum interfaces;
- upload-processing/scan state model;
- in-memory/test adapter;
- safe development adapter;
- storage-authorisation service boundary;
- object inventory/reconciliation interfaces.

The dedicated Law VM is required before claiming integration of:

- persistent S3-compatible storage;
- real quarantine buckets/prefixes;
- ClamAV or equivalent malware scanning;
- real signed access URLs;
- storage encryption/provider configuration;
- backup automation;
- restore drills;
- production retention/destruction execution.

## Guiding principle

**SAMMA stores knowledge and permissions in PostgreSQL; document binaries live in private, independently recoverable S3-compatible object storage behind a provider-neutral adapter.**

## Persistent Storage V1 — current DEV implementation

Garage v2.3.0 is the selected single-node DEV implementation behind
`S3StorageProvider` (`@aws-sdk/client-s3`). This does not select the production
provider. Objects are private on `juanity-dev`, with no published S3/website/admin
endpoint. The app's dedicated key has bucket read/write permissions only.

`records/<random UUID>/files/<random UUID>` identifies each immutable file
version. Original names, content type, byte count and SHA-256 remain PostgreSQL
metadata; S3 metadata holds the private quarantine/accept/reject state and hash.
No permanent signed URLs or binary data are stored in PostgreSQL. Historic file
objects remain when a new current version commits.

Authenticated same-origin SAMMA routes stream raw uploads into bounded private
USB staging, compute SHA-256 and check PDF/PNG/JPEG signatures, then upload into
quarantine and verify a streamed S3 readback before acceptance. This is bounded
format validation, not proof that a file is safe. UI accepts synthetic files only.
Downloads reauthorise current Person/company/Legal Access rights, including
canDownload, before fetching S3 and streaming an attachment through SAMMA.
Filename sanitisation, nosniff and private no-store headers apply.

The explicit `not-scanned-dev` policy is allowed only with
`SAMMA_ENV=development`. Accepted files retain `NOT_SCANNED_DEV` in database,
UI and audit. They are never described as malware-clean. Other environments
reject this policy; a real scanner is still required before sensitive use.
The memory adapter remains available for isolated tests/non-production local
work, and is never a deployed `next start` fallback. S3 misconfiguration or
unavailability makes readiness/file operations fail closed.

Metadata/current-version changes and success audit are transactional. Definite
rollback deletes the fresh object synchronously; ambiguous commit checks DB
linkage before deletion. If DB cannot answer, preserve the object for operator
reconciliation. No worker was added. A crash can still leave a staged/unlinked
object; do not bulk-delete without comparing PostgreSQL linkage.

Recovery requires PostgreSQL **and Garage metadata plus data blocks**, protected
configuration and key recovery. Garage metadata snapshots alone and blocks alone
are both insufficient. Single-node USB persistence is not off-host backup and
is not approved for sensitive production data. See the
[full preflight](PERSISTENT-STORAGE-V1-PLAN.md) and
[deployment runbook](PERSISTENT-STORAGE-V1-DEPLOYMENT.md).
