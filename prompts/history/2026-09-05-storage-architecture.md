# 2026-09-05 — Storage architecture

## Goal

Define how Juanity Law stores sensitive document binaries without coupling the Document Knowledge Engine to the application VM or PostgreSQL.

## Owner constraints

- Use separate S3-compatible storage for documents/files.
- Preserve the existing no-hardcoding/provider-neutral approach.
- Keep the design appropriate for sensitive employment/legal records.
- The NUC is not a Juanity Law runtime/storage target.

## Accepted interpretation

Separate document knowledge from file binaries.

```text
PostgreSQL
= identity + company/person/relationship + Record knowledge + permissions + retention/review + audit + object references

Private S3-compatible object storage
= binary file objects only
```

Application/domain code uses a provider-neutral `StorageProvider` interface.

## Decisions

- Production document binaries do not live in PostgreSQL by default.
- Production object storage is private and intended to be separate from the Juanity application VM failure domain.
- Juanity server-side authorisation precedes file/object access.
- Permanent public bucket/file URLs are prohibited.
- Object keys are opaque and do not contain person/company names or document descriptions.
- Real uploads use quarantine/untrusted state, validation, malware scanning and checksum before becoming trusted/available.
- PostgreSQL remains authoritative for access context, `retain_until`, `review_due_at` and record knowledge.
- S3 lifecycle rules may support operations but do not replace Juanity retention policy.
- Primary object storage is not itself a backup.
- Backups/replication should use a separate failure domain where practical and preserve equivalent confidentiality.
- Database metadata and object inventory/checksums must be reconcilable during restore and migration.
- Production storage provider/region remains a later approval decision.

## Development path

Before the Law VM:

- build `StorageProvider` interface;
- build RecordFile storage metadata and opaque-key generation;
- use in-memory/test or safe development adapters;
- model upload-processing/scan/checksum states.

On the Law development VM:

- integrate S3-compatible development object storage;
- integrate quarantine/validation/ClamAV/checksum;
- test authorised short-lived access;
- test object/database reconciliation.

Production:

- private independently recoverable object storage separate from app VM;
- backup/replication and restore drills;
- production provider/region/privacy review.

## Files / areas affected

- `docs/STORAGE-ARCHITECTURE.md`
- `README.md`
- `docs/STACK-DESIGN.md`
- `docs/DECISION-LOG.md`
- GitHub Issue #2 build scope

## Result

PASS — storage architecture approved and documented.

## Follow-up

Build the provider-neutral storage and RecordFile metadata boundary as part of V1, without claiming production S3/scan/backup integration until the dedicated Law VM stage.
