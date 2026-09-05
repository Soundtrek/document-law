# SAMMA

SAMMA is an employment records and document management system.

**Employment Records & Document Management**

The product is built around:

```text
Person  ↔  PersonCompanyRelationship  ↔  Company
```

- **People sign up for free** and keep a persistent personal account / Info Center.
- **Companies are the primary paying entities** and operate a company workspace / Info Center.
- Company members may hold one or many functional roles such as Owner, HR, Payroll, Clerk/Records, Legal, Manager or Billing.
- A company relationship does not expose a person's unrelated private records.
- SAMMA Governance defines versioned record types, retention/review policy and approved role access rather than hard-coding every document workflow.
- Routine work follows the **3-click / 10-second rule** where security and the nature of the task permit it.
- External lawyers/legal professionals receive explicit scoped access grants rather than becoming company members.
- The architecture is prepared for **future Moodle-based company training/onboarding/certification** and **social/federated login**, without making either a V1 dependency.

## Document Knowledge Engine V1

The V1 foundation is implemented in the repository.

```text
File
+ Record Definition
+ Person / Company / Relationship context
+ Access policy
+ Retention / review knowledge
+ Activity / audit history
= Document Knowledge
```

The implemented domain/application layer covers:

- stable Account and provider-identity boundaries;
- Person, Company, CompanyMember and functional-role grants;
- PersonCompanyRelationship lifecycle;
- versioned RecordDefinition policy;
- Record and RecordFile metadata;
- retention/review date derivation;
- Person, company-employee and Legal Access record projections;
- scoped LegalAccessGrant policy;
- provider-neutral storage with quarantine/accept/reject and SHA-256 metadata;
- record-intake orchestration through authorisation → quarantine → scan → storage acceptance → metadata → audit;
- synthetic development fixtures and negative-access tests.

A normal company workflow is deliberately simple:

```text
Employee profile
  ↓
Add record
  ↓
Choose type + file
  ↓
Save
```

See [`docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md`](docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md).

## Implemented UI foundation

The public `/` route is a SAMMA email entry page with no development navigation.
It validates email format and hands off to the existing `/sign-in` preview;
production email verification and account creation are not implemented yet.
The temporary email handoff stays in browser session storage, is consumed on
arrival, and is never placed in a URL. Privacy, Terms and Help are disabled
placeholders until approved pages exist.

The Next.js application retains synthetic development surfaces for:

- `/sign-in` — email-first identity boundary;
- `/person` — Person Info Center;
- `/company` — Company Info Center;
- `/company/people/alex` — company-side employee relationship profile;
- contextual Add Record workflow;
- Team & Access staff invitation with multi-role assignment;
- scoped Legal Access grant workflow;
- `/legal-access` — restricted external legal view;
- `/governance` — restricted SAMMA Governance shell;
- `/records/[recordId]` — record knowledge/file metadata view;
- `/api/health` — runtime health endpoint.

Governance synthetic data fails closed unless the non-production development identity flag is enabled, and its development principal still passes verified-email, MFA and capability checks.

## Record policy is configurable

SAMMA Governance defines versioned record/request/workflow policy instead of hard-coding every record type.

Definitions may include category, context, direction/audience, classification, allowed functional roles, person visibility, acknowledgement/Needs Action behaviour, notification policy, retention policy, review/renewal interval and active/inactive state.

Retention and review are deliberately separate. A record may need replacement while the historic record remains retained.

See [`docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`](docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md).

## Authentication and privileged access

Email address is the primary human-facing login/contact identifier, while SAMMA uses a stable internal Account ID so later social/federated identities can link to the same person without duplicating their records or company relationships.

There is no generic `/admin` surface. SAMMA-only privileged controls live under **Governance** (`/governance` initially).

See [`docs/AUTHENTICATION-AND-GOVERNANCE.md`](docs/AUTHENTICATION-AND-GOVERNANCE.md).

## Storage architecture

Document binaries do not live in PostgreSQL by default.

```text
PostgreSQL
= document knowledge / metadata / permissions / retention / audit

Private S3-compatible object storage
= document binaries
```

The repository currently implements the provider-neutral storage boundary and a safe in-memory development adapter. Production object storage remains a later runtime integration.

Production object storage is intended to be private and separate from the application-host failure domain. SAMMA authorises access before any object is served. Object keys are opaque, uploads pass through quarantine/validation/malware-scan/checksum before acceptance, and primary object storage is not treated as a backup.

