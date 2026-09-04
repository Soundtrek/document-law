# Architecture Decision Log

This file records accepted project-level decisions. Add entries when a decision materially changes architecture, security, deployment, product boundaries or workflow.

## ADR-001 — Build Juanity Law as a new application
**Status:** Accepted  
**Date:** 2026-09-04

Juanity Law is built from scratch. Previous products may be used as design learning, but Juanity must not depend on their runtime, schema, identity, billing or package model.

## ADR-002 — Info Center is the primary product frame
**Status:** Accepted  
**Date:** 2026-09-04

The experience is centred on an Info Center that makes status, actions, relationships, information and recent activity obvious. The app is not a generic file manager.

## ADR-003 — Matter as foundational entity
**Status:** Superseded by ADR-012  
**Original date:** 2026-09-04

A Matter may be introduced later as optional legal-work context, but it is not the v1 root domain.

## ADR-004 — Document engine design is deferred
**Status:** Superseded by ADR-023  
**Original date:** 2026-09-04

The V1 Document Knowledge Engine is now approved for implementation.

## ADR-005 — Modular monolith first
**Status:** Accepted  
**Date:** 2026-09-04

Use one primary TypeScript codebase with clean module/adapter boundaries. Extract services/workers only when operationally justified.

## ADR-006 — Proposed technical foundation
**Status:** Accepted as planning baseline  
**Date:** 2026-09-04

Baseline: Next.js + React + TypeScript, PostgreSQL + Prisma, OIDC identity, S3-compatible storage, BullMQ/Redis when needed, ClamAV for real uploads, SMTP, Caddy, Docker/Compose and payment adapters.

## ADR-007 — Existing NUC is not a permanent Law runtime target
**Status:** Refined by ADR-030  
**Original date:** 2026-09-04

Original intent: Juanity must not become dependent on the already resource-constrained NUC for production runtime, persistence or disaster recovery. ADR-030 now permits a resource-gated **temporary development/integration runtime** on the NUC while preserving that production/dependency constraint.

## ADR-008 — Build before VM where safe
**Status:** Accepted / refined by ADR-030  
**Date:** 2026-09-04

Build domain, UI, tests and adapters before production-like infrastructure. A temporary NUC runtime may now be used if resources permit; a dedicated Law VM remains the preferred production-like integration environment.

## ADR-009 — UI direction is light and information-first
**Status:** Accepted  
**Date:** 2026-09-04

Use light layered surfaces, readable widths, strong hierarchy, compact status/navigation, obvious Needs Action states and responsive behaviour. Dark mode is not an initial requirement.

## ADR-010 — Online learning is deferred from V1
**Status:** Accepted / refined by ADR-028  
**Date:** 2026-09-04

Moodle/LMS is an expected later integration, not Document Knowledge Engine V1 runtime.

## ADR-011 — Prompt/build history lives in the repository
**Status:** Accepted  
**Date:** 2026-09-04

Capture material AI-assisted prompts/interpretations in `prompts/` and authoritative decisions here.

## ADR-012 — Person ↔ Company relationship is the core product frame
**Status:** Accepted  
**Date:** 2026-09-05

```text
Person  ↔  PersonCompanyRelationship  ↔  Company
```

A Person has an independent Info Center; a Company has a workspace; the relationship is the controlled context for employment information, records and activity.

## ADR-013 — People are free; companies are the primary paying entity
**Status:** Accepted as current commercial direction  
**Date:** 2026-09-05

People retain free accounts. Companies fund the primary commercial workspace. Exact packages/prices remain configurable.

## ADR-014 — A person's account is independent of employment
**Status:** Accepted  
**Date:** 2026-09-05

Ending a company relationship changes relationship state; it does not delete or transfer the Person account.

## ADR-015 — Company relationship does not grant blanket access to personal information
**Status:** Accepted  
**Date:** 2026-09-05

Company access is explicit, server-authorised and relationship/resource scoped. Specific requests are preferred over broad personal-vault access.

## ADR-016 — Company admin is not universal sensitive-data access
**Status:** Accepted / refined by ADR-020 and ADR-021  
**Date:** 2026-09-05

Support separation of duties such as HR, Payroll, Legal, Management and Billing. Generic admin status does not bypass sensitive-resource policy.

## ADR-017 — Sensitive data classification is a framework capability
**Status:** Accepted  
**Date:** 2026-09-05

Support working classes such as Public, Internal, Personal, Sensitive and Highly Sensitive as policy inputs. They are engineering controls, not a final legal taxonomy.

## ADR-018 — POPIA/privacy must influence architecture from the start
**Status:** Accepted  
**Date:** 2026-09-05

