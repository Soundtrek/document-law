# Build Plan

## Build philosophy

Build as much of Juanity Law as possible before provisioning the dedicated runtime VM, **but do not fake production-critical boundaries in a way that creates later rewrites**.

The application should progress through clear gates.

## Phase 0 — Repository and design controls

Status: **in progress**

Deliverables:

- project charter;
- application framework;
- stack design;
- UI direction;
- security invariants;
- disaster recovery plan;
- prompt capture discipline;
- decision log;
- AI/Codex working rules.

Exit gate: owner agrees the platform frame is correct enough to start coding around the document domain.

## Phase 1 — Code skeleton without full runtime stack

Build:

- monorepo/workspace structure;
- Next.js application shell;
- shared TypeScript config/lint/test setup;
- UI tokens and shell components;
- route skeletons;
- domain interfaces/types for organisations, users, matters, requests, activity, billing and entitlements;
- application-service boundaries;
- permission-policy interface;
- infrastructure interfaces for identity, storage, mail and payments;
- mock/dev adapters where needed;
- focused unit tests.

Do **not** implement final document-domain behaviour.

Exit gate: application compiles and core domain contracts are coherent without requiring persistent production-style infrastructure.

## Phase 2 — Framework vertical slice

Implement one meaningful non-document workflow:

```text
Create organisation
  ↓
Create / invite user (development identity path)
  ↓
Create matter
  ↓
Add participant
  ↓
Create action/request
  ↓
Complete action/request
  ↓
Activity timeline records the state changes
```

Also build:

- client Info Center shell;
- internal workspace shell;
- role/capability checks;
- billing/entitlement domain skeleton;
- admin shell;
- responsive UI tests.

Exit gate: framework demonstrates end-to-end domain flow without relying on the undecided document engine.

## Phase 3 — Document engine design gate

Pause implementation expansion and design the legal document domain explicitly.

Topics to approve before coding:

- document ownership;
- matter relationship;
- versioning;
- upload/request/share lifecycle;
- recipient identity and access;
- view/download controls;
- expiry/revocation;
- acknowledgements;
- audit evidence;
- retention/destruction;
- object storage model;
- quarantine/malware workflow;
- legal-specific metadata;
- future signing/redaction boundaries.

Only after approval should the document module/service contract be finalised.

## Phase 4 — Dedicated Law development VM

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
- external link/access testing.

The existing NUC is not the runtime target.

## Phase 5 — Commercial and security hardening

Before production:

- payment production configuration;
- MFA policy;
- session/security review;
- tenant isolation tests;
- privilege-escalation tests;
- upload/download abuse tests;
- rate limiting;
- backup/restore rehearsal;
- disaster recovery drill;
- log/monitoring baseline;
- data retention approval;
- privacy/legal review;
- production secrets management;
- vulnerability/dependency review.

## Build sequence rule

Prefer vertical slices over building every database table first.

A feature is considered complete only when its:

- domain rule;
- permission rule;
- persistence or adapter contract;
- UI state;
- activity/audit consequence;
- focused tests

are understood together.

## Validation economy

Use the smallest validation set that provides confidence for the change. Repository-wide exhaustive checks are reserved for releases, migrations, dependency changes and genuinely broad refactors.
