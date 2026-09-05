# Real user and company workflow V1 — acceptance report

**STATUS: PASS — synthetic-data DEV workflow.** Validated 2026-09-05.

## Preflight

[Complete blocker matrix](REAL-WORKFLOW-V1-PREFLIGHT.md) was captured before coding.
No RED blockers. Existing DB-backed reads, real authentication, role/record policy,
private Garage storage and Legal Access were GREEN. Company creation, navigation,
profiles and empty states were YELLOW. Verified new-subject onboarding, invitation
persistence and absent configuration were safe additive ORANGE changes.

Compensations: explicit DEV manual invitation links (no SMTP claim); disposable
real Keycloak users; audited missing-role/minimal synthetic-definition seed.
Existing-email/new-subject collisions still require explicit identity review.
Keycloak registration/provider configuration was not changed.

## Person and company

- Existing issuer/subject linkage preserves Account IDs. New verified subjects
  create Account/Identity/Person atomically only without an existing-email conflict.
- Repeat/concurrent onboarding creates one Person per Account. Suspended and
  unverified identity cases deny. `/person` reads real relationships and permitted
  records, with no fixture fallback.
- Browser company creation creates Company + ACTIVE CompanyMember + normal OWNER
  grant and audit in one transaction. No platform capability is granted.
- Company selector validates active membership and selected company server-side.
  Separate Owner fixtures create Company A and B; wrong-company selection denies.
- Team & Access supports distinct staff invitations, approved role assignment,
  revocation and member removal. Owner explicitly assigns self HR before using
  HR-restricted definitions. Last-Owner removal is denied.

## Relationship and invitation

- Email-addressed EMPLOYMENT and MEMBERSHIP invitations are distinct. Unknown
  addresses create no fake Accounts. Known verified recipients bind by stable ID.
- Random 256-bit token, hash-only database storage, 24-hour expiry, exact verified
  recipient check, explicit acceptance, refresh/rotation and revocation.
- Duplicate invitation creation and accepted retries are idempotent. Wrong user,
  expired/revoked token, old refreshed token, revoked inviter access and disabled
  transport outside DEV deny.
- Acceptance activates/reuses a pending relationship; historical former rows stay
  intact. Company-row locking and serializable transactions prevent concurrent
  workflow duplicates. Removed membership is not resurrected by an old invitation.
- `/company/people/{relationshipId}` exposes only authorised company employment
  context. Person independence is retained.

## Record, storage and visibility

Two minimal Governance-seeded DEV record types demonstrate employee-visible and
internal HR documents. Both use HR, not an Owner bypass; no retention/destruction
values were introduced. Active definition/version selection is database-driven.

Real browser uploads used the existing RecordIntakeService and S3 StorageProvider.
Three synthetic PDFs were stored in Garage: visible A, hidden A, visible B. All
have SHA-256 matching the downloaded bytes, opaque immutable record/file keys,
persisted RecordFile metadata and explicit `NOT_SCANNED_DEV`. There is no new
upload implementation. Previous immutable-version and uncertain-commit security
suites remain passing.

The employee sees permitted records from both companies and cannot view/download
the internal HR document. Each company owner sees only their own permitted
records. Billing cannot view employee profiles, upload records or download these
files. Live HR revocation denies download after the mutation commits. Private
Person isolation and inactive definition/relationship denials pass in DB tests.

## Database and persistence

Migration: `0004_company_invitations` (one additive enum/table, indexes and foreign
keys). SQL reviewed before application. No existing data conversion or deletion.

Private pre-migration custom-format PostgreSQL dump and validated archive listing:
`/srv/nuc-archive/juanity/validation/workflow-private/pre-0004.dump` and
`pre-0004-manifest.txt`. This is an on-host checkpoint, not an off-host backup.

All four migrations applied; status up to date; Prisma zero-diff passed locally
and in CI. Before/after snapshots confirm Account/Person identities, companies,
memberships/roles, relationships, accepted invitation state, Records and RecordFiles
unchanged after app restart. Garage bytes still download with the same SHA-256.
No startup fixtures/reset logic was added.

## Browser and regression evidence

Four disposable verified Keycloak DEV identities exercised real login. Phil's
password was not used. His existing Account/Person and Governance configuration
were not changed. The browser journey created companies, assigned HR explicitly,
invited/accepted an employee, opened stable profiles, selected definitions,
uploaded files, viewed company/employee records, downloaded and logged out.

Personal/company/profile/Team & Access/Add Record screens passed **1440, 768 and
390 pixels** without horizontal overflow; representative screenshots were visually
inspected. Synthetic screenshots and credential/session-bearing test manifests
remain private under `workflow-private`, outside Git.

Two browser harness timing/selector issues were corrected, along with handling
Keycloak's existing logout confirmation. They were test-harness failures; final
workflow stages and fresh-session replay checks pass. Incomplete synthetic runs
were explicitly cleaned before the retained successful scenario, never by app
startup.

Existing authentication regression also passed: stable identity, session
expiration/revocation, unverified/suspended/unlinked rejection, role revocation,
Legal Access scope/expiry/revocation, definition versions and no Governance record
bypass. Explicit temporary Governance test capabilities opened the protected
screen, still denied cross-company records, and denied Governance after revocation.
Those test grants were revoked. No company-created platform privileges remain.

Public replay on `https://samma.co.za` passed fresh OIDC login, persisted records,
checksum download, wrong-company/hidden/Billing/anonymous denial, protected Legal
Access, Governance isolation and provider-confirmed logout.

## Validation and deployment

Passed: npm ci; Prisma generate/validate; migrate deploy/status/zero-diff; all
existing test suites; 11 PostgreSQL workflow tests (including the parent suite);
authentication DB regression; typecheck; lint; production build; production audit
gate with only the existing exact Prisma DEV exception.

Feature commit and initial deployed SHA:
**`f19a4edbaefc9b8ed8d96c44bbc2f293dca5b859`** —
`feat: add real person company and employee record workflows`.

[GitHub CI passed for that SHA](https://github.com/Soundtrek/document-law/actions/runs/33987033594),
including fresh PostgreSQL migrations and workflow isolation tests. Fast-forward
push only. Public cutover occurred only after exact-SHA CI success, using the
locally validated build. Documentation-only publication may advance the revision
without changing application code; its own CI must pass before final publication.
The latest exact published SHA/build/CI evidence is stored in private
`workflow-private/deployment.json` and the web container's
`org.opencontainers.image.revision` label.

`/`, `/api/health` and `/api/ready` respond successfully. Health reports
`storage: s3`; readiness reports database and storage true, provider s3.

Previous artifacts are preserved as `node_modules-before-workflow-f19a4ed` and
`next-cache-before-workflow-f19a4ed`; private pre-cutover configuration/generated
client checkpoint is in `backups/workflow-f19a4ed`. Keep the additive schema and
newly uploaded objects during any rollback; never restore a stale dump over this
workflow's records.

## Untouched and follow-ups

Keycloak provider configuration, Garage persistence/configuration, Caddy, Legal
Access architecture, Governance capability/MFA architecture and unrelated NUC
services were not redesigned or redeployed. Disposable Keycloak test identities
and explicitly audited/revoked test capabilities were the only identity fixtures.
The retained test dataset is synthetic and remains independent of normal users.

Remaining: SMTP invitations/recovery; malware scanning; Governance MFA activation;
tested off-host backup/restore and production hosting/storage approval. Re-invite
following completed invitation/offboarding history remains an explicit future
lifecycle action, not a silent reset. This public-domain deployment remains DEV;
NOT_SCANNED_DEV and the approved Prisma exception are not sensitive-data approval.
