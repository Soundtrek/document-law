# Build Plan

## Build philosophy

Build as much of Juanity Law as possible before provisioning the dedicated runtime VM, **but do not fake production-critical boundaries in a way that creates later rewrites**.

The application should progress through clear gates.

## Phase 0 — Repository and design controls

Status: **in progress**

Deliverables:

- project charter;
- person/company/relationship application framework;
- configurable record/request definition model;
- company membership and multi-role access model;
- 3-click / 10-second routine-action UX rule;
- stack design;
- Info Center UI direction;
- security/privacy invariants;
- disaster recovery plan;
- prompt capture discipline;
- decision log;
- AI/Codex working rules.

Exit gate: owner agrees the platform frame is correct enough to start coding around the still-undecided final document storage domain.

## Phase 1 — Code skeleton without full runtime stack

Build:

- monorepo/workspace structure;
- Next.js application shell;
- shared TypeScript config/lint/test setup;
- UI tokens and shell components;
- person and company route skeletons;
- domain interfaces/types for people, companies, company members, role grants, relationships, requests, activity, billing and entitlements;
- Juanity Platform Admin shell;
- versioned definition interfaces/types for record/request/workflow policy;
- application-service boundaries;
- permission-policy interface;
- data-classification primitives;
- infrastructure interfaces for identity, storage, mail and payments;
- mock/dev adapters where needed;
- focused unit tests.

Do **not** implement final document storage/domain behaviour.

Exit gate: application compiles and core domain contracts are coherent without requiring persistent production-style infrastructure.

## Phase 2 — Company membership and configuration slice

Implement:

```text
Create company
  ↓
Create company owner/governance member
  ↓
Owner assigns functional roles to self
  ↓
Owner invites another company staff member
  ↓
Assign one or more approved roles
  ↓
Invitation accepted
  ↓
Role-limited company workspace is projected
  ↓
Role changes and membership events are audited
```

Also build a minimal Juanity Platform Admin proof with synthetic definitions:

- create definition;
- create new version;
- activate/deactivate version;
- assign allowed functional roles;
- prove old definition versions remain addressable and are not silently overwritten.

Exit gate: one-person and multi-person company models both work without special-case architecture.

## Phase 3 — Framework vertical slice

Implement a meaningful non-document workflow:

```text
Create person account (development identity)
  ↓
Create company / company members
  ↓
Create person/company relationship
  ↓
Authorised company role creates request/action using an approved definition
  ↓
Person sees Needs Action in their Info Center
  ↓
Person completes request/action
  ↓
Company sees completion
  ↓
Activity/audit records the state changes
```

Also build:

- Person Info Center shell;
- Company Info Center/workspace shell;
- relationship list/detail shell;
- relationship lifecycle/status;
- role/capability checks;
- company billing/entitlement domain skeleton;
- company admin/member shell;
- responsive UI tests;
- 3-click / 10-second checks for common fixture workflows.

Exit gate: framework demonstrates the Person ↔ Company ↔ Relationship flow and role-limited daily actions without relying on the undecided document storage engine.

## Phase 4 — Privacy and permission proof

Before adding sensitive document workflows, prove the access model with non-document fixtures.

Validate:

- one company cannot access another company's relationships;
- one person cannot access another person's relationship data;
- company membership does not imply universal sensitive-record access;
- `OWNER` without HR/Payroll/Legal functional roles does not automatically gain those role-specific rights;
- one member can safely hold multiple functional roles;
- invitation/role changes are server authorised and audited;
- disabling a company member revokes their access;
- role/capability restrictions are server enforced;
- relationship termination revokes active relationship capabilities as intended;
- the person's account remains independent after relationship termination;
- privileged changes generate audit events;
- sensitive fields are not unnecessarily logged;
- editing a definition creates/uses a new version instead of silently mutating historic policy.

Exit gate: tenancy, relationship scoping, definition policy and least-privilege rules are coherent enough to support the document-engine design.

## Phase 5 — Document engine design gate

Pause document implementation expansion and design the legal/employment document domain explicitly.

The approved framework now assumes a configurable `RecordDefinition`/workflow layer, but the final storage engine still requires explicit design.

Topics to approve before coding:

- personal vs company vs relationship-context records;
- how record instances bind to definition versions;
- legal/control language versus technical storage ownership;
- document lifecycle;
- request/upload/share distinctions;
- relationship to a person/company relationship;
- optional future legal matter/case context;
- versioning, replacement and supersession;
- recipient identity and access;
- company functional-role access;
- view/download controls;
- expiry/revocation;
- acknowledgement/receipt/evidence;
- audit requirements for sensitive access;
- data classification;
- retention/destruction;
- former-employee access/offboarding;
- object storage model;
- quarantine/malware workflow;
- legal/employment-specific metadata;
- future signing/redaction boundaries;
- POPIA/privacy operating requirements requiring legal review.

Only after approval should the document module/service contract be finalised.

## Phase 6 — Dedicated Law development VM

Provision when real integrations become useful.

Add:

- PostgreSQL persistence;
- HTTPS/domain via Caddy;
- real OIDC provider configuration;
- persistent S3-compatible object storage;
- Redis/BullMQ if asynchronous jobs are now needed;
- ClamAV for external uploads;
- SMTP integration;
- payment sandbox and webhook ingress;
- automated backups;
- restore testing;
- external link/access testing;
- security/access logging appropriate to the approved document design.

The existing NUC is not the runtime target.

## Phase 7 — Commercial, POPIA and security hardening

Before production:

- payment production configuration;
- MFA policy;
- session/security review;
- company/tenant isolation tests;
- relationship isolation tests;
- privilege-escalation tests;
- sensitive-role access matrix review;
- multi-role and owner-governance tests;
- invitation/revocation tests;
- definition-version/migration tests;
- upload/download abuse tests;
- rate limiting;
- backup/restore rehearsal;
- disaster recovery drill;
- incident/breach-response runbook review;
- log/monitoring baseline;
- data classification/retention approval;
- privacy notice and processing-role review;
- operator/sub-processor arrangements where applicable;
- data-subject/access/correction workflow review where applicable;
- production secrets management;
- vulnerability/dependency review;
- formal legal/compliance review before relying on the platform for regulated production data.

## Build sequence rule

Prefer vertical slices over building every database table first.

A feature is considered complete only when its:

- domain rule;
- configurable-policy/definition rule where applicable;
- permission/privacy rule;
- persistence or adapter contract;
- UI state;
- activity/audit consequence;
- focused tests

are understood together.

## 3-click / 10-second validation

For high-frequency routine workflows, include a simple interaction-path check in UI review:

- can the user start from the relevant context?
- is the routine action within three deliberate clicks/taps?
- are defaults supplied by approved configuration rather than repeated manual policy choices?
- does the flow remain clear on desktop/tablet/mobile?
- have we preserved required security/legal steps?

This is a usability target, not a reason to remove necessary safeguards.

## Validation economy

Use the smallest validation set that provides confidence for the change. Repository-wide exhaustive checks are reserved for releases, migrations, dependency changes and genuinely broad refactors.