Least privilege, data minimisation, controlled access, retention, offboarding, audit and incident investigation are structural. Technical implementation alone is not proof of legal compliance.

## ADR-019 — Juanity configures record/workflow policy instead of hard-coding record types
**Status:** Accepted  
**Date:** 2026-09-05

Governance defines versioned record/request/workflow definitions. Historic records do not silently inherit changed policy. Security invariants are not ordinary configurable switches.

## ADR-020 — Company members may hold multiple functional roles
**Status:** Accepted  
**Date:** 2026-09-05

Company membership and functional access are separate, many-to-many concepts. One-person companies may combine roles; larger companies may distribute them.

## ADR-021 — Company Owner is governance, not an automatic sensitive-data bypass
**Status:** Accepted  
**Date:** 2026-09-05

Owner manages company membership/roles/settings and may assign functional roles to self. `OWNER` alone does not imply HR/Payroll/Legal record access.

## ADR-022 — Frequent routine actions follow the 3-click / 10-second rule
**Status:** Accepted  
**Date:** 2026-09-05

Frequent routine actions should normally be reachable within three deliberate clicks/taps and about ten seconds, excluding meaningful typing, file upload, legal reading and required security steps.

## ADR-023 — Juanity Law is a document knowledge system and V1 is approved
**Status:** Accepted  
**Date:** 2026-09-05

```text
Definition/version
  ↓
Record
  ↓
File/object
  ↓
Person / Company / Relationship profile projection
  ↓
Retention + review knowledge
  ↓
Access + audit
```

Juanity is a document knowledge system, not a generic file manager, HR suite or case-management platform.

## ADR-024 — Email is primary human-facing login, but Account ID is stable identity
**Status:** Accepted / refined by ADR-027  
**Date:** 2026-09-05

Email is the primary sign-in/contact identifier, but Account/Person use stable internal IDs. Authentication remains behind an OIDC-compatible boundary.

## ADR-025 — Juanity privileged control surface is Governance, not `/admin`
**Status:** Accepted  
**Date:** 2026-09-05

Juanity-only privileged control is **Governance**, initially `/governance`. Route naming is not a security control; verified identity, capability checks, MFA, server authorisation and audit are.

## ADR-026 — External legal professionals use scoped access grants
**Status:** Accepted  
**Date:** 2026-09-05

Lawyers/legal professionals receive explicit, revocable, time-bound access to approved Person ↔ Company relationship records without becoming company members.

## ADR-027 — Social/federated login attaches external identities to a stable Juanity account
**Status:** Accepted as future-ready architecture  
**Date:** 2026-09-05

Use an `AccountIdentity`-style boundary so Google/Microsoft/Apple-style identities can later link to one stable Juanity Account. Never auto-merge accounts solely because provider emails match.

## ADR-028 — Moodle is the expected future company training/onboarding LMS boundary
**Status:** Accepted as future direction; deferred from V1  
**Date:** 2026-09-05

Juanity remains authoritative for identity/company/relationship/access. Moodle owns courses, activities, progress, assessments and LMS-generated certification. Certificates imported into Juanity use the normal Record/RecordFile engine.

## ADR-029 — Document binaries live in separate private S3-compatible object storage
**Status:** Accepted  
**Date:** 2026-09-05

PostgreSQL stores document knowledge, metadata, permissions, retention/review and audit. Actual binaries live in private S3-compatible object storage behind a provider-neutral adapter.

Production rules: no public buckets/permanent public URLs; opaque keys; Juanity authorisation before object access; quarantine/validation/malware scan/checksum before acceptance; independent backup/replication; PostgreSQL remains authoritative for access and retention policy.

See `docs/STORAGE-ARCHITECTURE.md`.

## ADR-030 — NUC may be used as a temporary resource-gated development runtime
**Status:** Accepted  
**Date:** 2026-09-05

The existing NUC may host Juanity **temporarily for development/integration** if disk, RAM, CPU and current workload headroom are acceptable.

Start minimally with:

```text
law-web + PostgreSQL
```

Add S3-compatible development storage, Redis/BullMQ, worker and ClamAV only when required and only if resources remain healthy.

Constraints:

- synthetic data only;
- the NUC is not the Juanity production host;
- the NUC is not the sole backup destination;
- NUC-local storage is not the production object-storage architecture;
- Juanity must remain reproducible from Git/configuration and portable to the dedicated Law VM;
- if existing workloads become unstable, stop the NUC runtime experiment rather than compromising them.

The dedicated Law VM remains the preferred production-like integration environment. Moving from the temporary NUC runtime to that VM must be deployment/configuration work, not redesign.
