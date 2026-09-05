# Project Skills Map

## Purpose

This document defines the practical capability areas that implementation agents should use when working on SAMMA. It is not a dependency list; it is a work-routing guide.

## Skill 1 — Product/domain framing

Use for:

- clarifying Person ↔ Company ↔ Relationship flows;
- distinguishing person accounts from company users;
- relationship lifecycle/offboarding;
- separating product policy from system invariants;
- identifying approval gates;
- preventing premature document-engine or matter/case coupling.

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

Current core packages should centre on people, companies, relationships, requests, permissions/classification, audit and billing.

## Skill 3 — Data modelling / PostgreSQL

Use for:

- people/account mapping;
- companies/company-user membership;
- person/company relationships;
- relationship state/history;
- requests/actions;
- classification/security metadata;
- audit events;
- billing/subscriptions/entitlements;
- migrations and constraints.

Rules:

- explicit foreign keys;
- company/tenant context on protected company resources;
- explicit relationship records for company/person context;
- migrations for all schema change;
- avoid final document-engine assumptions;
- do not reintroduce Matter as a mandatory root without approval.

## Skill 4 — Identity and authorisation

Use for:

- actor resolution;
- OIDC boundary;
- independent person accounts;
- company roles/capabilities;
- relationship-scoped access;
- sensitive-data policy hooks;
- privileged admin operations.

Rules:

- server authoritative;
- deny by default;
- UI visibility is not permission enforcement;
- company admin is not universal sensitive access;
- provider claims are translated, not consumed everywhere.

## Skill 5 — Info Center UI

Use for:

- Person Info Center;
- Company Info Center/workspace;
- people/employee relationship pages;
- actions/requests;
- activity/audit presentation;
- admin shell;
- sensitive-information presentation/masking hooks;
- responsive behaviour.

Reference: `docs/UI-DESIGN-SYSTEM.md`.

Key patterns:

- light surfaces;
- readable constrained person-facing width;
- status and next-action clarity;
- meaningful cards;
- pill navigation/status;
- relationship state visibility;
- desktop/tablet/mobile validation;
- accessibility from the start.

## Skill 6 — Billing and entitlements

Use for:

- products;
- prices;
- company subscriptions;
- payment records;
- gateway adapters;
- feature capabilities and limits.

Rule: gateway state is translated into billing state; feature code consumes entitlements.

Current commercial direction: person account free, company workspace paid. Do not invent final package values.

## Skill 7 — Audit / activity

Use for:

- business event capture;
- security event capture;
- Info Center recent activity;
- relationship lifecycle history;
- privileged role/access changes;
- future sensitive document access history;
- future audit exports.

Rules:

- meaningful state changes are explicit events;
- no sensitive content in generic logs;
- audit events carry actor/resource/time/company/person/relationship context where applicable.

## Skill 8 — Privacy / POPIA-aware design

Use for:

- data minimisation;
- purpose/context-aware information requests;
- data classification;
- sensitive-field handling;
- relationship/offboarding privacy;
- logging review;
- retention design preparation;
- incident/breach readiness;
- responsible-party/operator architecture questions requiring later legal review.

Rules:

- technology alone must not be described as proof of POPIA compliance;
- avoid collecting/storing information merely because it may be useful later;
- real policy/legal wording requires approval;
- sensitive development fixtures must be synthetic.

## Skill 9 — Security review

Use for:

- threat modelling;
- company/tenant isolation;
- person/relationship isolation;
- privilege escalation;
- sensitive company-role separation;
- input validation;
- secrets;
- public endpoints;
- rate limiting;
- payment webhooks;
- future upload/download review.

Reference: `docs/SECURITY-FOUNDATION.md`.

## Skill 10 — Infrastructure / deployment

Use for:

- Docker/Compose;
- Caddy;
- PostgreSQL runtime;
- OIDC deployment;
- object storage;
- Redis/worker only when needed;
- monitoring;
- dedicated VM provisioning.

Constraint: do not deploy SAMMA runtime services to the existing NUC.

## Skill 11 — Disaster recovery / incident readiness

Use for:

- backup architecture;
- restore tests;
- migration rollback planning;
- full-host replacement;
- credential-compromise response;
- incorrect-permission/data-exposure recovery;
- release traceability;
- preservation of security/privacy incident evidence.

Reference: `docs/DISASTER-RECOVERY.md`.

## Skill 12 — Focused validation

Use on every implementation task.

Default sequence:

1. inspect changed area;
2. implement narrow coherent change;
3. type/lint/test affected units;
4. run integration/blast-radius checks only where justified;
5. report exact validation.

Security-sensitive changes should include negative authorisation/isolation tests.

Avoid repeated comprehensive scans when targeted validation provides sufficient confidence.

## Skill 13 — Prompt / build-history capture

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

## Reserved skill — Legal / employment document engine

**Not yet defined.**

This skill will only be written after the document-engine discussion covers at minimum:

- personal vs company vs relationship-context records;
- technical/legal ownership/control terminology;
- versioning;
- request/upload/share workflows;
- recipient and company-role access;
- classification;
- view/download controls;
- retention/offboarding;
- audit evidence;
- object storage;
- upload safety;
- future signing/redaction boundaries;
- POPIA/privacy requirements requiring formal review.
