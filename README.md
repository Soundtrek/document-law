# Juanity Law

Juanity Law is a secure, paid employment/legal information portal built around an **Info Center** experience.

The commercial and product model is now:

- **People sign up for free** and keep a persistent personal account / Info Center.
- **Companies are the primary paying entities** and operate a company workspace / Info Center.
- A controlled **Person ↔ Company relationship** connects the two sides.
- Requests, information exchange, employment records and later document sharing flow through that relationship.
- Sensitive employment and legal information requires privacy, POPIA-aware design, least privilege and strong auditability from the start.

The repository is intentionally being established in two stages:

1. **Platform framework first** — identity boundary, people, companies, relationships, requests/actions, activity/audit, billing/entitlements, UI system, security, deployment and recovery.
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

The application is expected to grow around:

- Person Info Center
- Company Info Center
- people and company accounts
- company users and permissions
- person/company relationships
- requests and actions
- employment/legal record context
- documents and shares — domain design pending
- activity / audit history
- subscriptions, products and entitlements
- administration

A generic legal `Matter` may be introduced later if a real workflow requires it, but it is **not a foundational v1 entity**.

Online learning is **out of scope for the current architecture pass**.

## Security and privacy direction

Juanity Law may hold highly sensitive personal and employment information such as payslips, identity information, banking confirmations, disciplinary records, hearing outcomes and legal correspondence.

Therefore:

- company membership must never imply unrestricted access to all employee information;
- company admins must not automatically become universal readers of sensitive records;
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

The Person ↔ Company ↔ Relationship product frame is approved as the current foundation.

No final document-engine schema or implementation should be treated as approved yet.
