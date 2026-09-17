# SAMMA — Mandatory Codex Session Start

> **READ THIS FILE ONCE AT THE START OF A CODING SESSION.**

Read this together with `AGENTS.md`, `docs/CODEX-SESSION-METHODOLOGY.md`, `docs/BRANCH-WORKFLOW.md`, and the relevant domain/security document for the work being done.

The purpose is to establish the session boundary once. Do not repeat this broad preflight before every code block.

## 1. Current runtime map

Until the client approves a different VM/hosting arrangement, the NUC is the approved temporary host for both SAMMA production and development.

```text
experiment/* -> isolated preview only when explicitly required

dev          -> https://dev.samma.co.za
                development application
                database: samma_dev

main         -> https://samma.co.za
                current production
                database: juanity_law
```

The historical plan for a dedicated/Rackzar production VM is not the current operating decision. Do not assume a future provider until the client decision is made.

## 2. Session baseline — establish once

At session start identify:

```text
BRANCH:
BASE SHA:
RUNTIME:
DATABASE/METADATA TARGET:
CHANGE SCOPE:
PROTECTED AREAS:
MIGRATION EXPECTED: YES/NO
PRODUCTION TOUCHED: YES/NO
KNOWN EXISTING BLOCKERS:
```

If branch/runtime/database target is ambiguous, stop before writing.

Once this baseline is established, do not repeatedly reconfirm unchanged systems after every small change. Follow `docs/CODEX-SESSION-METHODOLOGY.md`.

## 3. Environment separation remains a hard boundary

Even though production and development currently share one physical NUC, they are separate application/data contexts.

Production:

```text
branch: main
site: samma.co.za
database: juanity_law
```

Development:

```text
branch: dev
site: dev.samma.co.za
database: samma_dev
```

Promoting code from `dev` to `main` does not promote DEV data, users, companies, records, definitions, secrets, Keycloak state or object-storage data.

Never point DEV at `juanity_law` merely to make tests pass.

## 4. Known shared infrastructure

Production and development currently share some infrastructure.

Keycloak:

- shared Keycloak service/realm currently exists;
- client/config separation may be introduced deliberately;
- do not assume a DEV identity change is isolated unless the exact client/realm scope is verified.

Object storage:

- current Garage configuration is shared/temporarily imperfect;
- the intended direction is separate external S3-compatible production and development storage;
- do not delete/migrate Garage objects as part of unrelated work.

These are known temporary boundaries pending infrastructure changes.

## 5. Branch workflow

```text
experiment/* -> dev -> main
```

- `experiment/*`: isolated feature/experiment work when useful.
- `dev`: integrated development and acceptance; runs at `dev.samma.co.za`.
- `main`: accepted production branch; runs at `samma.co.za`.
- never develop directly on `main`;
- use normal merges/fast-forwards;
- do not force-push shared history during normal work.

See `docs/BRANCH-WORKFLOW.md`.

## 6. Validation methodology

**Validate the session, not every code block.**

Normal session:

```text
SESSION START
  establish baseline once

WORK
  focused checks proportional to each change

SESSION CLOSE
  inspect accumulated diff
  typecheck/lint/tests/build as appropriate once

DEPLOYMENT
  short environment/rollback gate
  focused production acceptance
```

Do not run the whole release suite after every tiny correction.

Use stronger immediate checks when touching high-risk boundaries such as:

- schema/migrations;
- destructive data operations;
- authentication/authorization;
- permissions/access isolation;
- storage/file migration;
- secrets;
- production infrastructure;
- major refactors.

Even then, validate the affected risk boundary rather than sweeping unrelated systems without reason.

## 7. Identity and relationship law

Keep these concepts separate:

```text
Account / Person
CompanyMember
PersonCompanyRelationship
```

- Person is the human identity/account context.
- CompanyMember is someone who operates SAMMA for a Company.
- PersonCompanyRelationship is the employment/person-company relationship.
- adding a Person must not automatically create Company membership;
- adding a team member must not automatically create an employment relationship;
- ending employment must not delete the Person account.

## 8. Role/access law

`OWNER` is company governance, not a universal sensitive-document bypass.

Document access is driven by pinned Record Definition policy and active functional roles.

Never bypass tenant/relationship/role/legal-grant checks for convenience, testing or UI simplicity.

## 9. Record-definition law

Records pin an exact `RecordDefinitionVersion`.

Old records must not silently inherit new policy when a definition changes.

System and Company-scoped definitions use the same policy engine. Company A must never see or use Company B custom definitions.

Directions remain policy-driven:

- `COMPANY_TO_PERSON`
- `PERSON_TO_COMPANY`
- `INTERNAL_COMPANY`

## 10. No-hardcode law

Business document policy must be configuration-driven. Security invariants may be enforced in code.

Do not hardcode business document types, company-specific document types, role/document matrices, retention periods, review periods or company personnel assignments when they belong in Governance or Company configuration.

## 11. Storage law

File binaries use the existing provider-neutral private S3-compatible storage path.

Do not create a second upload/storage implementation.

Do not represent DEV files as production-safe merely because the storage API is shared.

Storage migration is a high-risk session and requires explicit source/destination integrity and rollback checks.

## 12. Mail/auth law

Do not redesign Keycloak/auth as part of unrelated work.

Development/test mail and production mail configuration are separate concerns. Do not introduce real outbound mail into DEV merely to make a test realistic.

## 13. Promotion law

A `dev -> main` promotion moves accepted repository state only.

It does not automatically move:

- Accounts/Persons;
- Companies/memberships;
- employment relationships;
- invitations;
- Records/RecordFiles;
- definitions;
- DEV test data;
- Keycloak users/sessions/configuration;
- object-storage data;
- secrets.

Migrations required by promoted code require an explicit production migration step with the production target verified first.

## 14. Required reading

At session start read at minimum:

1. `AGENTS.md`
2. `docs/CODEX-SESSION-START.md`
3. `docs/CODEX-SESSION-METHODOLOGY.md`
4. `docs/BRANCH-WORKFLOW.md`
5. relevant domain/security document for the task

Do this once per session unless the scope materially changes.

## 15. Purpose

This guard exists to prevent the dangerous mistakes that matter while avoiding validation theatre.

**Establish the environment and risk boundary once, change only the intended layer, use focused checks while working, and validate the accumulated session at the close/promotion gate.**
