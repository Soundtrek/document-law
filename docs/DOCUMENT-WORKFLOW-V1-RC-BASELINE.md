# SAMMA DOCUMENT WORKFLOW V1 RC BASELINE

Status: **BLOCKED — accepted candidate fails concurrent role-assignment validation.**
No dev → main merge, main push or RC deployment occurred.

## Source and runtime identity

- Requested source, clean local dev and fetched origin/dev: `48b17d8e3cdfcede5a2e358ec37714634d5498b0`.
- Previous and unchanged clean local main / origin/main: `6619d19cddfd0767f280204b541c2f5823f23dce`.
- Main has no divergent commits; promotion would fast-forward all 13 accepted DEV commits.
- Compiled DEV runtime: `DEV / dev / 48b17d8`, exact source SHA above.
- Compiled RC runtime: `RC / main / 6619d19`, exact unchanged main SHA above.
- Promoted main SHA: none. Deployed new RC SHA: none.

The user explicitly authorises promotion/deployment only after validation passes.
This request supersedes earlier feature-specific stops for approval, but does not
supply an exception for failing role-assignment behavior. No application changes
or dependency changes were folded into the requested candidate.

## Blocking concurrency failure

The additional 25-test team run failed the existing test “concurrent OWNER removals
leave exactly one OWNER; duplicate grants stay singular.” The failure was an
unhandled `DriverAdapterError: TransactionWriteConflict` during transaction commit.

Running Team & Access alone passed 7/7, team invitations alone passed 18/18, and
five narrow repetitions of the existing concurrency test passed. These successful
retries did not clear the unexplained failure. A separate reproducer using only
synthetic fixtures and simultaneous duplicate HR grants in two independent
companies reproduced the failure in the isolated database, with no other test
suite running. The error has `cause.originalCode: "40001"` and
`cause.kind: "TransactionWriteConflict"`, and no top-level `code`.

`apps/web/lib/company-team.ts` retries only top-level Prisma `P2034`. The reproduced
adapter error escapes that handler. This is an application concurrency failure,
not evidence of an OWNER access bypass or successful removal of the last OWNER.
Normal role changes and the last-OWNER assertions passed; the concurrent duplicate
role-grant success requirement did not reliably hold. Promotion therefore remains
blocked even though the ordinary npm suite passed.

Sanitized evidence and a standalone reproducer are in
[validation evidence](validation/document-workflow-rc-20260907/role-concurrency-diagnostic.log)
and [the reproducer](validation/document-workflow-rc-20260907/role-concurrency.test.ts).
Run only against an independently migrated disposable database named
`samma_team_test`, with `DATABASE_URL` targeting that isolated database:

```sh
node_modules/.bin/tsx --test docs/validation/document-workflow-rc-20260907/role-concurrency.test.ts
```

The reproducer creates synthetic fixtures only in that disposable database. It
must never target the shared NUC application database. A reviewed repair should
handle the pinned adapter's serialization-conflict shape, retain bounded retries
and all transactional authorization/last-OWNER checks, and pass this regression
before a new DEV candidate is accepted for promotion.

## Validation

- `npm ci`: PASS using the approved digest-pinned Node 22 image; source/lockfile unchanged.
- Dependency audit gate: PASS with exactly the current DEV-only Prisma 7.10.0 exception. No new high/critical issue; no exception expansion or forced fix.
- Prisma generate and validate: PASS.
- Live migration status: PASS, all six expected migrations applied.
- Live schema zero-diff: PASS, `No difference detected.` EmploymentInvitation, CompanyTeamInvitation and accepted Record/RecordFile schema are intact. No stale invitation schema drift or live database repair.
- Full `npm test`, run once: PASS, 93 tests, zero failures/skips.
- Employment invitation suite: PASS, 17 tests.
- Team suites: initial combined run 24/25; isolated Team & Access 7/7 and invitations 18/18. Isolated diagnostic reproduces the unresolved application failure above.
- Identity/access integration: PASS, including stable identity, no email linking, session expiry/revocation, tenant/person isolation, role revocation, Legal Access scope/expiry/revocation, Governance not bypassing records, and pinned definition versions.
- Typecheck: PASS.
- Lint: PASS.
- Exact-source production build: PASS, with requested RC/main/source-SHA overlay inputs. The candidate was not deployed.

An ephemeral PostgreSQL container used its own internal network, unpublished
ports, bounded resources and temporary storage. Each fixture suite used its
required named disposable database. An external test-runner preload selected
`samma_employment_test` for document/card test files and `samma_directory_test`
for directory tests; no candidate test/source file was edited. Initial environment
precedence and network-allocation setup errors were corrected before the npm suite
ran. They made no live schema or application-data changes. Tests were not run
against the shared database. The full npm suite was not repeated.

## Accepted product evidence