See [`docs/STORAGE-ARCHITECTURE.md`](docs/STORAGE-ARCHITECTURE.md).

## Legal-professional access

A lawyer/legal professional may receive an explicit, revocable and time-bound access grant to a defined Person ↔ Company relationship and approved records. They do not become a company member and do not inherit broader company or personal access.

## Future learning and training

SAMMA is expected to add company onboarding, training and certification later, with **Moodle currently the leading LMS direction**.

SAMMA remains the authority for identity, companies, relationships and access; Moodle remains the learning-delivery engine. Training certificates imported into SAMMA use the normal Record/RecordFile engine.

See [`docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md`](docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md).

## Technical foundation

Implemented/planned stack:

- Next.js 16 + React 19 + TypeScript;
- Node 22 LTS baseline;
- PostgreSQL + Prisma 7 schema/client boundary;
- OIDC-compatible identity boundary; real provider wiring later;
- email-based sign-in model with stable internal Account IDs;
- future linked social/federated identity providers;
- private S3-compatible object-storage boundary;
- upload scanning interface; ClamAV integration later;
- background jobs via Redis/BullMQ only when required;
- SMTP mail adapter later;
- Caddy for runtime HTTPS/routing later;
- Docker / Docker Compose development bootstrap;
- payment gateway adapter layer later;
- future Moodle integration through SSO/API boundaries.

## Development runtime

The repository contains a deliberately small initial development stack:

```text
law-web
+
PostgreSQL
```

`infrastructure/docker/compose.dev.yml` is intended for the first NUC/runtime proof. It uses synthetic data, development identity and memory storage so Redis, S3-compatible development storage and ClamAV do not consume resources before they are needed.

The existing NUC may be used as a **temporary development/integration host** if a resource check shows adequate disk, RAM and CPU headroom. The NUC is not the SAMMA production host, not the sole backup destination, and not the production object-storage design.

See [`docs/CODE-BEFORE-VM.md`](docs/CODE-BEFORE-VM.md).

## Validation status

Current V1 pre-infrastructure foundation: **PASS**.

GitHub Actions validates:

- dependency installation;
- Prisma client generation;
- Prisma schema validation;
- domain, identity, storage and record-intake unit tests;
- strict TypeScript typecheck;
- ESLint;
- full Next.js production build.

The latest current-main validation passed all gates.

## Repository guide

- [`AGENTS.md`](AGENTS.md) — Codex/AI-assisted implementation rules
- [`docs/PROJECT-CHARTER.md`](docs/PROJECT-CHARTER.md) — product scope
- [`docs/APPLICATION-FRAMEWORK.md`](docs/APPLICATION-FRAMEWORK.md) — domain/application frame
- [`docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md`](docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md) — approved engine model
- [`docs/STORAGE-ARCHITECTURE.md`](docs/STORAGE-ARCHITECTURE.md) — approved storage split
- [`docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`](docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md) — definitions, roles and 3-click rule
- [`docs/AUTHENTICATION-AND-GOVERNANCE.md`](docs/AUTHENTICATION-AND-GOVERNANCE.md) — identity and Governance access
- [`docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md`](docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md) — Moodle and social-login readiness
- [`docs/STACK-DESIGN.md`](docs/STACK-DESIGN.md) — technical stack
- [`docs/BUILD-PLAN.md`](docs/BUILD-PLAN.md) — phased implementation
- [`docs/CODE-BEFORE-VM.md`](docs/CODE-BEFORE-VM.md) — repository-first build and optional NUC runtime
- [`docs/SECURITY-FOUNDATION.md`](docs/SECURITY-FOUNDATION.md) — security/privacy invariants
- [`docs/DISASTER-RECOVERY.md`](docs/DISASTER-RECOVERY.md) — recovery plan
- [`docs/DECISION-LOG.md`](docs/DECISION-LOG.md) — architecture decisions
- [`prompts/PROMPT-CAPTURE.md`](prompts/PROMPT-CAPTURE.md) — prompt/build history

## Current status

**V1 pre-infrastructure foundation implemented and CI validated.**

Next runtime/integration work is deliberately separate: PostgreSQL migration/runtime bring-up, real OIDC/email verification/MFA, persistent S3-compatible storage + malware scanning, SMTP invitations/notifications, payment sandbox, backup/restore automation and later social-login/Moodle integrations.
