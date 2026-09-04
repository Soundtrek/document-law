# Code We Can Build Before the Law VM

## Objective

Maximise useful implementation before provisioning infrastructure, while preserving production-grade boundaries so the VM phase is integration rather than rewrite.

## Safe code tranche A — foundation

Build immediately:

- workspace/monorepo configuration;
- Next.js application shell;
- TypeScript strict configuration;
- lint/format/test configuration;
- environment validation contract;
- common error/result types;
- shared UI tokens/components;
- route/layout structure;
- CI for typecheck/lint/unit tests.

No infrastructure compromise is required for this work.

## Safe code tranche B — domain modules

Build domain/application logic for:

### Organisations

- organisation lifecycle;
- membership;
- role/capability assignment interfaces;
- status.

### Users / actors

- local actor mapping;
- profile/preferences required by the app;
- development identity provider adapter.

### Matters

- create/update/status;
- participant relationships;
- matter visibility policy interfaces.

### Requests / actions

- create/assign/complete/cancel/expire state model;
- due dates where approved;
- matter linkage;
- activity generation.

### Activity / audit

- append-only event interface;
- user-friendly activity projections;
- actor/resource/context metadata.

### Billing / entitlements

- products;
- prices;
- subscriptions;
- payment-record domain;
- entitlement grants/limits;
- fake gateway adapter for tests.

Do not hard-code final commercial package values while the product model is still being designed.

## Safe code tranche C — UI

Build against development fixtures/adapters:

- client Info Center;
- My Matters list;
- matter detail shell;
- needs-action panel;
- request/action views;
- recent activity;
- account shell;
- billing/subscription shell;
- internal workspace shell;
- matters administration;
- clients/organisation administration;
- users/role administration;
- generic admin settings shell.

The document navigation entry can remain hidden/reserved until the document domain is approved.

## Safe code tranche D — permission system

Build and test:

- capability registry for approved non-document capabilities;
- policy evaluation interface;
- organisation membership checks;
- matter access checks;
- admin privilege checks;
- deny-by-default behaviour;
- test matrix for horizontal/vertical access attempts.

This work must not depend on the identity provider vendor.

## Safe code tranche E — infrastructure contracts

Define and test interfaces/adapters for:

- identity provider;
- mail sender;
- payment gateway;
- storage provider;
- clock/time provider where useful for deterministic tests;
- audit sink;
- job dispatcher.

Development implementations may be in-memory/logging/filesystem where safe, provided domain code consumes only the interface.

## Optional local persistence

If a developer workstation can comfortably run PostgreSQL, use it for migration/integration validation. The codebase must not require the existing NUC.

A temporary SQLite substitution is **not** preferred if it would hide PostgreSQL-specific constraints or migration behaviour.

## Stop line before the VM

Move to the dedicated Law development VM before declaring these behaviours integrated:

- real OIDC login/account recovery/MFA;
- real outbound email;
- real payment sandbox callbacks/webhooks;
- public webhook ingress;
- persistent S3-compatible object storage;
- real external file uploads;
- malware scanning;
- external document/recipient links;
- Caddy/TLS/domain behaviour;
- backup automation;
- restore drills;
- infrastructure monitoring;
- production-like secret management.

## Document-engine stop line

Before any document-engine implementation beyond neutral interfaces, complete and approve the legal document domain design.

That discussion must cover at minimum:

1. ownership and tenancy;
2. relationship to matters;
3. document/request/share distinctions;
4. versioning and replacement;
5. recipient model;
6. access/view/download controls;
7. expiry/revocation;
8. acknowledgement/evidence requirements;
9. audit trail;
10. retention/destruction;
11. upload quarantine/scanning;
12. storage/index/checksum model;
13. later signing/redaction boundaries.

## Target pre-VM milestone

A valuable first end-to-end workflow that does not depend on documents:

```text
Development login
  ↓
Create organisation
  ↓
Create matter
  ↓
Add participant
  ↓
Create request/action
  ↓
Client sees Needs Action
  ↓
Client completes action
  ↓
Matter timeline records it
  ↓
Entitlement/permission rules remain enforced
```

If that works cleanly, the application framework is ready for the document-engine design and subsequent VM integration.