Person registration, verification and Personal Info Center, and Company
registration, verification, workspace creation and Company Info Center retain
the accepted [registration](AUTH-REGISTRATION-V1-REPORT.md),
[Company onboarding](COMPANY-ONBOARDING-COMPLETION-FIX.md) and
[Company resume](COMPANY-REGISTRATION-RESUME-REPORT.md) evidence.

[Employment introduction](PERSON-COMPANY-INTRODUCTION-V1-REPORT.md) documents
Add person, Mailpit invitation, recipient acceptance and ACTIVE employment
relationships. [Team & Access](TEAM-ACCESS-V1-REPORT.md) documents role assignment,
revocation, last-OWNER protection and OWNER-only record denial.
[Team invitations](ADD-TEAM-MEMBER-V1-REPORT.md) document recipient acceptance,
ACTIVE CompanyMember, selected roles and no automatic employment relationship.
The role-concurrency failure above is new promotion evidence and qualifies those
historical positive results.

Phil confirmed Document Setup V1 manual acceptance in the accepted document
navigation cleanup decision. The existing relationship-scoped Records UI,
company-private HR policy, person-visible shared records and navigation cleanup
remain in the complete source candidate. No record creation, upload, role grants,
new users or new invitation batch was performed for promotion.

Governance directory semantics remain: All = all authorized directory Accounts;
Person = Person with no ACTIVE CompanyMember; Company user = at least one ACTIVE
CompanyMember; Governance = active unrevoked capability grant, which can overlap.
Current directory automated tests pass. Directory access grants no private-record
access; no privileged reviewer session was fabricated.

## Storage, mail and shared data

Read-only live inspection verified all five current files (three shared, two
internal): Garage accepted objects readable, object/database SHA-256 and sizes
match, explicit `NOT_SCANNED_DEV`, and existing acceptance gate unchanged. Person
projections include shared records and omit internal records. Internal files have
an authorized HR reader; both internal records deny direct access by their Person
recipient. No Garage objects were written, replaced or deleted.

Current NUC DEV and RC share Keycloak realm `samma`, PostgreSQL, Garage and Mailpit.
This is temporary synthetic DEV infrastructure, not production/sensitive-data
approval. The Prisma exception remains DEV-only despite the RC channel label.
No users or data were copied, cleaned, reset or deleted. Normal login/session and
access-audit activity is the only live data activity from smoke checks.

Read-only realm inspection confirms auth mail remains `samma-mailpit:1025`.
Application invitation mail already uses Mailpit on DEV. The older, unchanged RC
build has no application invitation-mail settings. A prepared **unapplied** RC
Compose override carries the exact DEV Mailpit configuration, invitation TTLs and
private Mailpit network connection alongside the candidate source mount/revision.
All other service definitions are unchanged. This is required deployment wiring
for the accepted invitation feature; it was not applied because validation failed.
Real SMTP was not restored. Keycloak configuration and scan policy are unchanged.

Rackzar was untouched. Future Rackzar RC/main needs a separate clean environment;
no hosting, identity, storage or data-separation work was performed here.

## Final existing-DEV smoke

Actual HTTPS smoke with existing manifest-bound synthetic Person and HR accounts
passed: landing/sign-in, DEV overlay, Personal and Company Info Centers,
relationship record UI, shared downloads with matching checksums, authorized HR
internal download, internal-record omission from the Person UI, direct Person
metadata/file denial (404), and anonymous/ordinary-account Governance denial.
No account/session impersonation or role modification was used.

The harness was corrected to expect the existing intentional 404 for denied
files. Earlier Chromium attempts encountered network-change errors while
validation containers were attaching/detaching; the final stable-network journey
passed after test-container cleanup. These were smoke-harness/environment issues,
not changes to application behavior. This is DEV evidence, not a newly deployed
RC smoke.

## Final safety and evidence

RC and DEV landing, health and readiness all return 200 with their unchanged
compiled revisions. All ten captured RC/DEV/experiment/shared-service container
IDs, start times, configuration and mount sets match preflight. RC environment
and override files and Keycloak realm settings are unchanged. All five current
record/file checks and their full metadata fingerprint match before/after.
The disposable test database and its internal network were removed.

Port 192.168.1.152:2022 remains owned exclusively by the experiment runtime, with
landing/liveness 200 and its pre-existing unconfigured-storage readiness 503.
No main/dev runtime owns port 2022. RC promotion smoke is not claimed.
Private operator evidence (credentials excluded from this report) is at
`/srv/nuc-archive/juanity/validation/document-workflow-rc-20260907/`.
The isolated candidate is
`/srv/nuc-archive/juanity/rc-releases/48b17d8e3cdfcede5a2e358ec37714634d5498b0`.
Prompt and this report are captured on `experiment/document-workflow-rc-baseline`,
leaving dev/main and both deployed revisions unchanged.
