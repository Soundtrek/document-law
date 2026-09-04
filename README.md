# Juanity Law

Juanity Law is a secure **document knowledge system** for employment and legal records.

The product is built around:

```text
Person  ↔  PersonCompanyRelationship  ↔  Company
```

- **People sign up for free** and keep a persistent personal account / Info Center.
- **Companies are the primary paying entities** and operate a company workspace / Info Center.
- Company members may hold one or many functional roles such as Owner, HR, Payroll, Clerk/Records, Legal, Manager or Billing.
- A company relationship does not expose a person's unrelated private records.
- Juanity Governance defines versioned record types, retention/review policy and approved role access rather than hard-coding every document workflow.
- Routine work follows the **3-click / 10-second rule** where security and the nature of the task permit it.
- External lawyers/legal professionals receive explicit scoped access grants rather than becoming company members.
- The architecture is prepared for **future Moodle-based company training/onboarding/certification** and **social/federated login**, without making either a V1 dependency.

## Document Knowledge Engine V1

The v1 engine model is approved for implementation.

```text
File
+ Record Definition
+ Person / Company / Relationship context
+ Access policy
+ Retention / review knowledge
+ Activity / audit history
= Document Knowledge
```

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

The engine routes the record to the correct profile, applies Juanity policy, computes retention/review dates, determines authorised roles, records activity/audit and notifies the person where required.

See [`docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md`](docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md).

## Record policy is configurable

Juanity Governance defines versioned record/request/workflow policy instead of hard-coding every record type.

Definitions may include category, context, direction/audience, classification, allowed functional roles, person visibility, acknowledgement/Needs Action behaviour, notification policy, retention policy, review/renewal interval and active/inactive state.

Retention and review are deliberately separate. A record may need replacement while the historic record remains retained.

See [`docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`](docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md).

## Authentication and privileged access

Email address is the primary human-facing login/contact identifier, while Juanity uses a stable internal Account ID so later social/federated identities can link to the same person without duplicating their records or company relationships.

There is no generic `/admin` surface. Juanity-only privileged controls live under **Governance** (`/governance` initially).

See [`docs/AUTHENTICATION-AND-GOVERNANCE.md`](docs/AUTHENTICATION-AND-GOVERNANCE.md).

## Storage architecture

Document binaries do not live in PostgreSQL by default.

```text
PostgreSQL
= document knowledge / metadata / permissions / retention / audit

Private S3-compatible object storage
= document binaries
```

Production object storage is intended to be private and separate from the application-host failure domain. Juanity authorises access before any object is served. Object keys are opaque, uploads pass through quarantine/validation/malware-scan/checksum before acceptance, and primary object storage is not treated as a backup.

See [`docs/STORAGE-ARCHITECTURE.md`](docs/STORAGE-ARCHITECTURE.md).

## Legal-professional access

A lawyer/legal professional may receive an explicit, revocable and time-bound access grant to a defined Person ↔ Company relationship and approved records. They do not become a company member and do not inherit broader company or personal access.

## Future learning and training

Juanity is expected to add company onboarding, training and certification later, with **Moodle currently the leading LMS direction**.

Juanity remains the authority for identity, companies, relationships and access; Moodle remains the learning-delivery engine. Training certificates imported into Juanity use the normal Record/RecordFile engine.

See [`docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md`](docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md).

## Technical direction

Planning baseline:

- Next.js + React + TypeScript
- PostgreSQL + Prisma
- OIDC-compatible identity provider; Keycloak remains the leading self-hosted option
- email-based sign-in from V1 with stable internal Account IDs
- future linked social/federated identity providers
- private S3-compatible object storage
- document-processing/background worker when required
- Redis/BullMQ when asynchronous jobs are required
- ClamAV for external uploads
- SMTP mail adapter
- Caddy
- Docker / Docker Compose
- payment gateway adapter layer
- future Moodle integration through SSO/API boundaries

## Development runtime

Most V1 code should be built directly from the GitHub repository before production-like infrastructure is required.

The existing NUC may be used as a **temporary development/integration host** if a resource check shows adequate disk, RAM and CPU headroom. Start with `law-web + PostgreSQL`; add S3-compatible development storage, Redis/worker and ClamAV only when needed and only if the NUC remains healthy.

The NUC is not the Juanity production host, not the sole backup destination, and not the production object-storage design. Development on it uses synthetic data only.

See [`docs/CODE-BEFORE-VM.md`](docs/CODE-BEFORE-VM.md).

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

**Document Knowledge Engine V1 architecture approved — ready for implementation.**

The immediate build target is GitHub Issue #2. A temporary NUC development runtime is permitted if resource checks pass; migration to a dedicated Law VM must remain deployment/configuration work rather than redesign.
