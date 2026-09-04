# Juanity Law

Juanity Law is a secure, paid client information and legal-work portal being designed around an **Info Center** experience.

The repository is intentionally being established in two stages:

1. **Platform framework first** — identity boundary, organisations, users, matters, requests, activity, billing/entitlements, UI system, security, deployment and recovery.
2. **Document engine second** — the document domain is deliberately not locked in until its legal workflows, retention, sharing and audit requirements have been discussed and approved.

## Current product frame

The application is expected to grow around:

- Info Center / dashboard
- users and organisations
- matters
- requests and actions
- documents and shares (domain design pending)
- activity / audit history
- subscriptions, products and entitlements
- administration

Online learning is **out of scope for the current architecture pass**.

## Development principle

Build as much as possible before provisioning a runtime VM **without faking production-critical boundaries**. Code may be written against adapters and contracts, but real external sharing, production identity, payment webhooks, persistent object storage, backups and security validation move to a dedicated Law development VM.

The existing NUC is not a Juanity Law runtime target.

## Repository guide

- [`AGENTS.md`](AGENTS.md) — rules for Codex/AI-assisted implementation
- [`docs/PROJECT-CHARTER.md`](docs/PROJECT-CHARTER.md) — scope and product boundaries
- [`docs/APPLICATION-FRAMEWORK.md`](docs/APPLICATION-FRAMEWORK.md) — app/domain frame
- [`docs/STACK-DESIGN.md`](docs/STACK-DESIGN.md) — proposed technical stack
- [`docs/BUILD-PLAN.md`](docs/BUILD-PLAN.md) — phased implementation plan
- [`docs/DEVELOPMENT-GUARDRAILS.md`](docs/DEVELOPMENT-GUARDRAILS.md) — build constraints and approval gates
- [`docs/UI-DESIGN-SYSTEM.md`](docs/UI-DESIGN-SYSTEM.md) — Info Center inspired UI direction
- [`docs/SECURITY-FOUNDATION.md`](docs/SECURITY-FOUNDATION.md) — security invariants
- [`docs/DISASTER-RECOVERY.md`](docs/DISASTER-RECOVERY.md) — backup and recovery plan
- [`docs/SKILLS.md`](docs/SKILLS.md) — implementation skill map
- [`docs/DECISION-LOG.md`](docs/DECISION-LOG.md) — accepted architecture decisions
- [`prompts/PROMPT-CAPTURE.md`](prompts/PROMPT-CAPTURE.md) — prompt/build-history discipline

## Current status

**Planning / support-document bootstrap.**

No document-engine schema or implementation should be treated as approved yet.
