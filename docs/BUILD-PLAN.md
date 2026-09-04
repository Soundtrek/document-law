# Build Plan

## Build philosophy

Build as much of Juanity Law as possible before provisioning the dedicated runtime VM, **but do not fake production-critical boundaries in a way that creates later rewrites**.

The application should progress through clear gates.

## Phase 0 — Repository and design controls

Status: **in progress**

Deliverables:

- project charter;
- person/company/relationship application framework;
- stack design;
- Info Center UI direction;
- security/privacy invariants;
- disaster recovery plan;
- prompt capture discipline;
- decision log;
- AI/Codex working rules.

Exit gate: owner agrees the platform frame is correct enough to start coding around the still-undecided document domain.

## Phase 1 — Code skeleton without full runtime stack

Build:

- monorepo/workspace structure;
- Next.js application shell;
- shared TypeScript config/lint/test setup;
- UI tokens and shell components;
- person and company route skeletons;
- domain interfaces/types for people, companies, company users, relationships, requests, activity, billing and entitlements;
- application-service boundaries;
- permission-policy interface;
- data-classification primitives;
- infrastructure interfaces for identity, storage, mail and payments;
- mock/dev adapters where needed;
- focused unit tests.

Do **not** implement final document-domain behaviour.

Exit gate: application compiles and core domain contracts are coherent without requiring persistent production-style infrastructure.

## Phase 2 — Framework vertical slice

Implement a meaningful non-document workflow:

```text
Create person account (development identity)
  ↓
Create company
  ↓
Create authorised company user
  ↓
Create person/company relationship
  ↓
Create request/action for that relationship
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
- admin shell;
- responsive UI tests.

Exit gate: framework demonstrates the Person ↔ Company ↔ Relationship flow without relying on the undecided document engine.

## Phase 3 — Privacy and permission proof

Before adding sensitive document workflows, prove the access model with non-document fixtures.

Validate:

- one company cannot access another company's relationships;
- one person cannot access another person's relationship data;
- company membership does not imply universal sensitive-record access;
- role/capability restrictions are server enforced;
- relationship termination revokes active relationship capabilities as intended;
- the person's account remains independent after relationship termination;
- privileged changes generate audit events;
- sensitive fields are not unnecessarily logged.

Exit gate: tenancy, relationship scoping and least-privilege rules are coherent enough to support the document-engine design.

## Phase 4 — Document engine design gate

Pause document implementation expansion and design the legal/employment document domain explicitly.

Topics to approve before coding:

- personal vs company vs relationship-context records;
- legal/control language versus technical storage ownership;
- document lifecycle;
- request/upload/share distinctions;
- relationship to a person/company relationship;
- optional future legal matter/case context;
- versioning, replacement and supersession;
- recipient identity and access;
- company role access;
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

## Phase 5 — Dedicated Law development VM

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

## Phase 6 — Commercial, POPIA and security hardening

Before production:

- payment production configuration;
- MFA policy;
- session/security review;
- company/tenant isolation tests;
- relationship isolation tests;
- privilege-escalation tests;
- sensitive-role access matrix review;
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
- permission/privacy rule;
- persistence or adapter contract;
- UI state;
- activity/audit consequence;
- focused tests

are understood together.

## Validation economy

Use the smallest validation set that provides confidence for the change. Repository-wide exhaustive checks are reserved for releases, migrations, dependency changes and genuinely broad refactors.
