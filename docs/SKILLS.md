# Project Skills Map

## Purpose

This document defines the practical capability areas that implementation agents should use when working on Juanity Law. It is not a dependency list; it is a work-routing guide.

## Skill 1 — Product/domain framing

Use for:

- clarifying organisation/user/matter/request relationships;
- separating product policy from system invariants;
- identifying approval gates;
- preventing premature coupling.

Output expectations:

- explicit assumptions;
- domain boundaries;
- decisions requiring owner approval;
- no invention of the document engine before approval.

## Skill 2 — Application architecture

Use for:

- module boundaries;
- application services;
- adapters;
- error handling;
- transactional boundaries;
- future extraction points.

Default architecture: modular monolith.

## Skill 3 — Data modelling / PostgreSQL

Use for:

- organisation/membership schemas;
- matter/participant relationships;
- requests/actions;
- audit events;
- billing/subscriptions/entitlements;
- migrations and constraints.

Rules:

- explicit foreign keys;
- tenant context on protected resources;
- migrations for all schema change;
- avoid document-engine assumptions.

## Skill 4 — Identity and authorisation

Use for:

- actor resolution;
- OIDC boundary;
- organisation roles/capabilities;
- matter-level access;
- privileged admin operations.

Rules:

- server authoritative;
- deny by default;
- UI visibility is not permission enforcement;
- provider claims are translated, not consumed everywhere.

## Skill 5 — Info Center UI

Use for:

- client dashboard;
- matter pages;
- actions/requests;
- internal legal workspace;
- admin shell;
- responsive behaviour.

Reference: `docs/UI-DESIGN-SYSTEM.md`.

Key patterns:

- light surfaces;
- readable constrained width;
- status and next-action clarity;
- meaningful cards;
- pill navigation/status;
- desktop/tablet/mobile validation;
- accessibility from the start.

## Skill 6 — Billing and entitlements

Use for:

- products;
- prices;
- subscriptions;
- payment records;
- gateway adapters;
- feature capabilities and limits.

Rule: gateway state is translated into billing state; feature code consumes entitlements.

## Skill 7 — Audit / activity

Use for:

- business event capture;
- security event capture;
- Info Center recent activity;
- future audit exports.

Rules:

- meaningful state changes are explicit events;
- no sensitive content in generic logs;
- audit events carry actor/resource/time/context.

## Skill 8 — Security review

Use for:

- threat modelling;
- tenant isolation;
- privilege escalation;
- input validation;
- secrets;
- public endpoints;
- rate limiting;
- payment webhooks;
- future upload/download review.

Reference: `docs/SECURITY-FOUNDATION.md`.

## Skill 9 — Infrastructure / deployment

Use for:

- Docker/Compose;
- Caddy;
- PostgreSQL runtime;
- OIDC deployment;
- object storage;
- Redis/worker only when needed;
- monitoring;
- dedicated VM provisioning.

Constraint: do not deploy Juanity Law runtime services to the existing NUC.

## Skill 10 — Disaster recovery

Use for:

- backup architecture;
- restore tests;
- migration rollback planning;
- full-host replacement;
- credential-compromise response;
- release traceability.

Reference: `docs/DISASTER-RECOVERY.md`.

## Skill 11 — Focused validation

Use on every implementation task.

Default sequence:

1. inspect changed area;
2. implement narrow coherent change;
3. type/lint/test affected units;
4. run integration/blast-radius checks only where justified;
5. report exact validation.

Avoid repeated comprehensive scans when targeted validation provides sufficient confidence.

## Skill 12 — Prompt / build-history capture

Use after significant architecture decisions, implementation prompts or accepted workflow changes.

Capture:

- prompt/goal;
- constraints;
- accepted interpretation;
- files/areas affected;
- validation;
- commit/PR reference;
- follow-up/open decisions.

Reference: `prompts/PROMPT-CAPTURE.md`.

## Reserved skill — Legal document engine

**Not yet defined.**

This skill will only be written after the document-engine discussion covers ownership, versioning, sharing, recipient access, retention, audit evidence, object storage, upload safety and future signing/redaction boundaries.
