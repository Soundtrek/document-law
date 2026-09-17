# SAMMA — AI / Codex Working Rules

This file governs AI-assisted work in this repository.

## 0. Mandatory session-start guard

**At the start of a coding session, read `docs/CODEX-SESSION-START.md` and `docs/CODEX-SESSION-METHODOLOGY.md`.**

Establish the branch/runtime/database/scope baseline once. During the session use focused checks proportional to the change. Run broad validation once at session close or a genuine promotion/release gate. Do not restart full preflight and broad validation for every prompt or code block unless the risk boundary materially changes.

## 1. Product boundary

SAMMA is an employment records and document management system. Do not couple it to another product runtime, schema, authentication system, database or package model.

External projects may be used only as design learning unless an explicit extraction/reuse decision is approved.

## 2. Approved product model

```text
Person  ↔  PersonCompanyRelationship  ↔  Company
```

- People have independent accounts.
- Companies are the primary tenant/workspace context.
- The relationship is the controlled bridge for employment context, requests, records/documents and audit.
- Ending a relationship must not delete or transfer the Person account.
- A generic legal `Matter` is not a mandatory V1 root entity.

Do not silently revert to a matter-first architecture.

## 3. Document Knowledge Engine V1

```text
RecordDefinitionVersion
  ↓
Record
  ↓
RecordFile
  ↓
Person / Company / Relationship context
  ↓
Retention / review knowledge
  ↓
Access / activity / audit
```

Rules:

- record types are Governance-configured and versioned;
- historic records do not silently inherit changed policy;
- retention and review/renewal are separate;
- company users see only records authorised for context/functional roles;
- company access never exposes unrelated private-person records;
- binaries live in private object storage, not PostgreSQL by default.

See `docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md`.

## 4. Storage architecture

```text
PostgreSQL = knowledge/metadata/access/retention/audit
S3-compatible object storage = file binaries
```

Mandatory direction:

- object storage is private;
- no permanent public document URLs;
- SAMMA authorisation occurs before object access;
- object keys are opaque and contain no person/company/document naming data;
- primary object storage is not a backup;
- S3 lifecycle rules do not replace SAMMA retention policy;
- domain code uses the provider-neutral storage adapter.

Current NUC Garage storage is a known temporary arrangement and currently has imperfect prod/dev separation. The intended direction is separate external S3-compatible production and development storage. Do not perform that migration as an unrelated side effect.

See `docs/STORAGE-ARCHITECTURE.md`.

## 5. Configurable policy direction

SAMMA Governance defines approved record/request/workflow policy instead of hard-coding every employment/legal record type. Definitions are versioned. System security invariants are not ordinary Governance settings.

See `docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`.

## 6. Company membership and roles

Company membership is separate from functional access. One member may hold several roles and one role may be held by many members.

Working role concepts include OWNER, HR, PAYROLL, CLERK/records, LEGAL, MANAGER and BILLING.

`OWNER` may manage company membership/roles but is not an automatic universal sensitive-record reader.

## 7. External legal access

Lawyers/legal professionals use explicit scoped grants rather than becoming company members by default. Grants are relationship-scoped, revocable, time-bound and auditable.

## 8. Identity

Email is the primary human-facing login/contact, but never the permanent database identity.

Use stable Account IDs and provider-linked identities behind an OIDC-compatible boundary. Future external identities attach to the existing Account. Never silently merge accounts solely because provider emails match.

## 9. Governance, not `/admin`

Do not create a generic `/admin` route. SAMMA privileged control is **Governance**.

Governance requests require verified authentication, Governance capability, deny-by-default server authorisation and audit; production security requirements remain explicit policy.

## 10. Future learning boundary

Moodle/company training is a future integration, not V1 runtime. SAMMA remains authoritative for account/company/relationship/access; the learning system owns courses/progress/assessment. Certificates imported into SAMMA use the normal Record/RecordFile path.

## 11. Build style

Prefer a modular monolith first.

- TypeScript-first.
- Keep domain logic out of React components.
- Keep infrastructure behind adapters.
- Keep identity, storage, payments, email and future LMS integrations behind explicit boundaries.
- Do not introduce microservices, Kubernetes, Elasticsearch or event streaming without demonstrated need.

## 12. No hard-coded business values

Product-controlled values belong in Governance/configuration where practical. Security invariants remain code/policy enforced.

## 13. Security and privacy invariants

Never bypass company/tenant, relationship, legal-grant or resource authorisation for convenience.

Do not trust client-provided company, relationship, role, definition, classification, entitlement or Governance fields.

Use synthetic data in development. Do not copy real production employee/client sensitive data into DEV fixtures, screenshots or tests. Avoid sensitive content in logs.

## 14. Person independence and offboarding

A Person account is independent of a company relationship. Offboarding transitions the relationship; it does not delete the Person.

Company-member removal separately revokes company capabilities while preserving historical attribution/audit.

## 15. 3-click / 10-second rule

Frequent routine actions should normally be reachable within three deliberate clicks/taps and about ten seconds, excluding meaningful typing, upload time, legal reading or justified security steps.

## 16. Current hosting/runtime

Until the client approves different VMs/hosting, the NUC is the approved temporary host for BOTH production and development.

```text
PRODUCTION
https://samma.co.za
branch: main
database: juanity_law

DEVELOPMENT
https://dev.samma.co.za
branch: dev
database: samma_dev
```

This supersedes the older development-only NUC assumption.

Keep the NUC boring. Do not add staging tiers, orchestration layers or duplicate infrastructure without a demonstrated need.

Production and development currently share some infrastructure, including Keycloak and the current Garage storage configuration. Treat those as explicit shared risk boundaries until separated.

The NUC must not become the permanent object-storage architecture or sole backup destination. The future VM/provider is undecided pending the client decision; do not assume Rackzar or another historical proposal is still selected.

See `docs/CODE-BEFORE-VM.md` and `docs/BRANCH-WORKFLOW.md`.

## 17. Validation discipline

Follow `docs/CODEX-SESSION-METHODOLOGY.md`.

Default rule: **validate the session, not every code block.** Establish the baseline once, use focused checks proportional to each change, and run broad validation once at session close or a real promotion/release gate.

High-risk changes—schema/migrations, destructive data, auth/permissions, storage migration, secrets, production infrastructure or major refactors—require deeper validation of the affected boundary. Do not sweep unrelated systems merely because checks exist.

Security-sensitive work requires relevant negative tests when that boundary is touched.

## 18. Approval gates

Do not silently expand scope around production identity configuration, social providers, Moodle, payment production wiring, legal retention/destruction values, encryption/key management, production hosting/provider, privacy/legal wording, e-signature/redaction/OCR or major framework replacement.

## 19. Prompt and decision capture

Significant implementation prompts and accepted decisions must be captured in `prompts/` and `docs/DECISION-LOG.md`.

## 20. Branch workflow

Follow:

```text
experiment/* → dev → main
```

- start isolated work from current `dev` when an experiment branch is useful;
- integrate accepted work into `dev`;
- validate/approve on `dev.samma.co.za`;
- promote only accepted `dev` state to `main`;
- `main` currently serves production at `samma.co.za`;
- never develop directly on `main`;
- prefer normal merges/fast-forwards and do not force-push shared history.

See `docs/BRANCH-WORKFLOW.md`.
