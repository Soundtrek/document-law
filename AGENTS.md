# Juanity Law — AI / Codex Working Rules

This file governs AI-assisted work in this repository.

## 1. Product boundary

Juanity Law is a new application and **document knowledge system**. Do not couple it to another product runtime, schema, authentication system, database or package model.

External projects may be used only as design learning unless an explicit extraction/reuse decision is approved.

## 2. Approved product model

```text
Person  ↔  PersonCompanyRelationship  ↔  Company
```

- People have independent accounts and are expected to use the core person experience for free.
- Companies are the primary paid tenants/workspaces.
- The relationship is the controlled bridge for employment context, requests, records/documents and audit.
- Ending a relationship must not delete or transfer the person's account.
- A generic legal `Matter` is not a mandatory v1 root entity.

Do not silently revert to a matter-first architecture.

## 3. Approved Document Knowledge Engine V1

Use:

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
- company users only see records authorised for context/functional roles;
- company access never exposes unrelated private-person records;
- binaries live in private object storage, not PostgreSQL by default;
- upload acceptance includes quarantine/validation/malware-scan/checksum when real storage is integrated.

See `docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md`.

## 4. Storage architecture

Production storage is split:

```text
PostgreSQL = knowledge/metadata/access/retention/audit
S3-compatible object storage = file binaries
```

Mandatory rules:

- object storage is private;
- production object storage is separate from the application-host failure domain;
- no permanent public document URLs;
- Juanity authorisation occurs before object access;
- object keys are opaque and contain no person/company/document naming data;
- real uploads remain untrusted until accepted through quarantine/validation/malware-scan/checksum;
- primary object storage is not a backup;
- S3 lifecycle rules do not replace Juanity retention policy;
- domain code uses a provider-neutral storage adapter and never depends on local paths or provider URLs.

See `docs/STORAGE-ARCHITECTURE.md`.

## 5. Configurable policy direction

Juanity Governance defines approved record/request/workflow policy instead of hard-coding every employment/legal record type. Definitions are versioned. System security invariants are not ordinary Governance settings.

See `docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`.

## 6. Company membership and roles

Company membership is separate from functional access. One member may hold several roles and one role may be held by many members.

Working role concepts include OWNER, HR, PAYROLL, CLERK/records, LEGAL, MANAGER and BILLING.

`OWNER` may manage company membership/roles and assign roles to self, but is not an automatic universal sensitive-record reader.

## 7. External legal access

Lawyers/legal professionals use explicit scoped grants rather than becoming company members by default. Grants are relationship-scoped, revocable, time-bound and auditable.

## 8. Identity: email-first, stable internal account

Email is the primary human-facing login/contact, but never the permanent database identity.

Use stable Account IDs and provider-linked identities behind an OIDC-compatible boundary. Future Google/Microsoft/Apple-style identities attach to the existing Account. Never silently merge accounts solely because provider emails match.

## 9. Governance, not `/admin`

Do not create a generic `/admin` route. Juanity-only privileged control is **Governance**, initially `/governance`.

Governance requests require verified authentication, Governance capability, MFA in production, deny-by-default server authorisation and audit.

## 10. Future Moodle / learning boundary

Moodle/company training is a future integration, not V1 runtime. Juanity remains authoritative for account/company/relationship/access; Moodle owns courses/progress/assessment. Certificates imported into Juanity use the normal Record/RecordFile path.

See `docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md`.

## 11. Build style

Prefer a modular monolith first.

- TypeScript-first.
- Keep domain logic out of React components.
- Keep infrastructure behind adapters.
- Keep identity, storage, payments, email and future LMS integrations behind explicit boundaries.
- Treat permissions, role grants, definitions, legal grants, classification and audit/activity as first-class capabilities.
- Do not introduce microservices, Kubernetes, Elasticsearch or event streaming without demonstrated need.

## 12. No hard-coded business values

Product-controlled values belong in Governance/configuration data where practical. Security invariants remain code/policy enforced.

## 13. Security and privacy invariants

Never bypass company/tenant, relationship, legal-grant or resource authorisation for convenience.

Do not trust client-provided company, relationship, role, definition, classification, entitlement or Governance fields.

Use synthetic data only in development. Do not place real employee/client sensitive data in source, fixtures, screenshots or tests. Avoid sensitive content in logs.

## 14. Person independence and offboarding

A Person account is independent of a company relationship. Offboarding transitions the relationship; it does not delete the Person.

Company-member removal separately revokes company capabilities while preserving historical attribution/audit.

## 15. 3-click / 10-second rule

Frequent routine actions should normally be reachable within three deliberate clicks/taps and about ten seconds, excluding meaningful typing, upload time, legal reading or justified security steps.

Use contextual actions and smart Governance defaults rather than removing controls.

## 16. Development environment

Build repository-first. The NUC may be used as a **temporary development/integration host** if a resource check shows adequate disk, RAM and CPU headroom.

Start small:

```text
law-web + PostgreSQL
```

Only add S3-compatible dev storage, Redis/BullMQ, worker and ClamAV when required and when resources permit.

The NUC is not the production host, not the sole backup destination and not the production object-storage architecture. Synthetic data only. If Juanity destabilises existing workloads, stop the NUC runtime experiment and continue repository-first or move to the dedicated Law VM.

See `docs/CODE-BEFORE-VM.md`.

## 17. Validation discipline

Use focused validation proportional to the change. Security-sensitive work requires negative tests.

At minimum verify tenant/person isolation, role revocation, definition-version integrity, Legal Access scope, Governance isolation, stable Account identity and storage-key/access isolation.

## 18. Approval gates that remain

Do not silently expand scope around production identity configuration, social providers, Moodle, payment production wiring, legal retention/destruction values, encryption/key management, production hosting region/provider, privacy/legal wording, e-signature/redaction/OCR or major framework replacement.

## 19. Prompt and decision capture

Significant implementation prompts and accepted decisions must be captured in `prompts/` and `docs/DECISION-LOG.md`.
