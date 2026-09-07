# Person → Company document sharing V1

The Personal Info Center exposes Share document on eligible active company
relationships. `/person/relationships/[relationshipId]/add-record` reuses
AddRecordForm and returns successful uploads to `/person#records`.

The browser selects PERSON or COMPANY context; this selection grants no access.
Person authorisation derives the relationship's Person/company from the verified
Account, requires active Account/company/relationship/definition/version and
RELATIONSHIP + PERSON_TO_COMPANY policy, and rechecks those conditions inside
the existing serializable metadata transaction. Prepared IDs must still match
the stored relationship at commit. PENDING/FORMER/ENDED relationships cannot
receive new Person uploads. Person file replacement is outside this create-only
V1; the existing company creation/replacement permissions remain in place.

The intake service uses an explicit Person actor alongside its existing company
actor. Staging, PDF/PNG/JPEG signature detection, the configured 10 MiB DEV limit,
private Garage/S3 quarantine and acceptance, opaque per-file keys, SHA-256,
NOT_SCANNED_DEV and rollback/reconciliation use the existing implementation.

Read projections and `/api/files/[fileId]` remain governed by the pinned
definition. Person visibility requires the matching Person and personVisible.
Company reads require active membership and a current active role permitted by
allowedCompanyRoles. OWNER alone has no bypass. No additional uploads section,
source badge, document notification, authentication change or migration is added.

Early authenticated upload-authorisation/field failures now emit
RECORD_UPLOAD_DENIED with Account attribution and a fixed summary only. Untrusted
IDs, filenames, titles, request contents and tokens are not written to that event.
Existing creation/file/read/download events retain their actorAccountId.

## DEV configuration

`infrastructure/records/seed-person-sharing.ts` is a guarded operator seed through
the existing Governance RecordDefinition/RecordDefinitionVersion model. It
creates `dev-person-proof-of-address`, version 1, Synthetic proof of address,
RELATIONSHIP / PERSON_TO_COMPANY / SENSITIVE, personVisible true, HR-only company
access, notification NONE. Retention and review remain unset; no legal values
are inferred. A rerun verifies the exact policy rather than modifying a pinned
version. The UI reads this configuration from PostgreSQL.

## Focused validation and acceptance

`infrastructure/records/person-sharing.test.ts` uses only the disposable
`samma_employment_test` database. It covers selection, ownership, directions,
relationship states, inactive account/company/definition, safe denied-upload
audit, derived IDs, Person/HR/OWNER/other-company reads and downloads, role
revocation, pinned version integrity, storage/checksum linkage, and commit-time
changes to authority and relationship context. Existing intake compensation and
file-validation tests are the only additional test files required. No full suite.

Pre-release focused result: 18/18 tests PASS (10 reverse-flow PostgreSQL tests,
seven intake tests and one file-validation test). DEV Prisma validate, migration
status and live zero-diff PASS; all six tracked migrations are applied.

Affected domain/application/web typecheck, web lint, Prisma validate/status/live
zero-diff and the isolated exact-commit production build are release checks.
Operator logs and runtime/browser evidence are stored privately under
`/srv/nuc-archive/juanity/validation/person-sharing-v1/`.

`infrastructure/records/browser-acceptance.cjs` signs in through normal DEV OIDC
using existing synthetic Person, HR and OWNER-only accounts. It uploads a small
synthetic PDF, checks Person return/My records, Person and HR View/Download,
OWNER-only denial, safe early-denial audit, responsive layouts, and stored Garage
checksum with `verify-live.ts`. It does not impersonate Phil or manufacture
sessions. Phil → Company1 named-account manual acceptance remains a separate
operator check: upload **Test Proof of Address** as Phil, then View/Download as
Company1 HR. Stop for Phil approval after DEV acceptance; no main promotion.
