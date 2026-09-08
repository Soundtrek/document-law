# Record Definitions + Document Access Matrix V1

STATUS: PASS for DEV implementation and synthetic browser acceptance. Phil manual acceptance pending.

## Model

Single RecordDefinition / RecordDefinitionVersion / Record / RecordFile engine.
Nullable companyId denotes system scope; company IDs scope local definitions.
Stable integration codes are unique within scope; opaque internal company keys
retain global uniqueness. Existing keys and historic policy columns are preserved.
One additive migration: 0007_record_definition_policy.

## Governance and Company

/governance/definitions supports create, immutable new versions, activation,
deactivation, description, category, direction, Person visibility, catalogue roles,
classification, review, retention and NONE notifications. The read-only Access
Matrix projects current active stored versions; version detail shows old policy.

/company/[companyId]/document-settings provides the same engine for company-local
types and a combined system/company matrix. System policy is read-only here.
Company Info Center links to settings for active company.settings.manage members.
OWNER has no automatic document access; explicitly selecting OWNER works normally.

## Policy and selection

Company Add Record and Person Share Document query current authorised definitions.
New records reject stale versions, inactive definitions/versions, wrong direction,
wrong actor/relationship, foreign company scope and absent/revoked role grants.
Company creation uses COMPANY_TO_PERSON/INTERNAL_COMPANY; existing BIDIRECTIONAL
remains legacy-compatible. New policy forms offer only the three V1 directions.

Access and classification resolve the pinned version. Dates derive from configured
month values (the UI accepts months or years). Relationship-end retention stores
mode, period and relationship reference while endedAt is unknown. The calculator
supports an end date; no offboarding workflow/background job exists yet to apply
it later. V1 uses one company-role set for create/read; no notification sending,
legal retention assumptions, release workflow or step-up authentication was added.

Twelve starter system definitions were installed through the same validated,
audited configuration writer. All retention/review periods are unset. The three
old synthetic definitions are inactive; historical records are not repinned.

## Database and deployment boundary

A private pg_dump checkpoint and verified restore manifest precede migration.
Migration status and Prisma schema zero-diff PASS, including isolated DEV.
Checksums verify preservation of all original record/version values.

Deployment review discovered RC and DEV shared juanity_law. To prevent the older
RC engine from consuming company-scoped DEV policy, DEV now uses samma_dev on the
same PostgreSQL service. A consistent copy preserves Accounts, identity links,
relationships, records and private Garage references. Eight domain-table checksum
comparisons passed. Only DEV web was stopped/recreated; RC/preview runtime IDs and
start times remain unchanged. Keycloak/provider configuration was not changed.

The additive migration also remains in juanity_law, having been applied before
this discovery. RC's original Record / RecordDefinition / RecordDefinitionVersion
field values were restored/verified against the checkpoint. Only this task's 12
unreferenced starter entries were removed from RC after copying them to DEV;
audit history remains. No historic record/version was removed or repinned.

DEV and RC metadata now evolve independently. Garage objects remain shared DEV
references; this is not a production storage/backup isolation design. Future
promotion must not blindly merge DEV configuration/data into RC.

## Validation

- 8 focused PostgreSQL definition-policy tests PASS.
- 11 selected domain/intake tests PASS (including Legal Access and storage failure).
- 11 selected Person sharing/upload validation tests PASS.
- Workspace typecheck and lint PASS.
- Disposable and DEV migration status/schema zero-diff PASS.
- Full suite rerun during development: NO.
- Initial scanner fixture corrected for enforced upload direction.
- Initial sharing-test run lacked explicit DEV scan environment; passed when run
  with the documented NOT_SCANNED_DEV environment. No scanner bypass was added.

Live HTTPS browser acceptance PASS on abd0e0c. Governance creation/versioning,
company-local Safety Induction Form, dynamic HR selector/upload, dynamic Person
selector, Company B isolation, OWNER denial, historical file access after a policy
change/deactivation and origin/CSRF denial all passed. Stored v1 and unset dates
were verified directly. The live build identity stayed identical throughout type
creation and selection: NO HARDCODE acceptance YES.

1440 / 768 / 390 viewport overflow checks passed. Screenshot review prompted a
small final matrix wrapping improvement so role answers and directions stay
readable in a horizontally scrollable table. No document policy change.
The browser harness's exact Direction label matcher was also corrected.
Temporary synthetic Governance access was revoked and Company B removed;
acceptance definitions are inactive, and synthetic record/audit history remains.

## Commits

- c98c94b — configurable definitions, company scope, matrices, pack and tests.
- 16a3a28 — capability-appropriate Governance navigation.
- abd0e0c — isolated DEV metadata and operational documentation.

Initial acceptance SHA: abd0e0c59e11c01064ef4028f0413d8c8c3b5ce0; health and DB/storage readiness PASS.
Final presentation/test evidence commit is rebuilt and deployed from clean dev.
Read /api/health for the exact compiled final build identity.
Main local/remote remains 5b3b2861c09db01cde8bcb3f26745966101486d4.

Phil's named-account / Company1 manual acceptance remains pending. Browser checks
use existing synthetic identities and never change Phil's roles or credentials.
No dev → main promotion is authorised by this work.

Private deployment and browser evidence: /srv/nuc-archive/juanity/validation/record-definitions-v1.

STOPPED FOR PHIL APPROVAL after final DEV validation; main promotion is excluded.
