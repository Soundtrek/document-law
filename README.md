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

The engine then routes the record to the correct profile, applies Juanity policy, computes retention/review dates, determines authorised roles, records audit/activity and notifies the person where required.

The person sees the record in their Info Center/company relationship. Authorised company users see the relationship-shared record on the employee profile.

See [`docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md`](docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md).

## Record policy is configurable

Juanity Governance defines versioned record/request/workflow policy instead of hard-coding every record type.

Definitions may include:

- category;
- Person / Company / Relationship context;
- direction/audience;
- working classification/sensitivity;
- allowed company functional roles;
- person visibility;
- acknowledgement / Needs Action behaviour;
- notification policy;
- retention policy;
- review/renewal interval;
- active/inactive state.

Retention and review are deliberately separate. A record may need replacement while the historic record remains retained.

See [`docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`](docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md).

## Authentication and privileged access

Email address is the primary login identifier from the start.

There is no generic `/admin` surface. Juanity-only privileged controls live under **Governance** (`/governance` initially).

Governance access is protected by server-side capabilities, verified identity, MFA, audit and deny-by-default policy. The route name is not treated as a security control.

Company Owner/governance is separate from Juanity Governance. Company Owners manage only their own team/access and may assign approved functional roles to their staff or themselves.

See [`docs/AUTHENTICATION-AND-GOVERNANCE.md`](docs/AUTHENTICATION-AND-GOVERNANCE.md).

## Legal-professional access

A lawyer/legal professional may receive an explicit, revocable and time-bound access grant to a defined Person ↔ Company relationship and approved records.

They do not become a company member and do not inherit broader company or personal access.

## Security and privacy direction

Juanity Law may hold highly sensitive personal and employment information such as payslips, identity information, banking confirmations, disciplinary records, hearing outcomes and legal correspondence.

Therefore:

- company membership must never imply unrestricted access to all employee information;
- Company Owner is not an automatic universal sensitive-record bypass;
- authorisation is server-side and context/resource scoped;
- sensitive access must be auditable;
- private object storage is the default;
- uploads pass through validation/quarantine/malware scanning when real storage is integrated;
- data minimisation, retention, offboarding and incident investigation are structural concerns;
- the application must support a POPIA-aware operating model, with final legal/compliance policies reviewed before production.

## Technical direction

Planning baseline:

- Next.js + React + TypeScript
- PostgreSQL + Prisma
- OIDC-compatible identity provider; Keycloak remains the leading self-hosted option
- email-based sign-in identity
- S3-compatible private object storage
- document-processing/background worker when required
- Redis/BullMQ when asynchronous jobs are required
- ClamAV for external uploads
- SMTP mail adapter
- Caddy
- Docker / Docker Compose
- payment gateway adapter layer

The existing NUC is not a Juanity Law runtime target.

## Repository guide

- [`AGENTS.md`](AGENTS.md) — Codex/AI-assisted implementation rules
- [`docs/PROJECT-CHARTER.md`](docs/PROJECT-CHARTER.md) — product scope
- [`docs/APPLICATION-FRAMEWORK.md`](docs/APPLICATION-FRAMEWORK.md) — domain/application frame
- [`docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md`](docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md) — approved engine model
- [`docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`](docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md) — definitions, roles and 3-click rule
- [`docs/AUTHENTICATION-AND-GOVERNANCE.md`](docs/AUTHENTICATION-AND-GOVERNANCE.md) — email identity and Governance access
- [`docs/STACK-DESIGN.md`](docs/STACK-DESIGN.md) — technical stack
- [`docs/BUILD-PLAN.md`](docs/BUILD-PLAN.md) — phased implementation
- [`docs/CODE-BEFORE-VM.md`](docs/CODE-BEFORE-VM.md) — safe pre-VM build scope
- [`docs/SECURITY-FOUNDATION.md`](docs/SECURITY-FOUNDATION.md) — security/privacy invariants
- [`docs/DISASTER-RECOVERY.md`](docs/DISASTER-RECOVERY.md) — recovery plan
- [`docs/DECISION-LOG.md`](docs/DECISION-LOG.md) — architecture decisions
- [`prompts/PROMPT-CAPTURE.md`](prompts/PROMPT-CAPTURE.md) — prompt/build history

## Current status

**Document Knowledge Engine V1 architecture approved — ready for implementation.**

Production retention values, final POPIA/legal policy wording, production hosting/provider choices and live infrastructure configuration remain controlled approval gates rather than hard-coded assumptions.
