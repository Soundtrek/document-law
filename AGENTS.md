# Juanity Law — AI / Codex Working Rules

This file governs AI-assisted work in this repository.

## 1. Product boundary

Juanity Law is a new application. Do not couple it to another product runtime, schema, authentication system, database or package model.

External projects may be used only as design learning unless an explicit extraction/reuse decision is approved.

## 2. Current product model

The approved framework foundation is:

```text
Person  ↔  PersonCompanyRelationship  ↔  Company
```

- People have independent accounts and are expected to sign up/use the core person experience for free.
- Companies are the primary paid tenants/workspaces.
- The relationship is the controlled bridge for employment context, requests, actions, later records/documents and audit.
- Ending a relationship must not delete or transfer ownership of the person's account.
- A generic legal `Matter` is not a mandatory v1 root entity. Add it only if an approved workflow requires it.

Do not silently revert the application to a matter-first architecture.

## 3. Document architecture freeze

The **document engine is not yet designed or approved**.

Until that discussion is complete, do not:

- invent a final document schema;
- build document retention rules;
- choose a signing provider;
- implement final legal/employment sharing semantics;
- hard-code document types;
- build a document permissions model that could constrain later design;
- assume that uploader, person, company, technical owner and legal owner are the same concept;
- implement blanket company access to a person's private document store.

Neutral interfaces/placeholders are allowed where needed to keep surrounding application architecture clean.

The future design must explicitly address personal records, company records and relationship-context employment/legal records without assuming their final database representation.

## 4. Build style

Prefer a modular monolith first.

- TypeScript-first.
- Keep domain logic out of React components.
- Keep infrastructure behind adapters.
- Keep billing gateways behind adapters.
- Keep identity behind an OIDC/session boundary.
- Keep storage behind an object-storage interface.
- Treat permissions, classification and audit/activity as first-class domain capabilities.

Do not introduce microservices, Kubernetes, Elasticsearch, event streaming or other infrastructure without a demonstrated requirement.

## 5. No hard-coded owner/business values

Product-controlled values belong in configuration/admin data where practical. System invariants may remain in code.

Examples of product-controlled values:

- prices;
- subscription limits;
- entitlement values;
- user-facing notices;
- branding values;
- approved role/capability assignments;
- expiry/retention policies where business-configurable and legally approved.

The current commercial direction is free person accounts and paid company workspaces. Do not invent final packages/prices.

## 6. Security and privacy invariants

Juanity Law is expected to carry sensitive employment/legal information.

Never bypass company/tenant, relationship and resource authorisation for convenience.

Do not expose storage buckets publicly.

Do not trust client-provided company, relationship, role, classification, entitlement or ownership fields.

Company membership or company `admin` must not automatically grant universal access to sensitive person/employee records.

All privileged actions must be server-authorised and produce an auditable event where relevant.

Secrets never belong in Git.

Do not place real employee/client sensitive data in source, fixtures, screenshots or tests. Use synthetic data.

Do not log salary, banking details, ID values, disciplinary/legal narrative, document contents or other unnecessary personal information.

The architecture should support a POPIA-aware operating model, but do not claim technical implementation alone equals legal compliance.

## 7. Person independence and offboarding

A person's account is independent from a company relationship.

Do not implement offboarding as `delete employee`.

Preferred framework behaviour:

```text
Relationship ACTIVE
      ↓
Relationship ENDED / FORMER
      ↓
Active relationship access revoked
Person account remains
Historical/audit context preserved according to policy
```

Final retention and former-employee document access remain part of the document/data-governance design gate.

## 8. Requests before blanket access

Where a company needs information from a person, prefer explicit request/action workflows instead of broad access to the person's private information store.

Do not create convenience access that defeats data minimisation or relationship scoping.

## 9. Development environment constraint

The existing NUC is not a Juanity Law runtime target.

Build code and lightweight tests without provisioning the full stack where possible. Real integration of identity, persistent object storage, outbound mail, payment webhooks, HTTPS, external sharing and disaster recovery belongs on the dedicated Law development VM.

## 10. Validation discipline

Use focused validation proportional to the change.

Default loop:

1. inspect only the affected area;
2. implement the smallest coherent change;
3. run targeted type/lint/unit/integration checks;
4. broaden testing only when blast radius justifies it;
5. report exact files changed and validation performed.

Avoid expensive repository-wide scans or repeated exhaustive checking unless the change requires it.

Security-sensitive domain changes must include relevant negative access tests, not only happy paths.

## 11. Approval gates

Do not silently expand scope.

Material decisions requiring owner approval include:

- document-engine domain design;
- production identity provider configuration;
- payment provider selection/production wiring;
- data retention/destruction/legal-hold policy;
- encryption/key-management architecture;
- external sharing/access model;
- sensitive company role access model beyond framework hooks;
- production hosting region/provider;
- responsible-party/operator assumptions;
- legal notice/consent/privacy wording;
- major dependency or framework replacement.

## 12. UI direction

The application uses a light, calm, information-first Info Center pattern.

There are two primary experiences:

- Person Info Center;
- Company Info Center/workspace.

Use:

- constrained readable person page width;
- clear heading and status hierarchy;
- cards for meaningful groups, not decorative nesting;
- pill/tabs for compact workflow navigation and status;
- visible action-required states;
- clear relationship state such as Active/Former;
- careful presentation/masking of sensitive information;
- responsive desktop/tablet/mobile behaviour;
- no mandatory dark mode in the initial product.

See `docs/UI-DESIGN-SYSTEM.md`.

## 13. Prompt and decision capture

Significant implementation prompts and accepted decisions must be added to the repository using `prompts/PROMPT-CAPTURE.md` and `docs/DECISION-LOG.md`.

The repository should preserve *why* a system was built, not only the resulting code.
