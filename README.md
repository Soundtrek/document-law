# SAMMA

SAMMA is an employment records and document management system.

Keycloak public registration, verified email and password recovery are enabled.
Actual verification/reset mailbox checks pass. Application registration improvements
await experiment review and approved DEV integration; see the
[auth registration V1 report](docs/AUTH-REGISTRATION-V1-REPORT.md).

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

The public `/` and `/onboarding` routes offer Person and Company account entry.
Both use real Keycloak authentication. Person establishes a free independent
Account/Person and opens `/person`. Company continues to a company-name form at
`/onboarding/company`, then creates the workspace, active membership and approved
OWNER role together before opening `/company`. Existing members can use both Info
Centers; normal Person navigation does not offer Create Company.

The experiment awaits approval before integration to `dev`. Keycloak DEV public
self-registration and recovery remain disabled; SMTP is not configured. Validation
uses disposable verified provider identities, with no SAMMA password handling.

The Next.js application provides authenticated, Account-scoped surfaces for:

- `/sign-in` — email-first identity boundary;
- `/person` — Person Info Center;
- `/company` — Company Info Center;
- `/legal-access` — restricted external legal view;
- `/governance` — restricted SAMMA Governance shell;
- `/records/[recordId]` — record knowledge/file metadata view;
- `/api/health` — runtime health endpoint.

Legacy demo employee, Add Record, invitation and Legal Access grant URLs require
authentication and deny access until real scoped workflows are implemented.
Public synthetic identity is disabled. Automated tests retain explicit synthetic
fixtures; Governance uses current SAMMA capability grants.

## Record policy is configurable

SAMMA Governance defines versioned record/request/workflow policy instead of hard-coding every record type.

Definitions may include category, context, direction/audience, classification, allowed functional roles, person visibility, acknowledgement/Needs Action behaviour, notification policy, retention policy, review/renewal interval and active/inactive state.

Retention and review are deliberately separate. A record may need replacement while the historic record remains retained.

See [`docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`](docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md).

## Authentication and privileged access

Email address is the primary human-facing login/contact identifier, while SAMMA uses a stable internal Account ID so later social/federated identities can link to the same person without duplicating their records or company relationships.

There is no generic `/admin` surface. SAMMA-only privileged controls live under **Governance** (`/governance` initially).

The public DEV deployment uses pinned Keycloak 26.7.3, realm `samma`, client
`samma-web`, and issuer `https://auth.samma.co.za/realms/samma`. AccountIdentity
binds issuer and provider subject to a stable Account; matching email never
silently merges accounts. SAMMA owns authorisation and revocable database
sessions; Keycloak owns passwords and provider authentication.

The initial Governance Owners are phil@samma.co.za and juanita@samma.co.za, each
with the ten explicit SAMMA capabilities and no universal record-access bypass.
Their administratively verified email is a controlled DEV bootstrap exception.
MFA is supported but temporarily unenforced in DEV. Governance MFA must be
enabled and tested before any real employment/legal records are introduced.

See [`docs/AUTHENTICATION-AND-GOVERNANCE.md`](docs/AUTHENTICATION-AND-GOVERNANCE.md).

## Storage architecture

Document binaries do not live in PostgreSQL by default.

```text
PostgreSQL
= document knowledge / metadata / permissions / retention / audit

Private S3-compatible object storage
= document binaries
```

The repository implements a provider-neutral S3 adapter, with private Garage persistence on the USB archive for synthetic DEV files. The memory adapter is retained for isolated tests/local development. Production object-storage approval remains separate.

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
- Keycloak OIDC authentication with Auth.js and database sessions;
- email-based sign-in model with stable internal Account IDs;
- future linked social/federated identity providers;
- private S3-compatible object-storage boundary;
- upload scanning interface; ClamAV integration later;
- background jobs via Redis/BullMQ only when required;
- SMTP mail adapter later;
- Caddy for public SAMMA and Keycloak HTTPS routing;
- Docker / Docker Compose development bootstrap;
- payment gateway adapter layer later;
- future Moodle integration through SSO/API boundaries.

## Development runtime

The public NUC development stack runs:

```text
SAMMA web + application PostgreSQL + private Garage
Keycloak + separate private PostgreSQL
```

Use `infrastructure/docker/compose.nuc.yml`, `compose.garage.yml` and `compose.keycloak.yml` through
their archive-checking wrappers. Runtime secrets live outside Git in
`/etc/samma-dev/` and the ignored `.env.nuc`. The web runs a production build with
development identity disabled. The original `compose.dev.yml` is a historical
scaffold and is not the public deployment configuration. Records remain
synthetic; private file storage persists in Garage with explicit `NOT_SCANNED_DEV`.

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

Local authentication handoff validation passed generation/schema checks, tests,
typecheck, lint and production build. GitHub CI remains blocked at the existing
Prisma transitive-dependency audit (`deepmerge-ts`/`mysql2`); its later steps did
not run. See [the current report](docs/REAL-AUTHENTICATION-V1-REPORT.md).

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

**Real Authentication V1 and persistent private S3 storage are deployed for DEV; owner onboarding remains partial.**

See [authentication](docs/REAL-AUTHENTICATION-V1.md) and
[deployment evidence](docs/NUC-DEV-DEPLOYMENT.md) for validation and remaining
owner password-change steps. SMTP verification/recovery, enforced Governance
MFA, malware scanning, production object-storage approval, payments, off-host recovery
automation and social-login/Moodle integrations remain separate work.

### Persistent documents (synthetic DEV)

The S3 adapter and Garage DEV runbook provide persistent private document files
with authenticated upload/download and immutable file history. Uploads stream
through SAMMA using bounded USB staging; checksums persist in PostgreSQL. DEV
files explicitly say `NOT_SCANNED_DEV`, never malware-clean. Memory remains an
isolated test/development adapter, with no deployed runtime fallback.

Use `/api/health` for liveness and `/api/ready` for database/storage readiness.
No public bucket, browser S3 credentials or permanent document URLs are used.
This remains synthetic-only: malware scanning and tested off-host backup/restore
are required before sensitive production use. See the
[storage runbook](docs/PERSISTENT-STORAGE-V1-DEPLOYMENT.md) and
[full preflight](docs/PERSISTENT-STORAGE-V1-PLAN.md).
