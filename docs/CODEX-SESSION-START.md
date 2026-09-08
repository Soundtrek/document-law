# SAMMA — Mandatory Codex Session Start

> **STOP: READ THIS FILE BEFORE ANY CODING, MIGRATION, DEPLOYMENT, DATABASE CHANGE OR INFRASTRUCTURE CHANGE.**

This is a mandatory session-start guard for AI/Codex work in SAMMA. Read this file together with `AGENTS.md`, `docs/BRANCH-WORKFLOW.md`, and the relevant product/domain documents before changing the repository or runtime.

## 1. Environment separation is a hard boundary

SAMMA development and RC are separate deployment contexts even while both currently run on the NUC.

```text
experiment/*  -> 192.168.1.152:2022
                experiment preview only

dev           -> https://dev.samma.co.za
                DEV application
                DEV metadata/database context: samma_dev

main          -> https://samma.co.za
                RC application
                RC metadata/database context
                must not be replaced by DEV metadata/data

future main/RC -> Rackzar
                separate RC infrastructure later
```

### Critical rule

**Promoting code from `dev` to `main` does not mean promoting DEV data, metadata, users, companies, records, definitions, Keycloak state, Garage objects or Mailpit messages.**

Code promotion and data movement are separate operations. Never infer one from the other.

## 2. `samma_dev` isolation must be preserved

DEV currently uses the isolated `samma_dev` metadata/database context.

Before any task touching database configuration, Prisma, migrations, seeding, definitions, deployment, Compose, environment files or promotion:

1. identify the current branch;
2. identify the exact database/metadata target;
3. identify the exact runtime being changed;
4. confirm DEV changes target `samma_dev`;
5. confirm the RC metadata/catalogue will remain untouched unless the task explicitly authorises an RC migration/promotion;
6. never point DEV at the RC database merely to make tests pass;
7. never copy the DEV catalogue into RC as an implicit side effect of deployment.

If the target database/environment is ambiguous, **STOP before writing**.

## 3. Branch/runtime law

```text
experiment/* -> dev -> main
```

- `experiment/*` is disposable/isolated work and port `2022` is experiment-only.
- `dev` is the integrated development branch and runs at `dev.samma.co.za`.
- `main` is the accepted RC branch and runs at `samma.co.za` until RC later moves to Rackzar.
- Never develop directly on `main`.
- Normal feature integration happens on DEV before promotion.
- Use normal merges/fast-forwards. Do not force-push `main` during normal work.

## 4. Promotion law

A `dev -> main` promotion moves accepted repository state.

It does **not** automatically move:

- Accounts or Persons;
- Companies or memberships;
- employment relationships;
- invitations;
- Records or RecordFiles;
- Company custom document definitions;
- DEV seed/test data;
- Keycloak users/sessions/configuration;
- Garage objects;
- Mailpit messages;
- secrets.

Migrations required by promoted code may be applied to the RC database only through an explicit, reviewed RC migration step with the RC target verified first.

## 5. No-hardcode law

Business document policy must be configuration-driven. Security invariants may be enforced in code.

Do not hardcode business document types, company-specific document types, role/document matrices, retention periods, review periods or company personnel assignments into application logic when they belong in Governance or Company configuration.

Governance and authorised Companies must be able to create/configure document types and allowed functional roles without a developer code change.

See `docs/DOCUMENT-SHARING-PRINCIPLES.md`.

## 6. Identity and relationship law

Keep these concepts separate:

```text
Account / Person
CompanyMember
PersonCompanyRelationship
```

- `Person` is the human identity/account context.
- `CompanyMember` is someone who operates SAMMA for a Company.
- `PersonCompanyRelationship` is the employment/person-company relationship.
- Adding a Person must not automatically create Company membership.
- Adding a team member must not automatically create an employment relationship.
- Ending employment must not delete the Person account.

## 7. Role/access law

`OWNER` is company governance, not a universal sensitive-document bypass.

Document access is driven by the pinned Record Definition policy and the member's active functional roles.

Do not bypass role/tenant/relationship checks for convenience, testing or UI simplicity.

## 8. Record-definition law

Records pin an exact `RecordDefinitionVersion`.

Old records must not silently inherit new policy when a definition changes.

System and Company-scoped definitions use the same policy engine. Company A must never see or use Company B custom definitions.

Directions remain policy-driven:

- `COMPANY_TO_PERSON`
- `PERSON_TO_COMPANY`
- `INTERNAL_COMPANY`

## 9. Storage law

File binaries remain in private S3-compatible storage through the existing provider-neutral storage path.

Do not create a second upload/storage implementation.

Current NUC DEV storage remains synthetic and explicitly `NOT_SCANNED_DEV` until malware scanning is deliberately implemented.

Do not represent DEV files as production-safe.

## 10. Mail/auth law for current NUC development

Current NUC authentication/application test mail uses Mailpit.

Do not restore or introduce real SMTP during ordinary DEV work unless explicitly requested.

Do not redesign Keycloak/auth as part of unrelated features.

Future Rackzar RC configuration is a separate deployment project.

## 11. Validation law — proportional checks

Do not run the entire release suite after every tiny correction.

Use validation proportional to risk:

- small UI/local change -> focused tests/checks;
- feature/domain change -> targeted integration/security checks;
- auth/schema/storage/permission change -> deeper relevant checks;
- `dev -> main` promotion -> comprehensive release validation once.

Do not repeat an unchanged large test suite on the same branch unless the new change intersects that risk area or the work is at a promotion gate.

## 12. Before writing anything

At the start of every coding session, state/verify internally:

```text
BRANCH:
RUNTIME:
DATABASE/METADATA TARGET:
CHANGE SCOPE:
MIGRATION EXPECTED: YES/NO
MAIN/RC TOUCHED: YES/NO
```

Then inspect only what is necessary for the task.

If any of these are unclear, stop before making changes.

## 13. Required reading

Before coding, read at minimum:

1. `AGENTS.md`
2. `docs/CODEX-SESSION-START.md` (this file)
3. `docs/BRANCH-WORKFLOW.md`
4. `docs/DOCUMENT-SHARING-PRINCIPLES.md` for document/record work
5. relevant current architecture/security/domain document for the task

## 14. Purpose

This guard exists to prevent the most dangerous development mistake in the current NUC setup: treating branch promotion, deployment, schema migration and data movement as the same operation.

They are not.

**Preserve environment isolation first. Change only the intended layer.**
