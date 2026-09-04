# Code We Can Build Before the Law VM

## Objective

Maximise useful implementation before provisioning infrastructure, while preserving production-grade privacy/security boundaries so the VM phase is integration rather than rewrite.

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

### People

- persistent person account/domain record;
- profile/preferences required by the app;
- account status;
- development identity provider adapter;
- Person Info Center projection interfaces.

Do not couple a person's login lifecycle to an employer/company relationship.

### Companies

- company lifecycle/status;
- company users/membership;
- role/capability assignment interfaces;
- billing owner context;
- Company Info Center projection interfaces.

### Person / Company Relationships

- create relationship;
- relationship type/status;
- approved contextual metadata;
- start/end lifecycle;
- active/former relationship distinction;
- server-side relationship visibility policy interfaces;
- offboarding state transition;
- activity generation.

Do not delete the person account when a relationship ends.

### Requests / actions

- create/assign/complete/cancel/expire state model;
- due dates where approved;
- company/person relationship linkage;
- response metadata without implementing the final document attachment model;
- activity generation.

### Activity / audit

- append-oriented event interface;
- user-friendly activity projections;
- actor/company/person/relationship/resource context metadata;
- sensitivity/access event hooks for later document design.

### Billing / entitlements

- products;
- prices;
- company subscriptions;
- payment-record domain;
- entitlement grants/limits;
- fake gateway adapter for tests.

Initial commercial assumption:

- person account: free;
- company workspace: paid.

Do not hard-code final commercial package values while the product model is still being designed.

### Data classification

Safe to define the framework concept and working labels:

- public;
- internal;
- personal;
- sensitive;
- highly sensitive.

Do not use this as a substitute for the later approved legal/document taxonomy.

## Safe code tranche C — UI

Build against development fixtures/adapters:

### Person side

- Person Info Center;
- Needs Action panel;
- My Information shell;
- My Companies / Employment Relationships list;
- relationship detail shell;
- request/action views;
- recent activity;
- account shell.

### Company side

- Company Info Center;
- People / Employees list;
- person relationship detail shell;
- company-user/role administration;
- requests/actions dashboard;
- recent activity/audit shell;
- billing/subscription shell;
- generic admin settings shell.

The document navigation entries can remain hidden/reserved until the document domain is approved.

## Safe code tranche D — permission system

Build and test:

- capability registry for approved non-document capabilities;
- policy evaluation interface;
- company membership checks;
- person/company relationship access checks;
- role separation interfaces;
- admin privilege checks;
- sensitivity/classification policy hook;
- deny-by-default behaviour;
- test matrix for horizontal/vertical access attempts.

Specific tests should prove:

- Company A cannot read Company B relationships.
- Person A cannot read Person B relationship data.
- A normal company user cannot gain access by changing route/body identifiers.
- Company admin status does not bypass an explicit sensitive-resource policy.
- An ended relationship can lose active capabilities without deleting historical context.

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

Do not put realistic sensitive employment/legal data into development fixtures. Use clearly synthetic examples.

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
- production-like secret management;
- production-like sensitive-access logging.

## Document-engine stop line

Before any document-engine implementation beyond neutral interfaces, complete and approve the legal/employment document domain design.

That discussion must cover at minimum:

1. personal vs company vs relationship-context records;
2. technical storage ownership vs legal/control terminology;
3. document/request/share distinctions;
4. linkage to the person/company relationship;
5. versioning, replacement and supersession;
6. recipient model;
7. company role access;
8. access/view/download controls;
9. expiry/revocation;
10. acknowledgement/evidence requirements;
11. audit trail and sensitive-view/download logging;
12. data classification;
13. retention/destruction/legal hold if required;
14. former-employee/offboarding behaviour;
15. upload quarantine/scanning;
16. storage/index/checksum model;
17. later signing/redaction boundaries;
18. POPIA/privacy requirements requiring legal/compliance approval.

## Target pre-VM milestone

A valuable first end-to-end workflow that does not depend on documents:

```text
Development person login
  ↓
Create company / company-user fixture
  ↓
Create Person ↔ Company relationship
  ↓
Company creates a request/action
  ↓
Person sees Needs Action
  ↓
Person completes the action
  ↓
Company sees completion
  ↓
Activity/audit timeline records it
  ↓
End relationship
  ↓
Person account remains intact and active relationship access is revoked
```

If that works cleanly, the application framework is ready for the document-engine design and subsequent VM integration.
