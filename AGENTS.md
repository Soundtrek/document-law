# Juanity Law — AI / Codex Working Rules

This file governs AI-assisted work in this repository.

## 1. Product boundary

Juanity Law is a new application. Do not couple it to another product runtime, schema, authentication system, database or package model.

External projects may be used only as design learning unless an explicit extraction/reuse decision is approved.

## 2. Current architecture freeze

The **document engine is not yet designed or approved**.

Until that discussion is complete, do not:

- invent a final document schema;
- build document retention rules;
- choose a signing provider;
- implement legal sharing semantics;
- hard-code document types;
- build a document permissions model that could constrain later design.

Neutral interfaces/placeholders are allowed where needed to keep surrounding application architecture clean.

## 3. Build style

Prefer a modular monolith first.

- TypeScript-first.
- Keep domain logic out of React components.
- Keep infrastructure behind adapters.
- Keep billing gateways behind adapters.
- Keep identity behind an OIDC/session boundary.
- Keep storage behind an object-storage interface.
- Treat audit/activity as a first-class domain capability.

Do not introduce microservices, Kubernetes, Elasticsearch, event streaming or other infrastructure without a demonstrated requirement.

## 4. No hard-coded owner/business values

Product-controlled values belong in configuration/admin data where practical. System invariants may remain in code.

Examples of product-controlled values:

- prices;
- subscription limits;
- entitlement values;
- user-facing notices;
- branding values;
- expiry policies where business-configurable.

## 5. Security invariants

Never bypass tenant/organisation and resource authorisation for convenience.

Do not expose storage buckets publicly.

Do not trust client-provided role, tenant, entitlement or ownership fields.

All privileged actions must be server-authorised and produce an auditable event where relevant.

Secrets never belong in Git.

## 6. Development environment constraint

The existing NUC is not a Juanity Law runtime target.

Build code and lightweight tests without provisioning the full stack where possible. Real integration of identity, persistent object storage, outbound mail, payment webhooks, HTTPS, external sharing and disaster recovery belongs on the dedicated Law development VM.

## 7. Validation discipline

Use focused validation proportional to the change.

Default loop:

1. inspect only the affected area;
2. implement the smallest coherent change;
3. run targeted type/lint/unit/integration checks;
4. broaden testing only when blast radius justifies it;
5. report exact files changed and validation performed.

Avoid expensive repository-wide scans or repeated exhaustive checking unless the change requires it.

## 8. Approval gates

Do not silently expand scope.

Material decisions requiring owner approval include:

- document-engine domain design;
- production identity provider configuration;
- payment provider selection/production wiring;
- data retention/destruction policy;
- encryption/key-management architecture;
- external sharing/access model;
- production hosting region/provider;
- major dependency or framework replacement.

## 9. UI direction

The application uses a light, calm, information-first Info Center pattern:

- constrained readable page width;
- clear heading and status hierarchy;
- cards for meaningful groups, not decorative nesting;
- pill/tabs for compact workflow navigation and status;
- visible action-required states;
- responsive desktop/tablet/mobile behaviour;
- no mandatory dark mode in the initial product.

See `docs/UI-DESIGN-SYSTEM.md`.

## 10. Prompt and decision capture

Significant implementation prompts and accepted decisions must be added to the repository using `prompts/PROMPT-CAPTURE.md` and `docs/DECISION-LOG.md`.

The repository should preserve *why* a system was built, not only the resulting code.
