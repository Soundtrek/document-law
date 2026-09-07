# Document Setup V1

STATUS: PARTIAL — document implementation complete; Company1 manual acceptance
requires Phil's explicit HR assignment through a missing Team & Access workflow.

## Relationship and Person views

- Relationship detail has a Records section using the existing shared RecordList
  and company domain projection. Empty state says “No records yet.” Add record
  uses the existing server-selected active definitions and upload authorisation.
- Cards show title, company, pinned definition name, category/classification,
  actual status, created date, optional review date/indicator and View/Download.
  Company cards additionally show Person visible: Yes/No.
- My records still filters person-hidden and deleted records. Company lists
  require active company/membership and permitted pinned functional roles.
- New uploads return to their relationship page. Replacement uploads retain the
  record detail destination. Existing API routes and RecordIntakeService reused.

## Access, audit and storage

- OWNER has no HR bypass. No runtime role grants were made.
- Actual denied metadata/file access is audited as RECORD_ACCESS_DENIED, with
  stored identifiers and fixed operation summaries. No titles, content, object
  keys, credentials, tokens or raw request fields are logged. Ordinary list
  filtering and download-capability probes remain free of denial audit noise.
- Existing account-wide policy is preserved. A Person account with Company1 HR
  can still download internal records through its company capability, even while
  visiting the Person page; My records remains person-visible only. A Person-only
  hidden download denial requires an account without the company permission.
- Garage configuration, private opaque immutable keys, upload validation,
  SHA-256, 10 MiB limit and NOT_SCANNED_DEV semantics are unchanged. Current-file
  buttons use the download route's existing acceptance/scan gate. No storage
  adapter, upload/download route, schema or migration was added.

## Focused evidence

- Eight new document/access tests and six existing relationship/card tests use
  the disposable samma_employment_test PostgreSQL database. They cover empty and
  populated views, company/definition/status, hidden omission, visible Person and
  HR access, OWNER/cross-company/unrelated Person denial, denial auditing, role
  revocation, membership/company state, deleted records, pinned definitions and
  Legal Access scope/revocation/view-only download restrictions.
- Affected web typecheck and changed-file ESLint: PASS.
- Prisma validate/status/zero-diff: PASS; five migrations, no difference.
- Synthetic static browser previews at 1440 and 390 pixels: PASS, no overflow;
  desktop/mobile screenshots inspected.
- Full suite, broad auth, Mailpit, invitation and storage suites: NOT rerun.
- Exact-SHA production build and deployed HTTP/browser results are retained in
  the private deployment evidence directory below after release.

## Manual acceptance prerequisite

The requested existing Team & Access workflow is absent from this source:
`apps/web/app/company/team/invite/page.tsx` deliberately returns notFound, and
there is no company role assignment handler. No role-management implementation
is included in the document task without a scope decision. Phil was notified.

Company1 ↔ Phil PDF uploads, Garage object verification, recipient downloads and
hidden-record manual acceptance remain pending. Do not describe automated
projection/access tests as completion of those manual steps.

Deployment evidence, exact SHA, build/check logs, screenshots, health and preserved
main/runtime baseline are stored outside Git at:
`/srv/nuc-archive/juanity/validation/document-setup-v1/`.

Only dev is authorised for push/deployment. Main/RC remains unchanged. Stop for
Phil approval; no dev-to-main promotion is included.
