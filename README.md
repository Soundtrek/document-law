# Juanity Law

Juanity Law is a secure, paid employment/legal information portal built around an **Info Center** experience.

The commercial and product model is now:

- **People sign up for free** and keep a persistent personal account / Info Center.
- **Companies are the primary paying entities** and operate a company workspace / Info Center.
- A controlled **Person ↔ Company relationship** connects the two sides.
- Requests, information exchange, employment records and later document sharing flow through that relationship.
- Sensitive employment and legal information requires privacy, POPIA-aware design, least privilege and strong auditability from the start.
- **Juanity Platform Admin defines approved record/workflow rules; companies execute them.** Record types and daily workflow policy should be configuration-driven rather than hard-coded where practical.
- **Company members may hold one or many functional roles** such as Owner, HR, Payroll, Clerk/Records, Legal, Manager or Billing.
- **Frequent routine actions follow the 3-click / 10-second rule** where security and the nature of the task permit it.

The repository is intentionally being established in two stages:

1. **Platform framework first** — identity boundary, people, companies, relationships, company membership/roles, requests/actions, activity/audit, billing/entitlements, configurable workflow definitions, UI system, security, deployment and recovery.
2. **Document engine second** — the document domain is deliberately not locked in until its legal/employment workflows, classification, retention, sharing, access and audit requirements have been discussed and approved.

## Current product frame

```text
PERSON                               COMPANY
Free account                         Paid workspace
    │                                    │
Personal Info Center              Company Info Center
    │                                    │
    └────── Person/Company Relationship ─┘
                     │
            Requests / Actions
            Employment records
            Information sharing
            Document capability (TBD)
            Activity / Audit
```

Company access is additionally controlled by membership and functional role grants:

```text
Company
  └── Members
        ├── Owner / governance
        ├── HR
        ├── Payroll
        ├── Clerk / Records
        ├── Legal
        ├── Manager
        └── Billing / other approved roles
```

One person may hold several roles. A small company owner may perform all functions; a larger company may split them across staff.

The application is expected to grow around:

- Person Info Center
- Company Info Center
- people and company accounts
- company members, invitations and functional roles
- person/company relationships
- requests and actions
- configurable record/request definitions
- employment/legal record context
- documents and shares — domain design pending
- activity / audit history
- subscriptions, products and entitlements
- Juanity Platform Admin and company administration

A generic legal `Matter` may be introduced later if a real workflow requires it, but it is **not a foundational v1 entity**.

Online learning is **out of scope for the current architecture pass**.

## Configurable workflow direction

Juanity should be able to define record/request types and their approved behaviour in Platform Admin, including categories, context, direction/audience, sensitivity, allowed roles, acknowledgement/Needs Action behaviour, notification policy and later retention-policy references.

These definitions must be **versioned** so a later rule change does not silently rewrite the policy governing historic records.

Companies then use the approved definitions rather than repeatedly configuring security details for every record.

See [`docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`](docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md).

## 3-click / 10-second UX rule

A frequent routine action should normally be reachable from its relevant context in **no more than three deliberate clicks/taps** and be completable in **about ten seconds**, excluding meaningful typing, file selection/upload, reading legal content or required security steps.

The rule applies to high-frequency daily work, not every complex admin or security workflow.

## Security and privacy direction

Juanity Law may hold highly sensitive personal and employment information such as payslips, identity information, banking confirmations, disciplinary records, hearing outcomes and legal correspondence.

Therefore:

- company membership must never imply unrestricted access to all employee information;
- company Owner/Admin is not an automatic universal sensitive-record bypass;
- functional roles and server-side capabilities determine access;
- authorisation is server-side and relationship/resource scoped;
- sensitive actions must be auditable;
- data minimisation, purpose, retention and offboarding must be designed explicitly;
- the application must support a POPIA-aware operating model, with final legal/compliance policies reviewed before production.

## Development principle

Build as much as possible before provisioning a runtime VM **without faking production-critical boundaries**. Code may be written against adapters and contracts, but real external sharing, production identity, payment webhooks, persistent object storage, backups and security validation move to a dedicated Law development VM.

The existing NUC is not a Juanity Law runtime target.

## Repository guide

- [`AGENTS.md`](AGENTS.md) — rules for Codex/AI-assisted implementation
- [`docs/PROJECT-CHARTER.md`](docs/PROJECT-CHARTER.md) — scope and product boundaries
- [`docs/APPLICATION-FRAMEWORK.md`](docs/APPLICATION-FRAMEWORK.md) — app/domain frame
- [`docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md`](docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md) — Juanity record definitions, company membership/roles and 3-click rule
- [`docs/STACK-DESIGN.md`](docs/STACK-DESIGN.md) — proposed technical stack
- [`docs/BUILD-PLAN.md`](docs/BUILD-PLAN.md) — phased implementation plan
- [`docs/CODE-BEFORE-VM.md`](docs/CODE-BEFORE-VM.md) — code that can be built safely before the dedicated VM
- [`docs/DEVELOPMENT-GUARDRAILS.md`](docs/DEVELOPMENT-GUARDRAILS.md) — build constraints and approval gates
- [`docs/UI-DESIGN-SYSTEM.md`](docs/UI-DESIGN-SYSTEM.md) — Info Center inspired UI direction
- [`docs/SECURITY-FOUNDATION.md`](docs/SECURITY-FOUNDATION.md) — security/privacy invariants
- [`docs/DISASTER-RECOVERY.md`](docs/DISASTER-RECOVERY.md) — backup and recovery plan
- [`docs/SKILLS.md`](docs/SKILLS.md) — implementation skill map
- [`docs/DECISION-LOG.md`](docs/DECISION-LOG.md) — accepted architecture decisions
- [`prompts/PROMPT-CAPTURE.md`](prompts/PROMPT-CAPTURE.md) — prompt/build-history discipline

## Current status

**Planning / support-document bootstrap.**

The Person ↔ Company ↔ Relationship product frame, configurable Juanity-admin workflow direction, multi-role company membership model and 3-click / 10-second routine-action rule are approved as the current foundation.

No final document-engine storage schema or implementation should be treated as approved yet.
