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
- company members/membership;
- invitation state model;
- role/capability assignment interfaces;
- billing owner/governance context;
- Company Info Center projection interfaces.

### Company membership and functional roles

Build the framework so:

- one company member may hold many functional roles;
- one functional role may be held by many members;
- `OWNER` is a governance role rather than an automatic sensitive-data bypass;
- an owner may assign approved roles to themselves;
- an owner may invite/remove company staff and grant/revoke approved roles;
- role/membership events produce audit events;
- disabling a member revokes active company capabilities.

Working synthetic roles may include:

- Owner;
- HR;
- Payroll;
- Clerk / Records;
- Legal;
- Manager;
- Billing.

Do not hard-code these as an unchangeable final role catalogue; use a controlled role-definition/capability boundary suitable for Juanity Platform Admin.

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

### Configurable definitions

Safe to build the policy/configuration framework for:

- `RecordDefinition` identity and metadata;
- `RequestDefinition` / workflow-definition primitives;
- category/context/direction fields;
- classification reference;
- allowed functional-role policy references;
- acknowledgement/Needs Action/notification flags or policy hooks;
- active/inactive lifecycle;
- immutable/versioned definition records;
- create-new-version workflow;
- audit events for definition changes.

Important: this is a **configuration/policy layer**, not the final document storage engine.

Do not implement final record object storage, legal retention execution or external share semantics yet.

### Requests / actions

- create/assign/complete/cancel/expire state model;
- due dates where approved;
- company/person relationship linkage;
- link to a versioned request/workflow definition where used;
- response metadata without implementing the final document attachment model;
- activity generation.

### Activity / audit

- append-oriented event interface;
- user-friendly activity projections;
- actor/company/person/relationship/resource context metadata;
- company membership/role events;
- definition/version events;
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
- contextual `Request info` and reserved `Add record` actions;
- Company Members list;
- Invite Staff flow;
- multi-select functional-role assignment;
- owner self-role management;
- requests/actions dashboard;
- recent activity/audit shell;
- billing/subscription shell;
- generic admin settings shell.

### Juanity Platform Admin

Safe to build a configuration UI shell for:

- Record Definitions;
- Request / Workflow Definitions;
- Categories;
- Functional Roles / Capability Defaults;
- definition versions;
- activate/deactivate actions;
- Products / Entitlements.

Use synthetic example definitions only. Do not represent example policy as legal approval.

The final record/document navigation and file behaviours can remain hidden/reserved until the document storage domain is approved.

## Safe code tranche D — permission system

Build and test:

- capability registry for approved non-document capabilities;
- policy evaluation interface;
- company membership checks;
- many-to-many functional role grants;
- person/company relationship access checks;
- definition-policy hooks;
- admin privilege checks;
- sensitivity/classification policy hook;
- deny-by-default behaviour;
- test matrix for horizontal/vertical access attempts.

Specific tests should prove:

- Company A cannot read Company B relationships.
- Person A cannot read Person B relationship data.
- A normal company user cannot gain access by changing route/body identifiers.
- `OWNER` without an HR/Payroll/Legal functional role does not automatically receive those role-specific capabilities.
- One member can hold several roles and receives the combined authorised capabilities without duplicate accounts.
- Revoking a role removes the corresponding capability.
- Disabling a company member removes active company access.
- An ended person/company relationship can lose active capabilities without deleting historical context.
- Editing a definition creates a new version instead of silently mutating old policy.

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

## 3-click / 10-second pre-VM UI proof

We can validate common fixture workflows before the VM.

Target paths:

```text
Company Members → Invite → Staff + roles → Send
Relationship → Request → Request type → Send
Needs Action → Provide → Use existing/upload placeholder → Submit
Relationship → Add record → Definition/file placeholder → Send
```

The record file operation itself may remain mocked/reserved, but the interaction architecture can be proven.

The rule excludes substantial typing, file upload duration, legal reading and justified security steps.

## Optional local persistence

If a developer workstation can comfortably run PostgreSQL, use it for migration/integration validation. The codebase must not require the existing NUC.

A temporary SQLite substitution is **not** preferred if it would hide PostgreSQL-specific constraints or migration behaviour.

## Stop line before the VM

Move to the dedicated Law development VM before declaring these behaviours integrated:

- real OIDC login/account recovery/MFA;
- real outbound email invitations;
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

Before final record/document storage implementation, complete and approve the legal/employment document domain design.

The surrounding configuration engine is now an approved direction, but the remaining discussion must cover at minimum:

1. personal vs company vs relationship-context record instances;
2. how a record instance binds/snapshots its definition version;
3. technical storage ownership vs legal/control terminology;
4. document/request/share distinctions;
5. linkage to the person/company relationship;
6. versioning, replacement and supersession of record contents;
7. recipient model;
8. company functional-role access;
9. access/view/download controls;
10. expiry/revocation;
11. acknowledgement/evidence requirements;
12. audit trail and sensitive-view/download logging;
13. data classification;
14. retention/destruction/legal hold if required;
15. former-employee/offboarding behaviour;
16. upload quarantine/scanning;
17. storage/index/checksum model;
18. later signing/redaction boundaries;
19. POPIA/privacy requirements requiring legal/compliance approval.

## Target pre-VM milestone

A valuable first end-to-end framework workflow:

```text
Development company owner login
  ↓
Owner assigns HR/Payroll/etc. roles to self
  ↓
Owner invites another company member and assigns role(s)
  ↓
Create Person ↔ Company relationship
  ↓
Authorised role creates a definition-driven request/action
  ↓
Person sees Needs Action
  ↓
Person completes the action
  ↓
Company sees completion
  ↓
Activity/audit timeline records it
  ↓
Revoke a company role and prove access changes
  ↓
End person/company relationship
  ↓
Person account remains intact and active relationship access is revoked
```

If that works cleanly, the application framework is ready for final document-engine storage design and subsequent VM integration.
