# Architecture Decision Log

This file records accepted project-level decisions. Add entries when a decision materially changes architecture, security, deployment, product boundaries or workflow.

## ADR-001 — Build Juanity Law as a new application

**Status:** Accepted  
**Date:** 2026-09-04

Juanity Law is built from scratch. Previous products may be used as learning/reference material, but Juanity Law must not depend on their runtime, schema, identity, billing or package model.

## ADR-002 — Info Center is the primary product frame

**Status:** Accepted  
**Date:** 2026-09-04

The client experience is centred on an Info Center that makes status, required actions, waiting states, matters and recent activity obvious. The app is not framed as a generic file manager.

## ADR-003 — Matter is a core contextual entity

**Status:** Accepted  
**Date:** 2026-09-04

Legal work is organised around a generic `Matter` capable of representing multiple legal-service workflows. Requests, participants, activity and later document capability attach to matter context where appropriate.

## ADR-004 — Document engine design is deferred

**Status:** Accepted  
**Date:** 2026-09-04

The surrounding application framework may be designed and coded, but the final document schema, sharing semantics, retention, external recipient access, audit evidence, versioning and storage workflow will not be implemented until separately discussed and approved.

## ADR-005 — Modular monolith first

**Status:** Accepted  
**Date:** 2026-09-04

Use one primary TypeScript application/codebase with clean module/adaptor boundaries. Extract workers/services only where operational requirements justify it.

## ADR-006 — Proposed technical foundation

**Status:** Proposed/accepted as planning baseline  
**Date:** 2026-09-04

Planning baseline:

- Next.js + React + TypeScript
- PostgreSQL
- Prisma
- OIDC identity boundary; Keycloak is the leading self-hosted option
- S3-compatible storage interface
- BullMQ + Redis when asynchronous work is needed
- ClamAV for external uploads once document uploads are introduced
- SMTP mail adapter
- Caddy
- Docker / Docker Compose
- payment gateway adapter layer

Versions and final provider choices are selected during implementation/provisioning.

## ADR-007 — Existing NUC is not a Law runtime target

**Status:** Accepted  
**Date:** 2026-09-04

The existing NUC is already resource constrained. Juanity Law must not depend on it for application runtime, persistence or disaster recovery.

## ADR-008 — Build before VM where safe

**Status:** Accepted  
**Date:** 2026-09-04

Build the application skeleton, domain boundaries, UI, tests and adapters before provisioning the dedicated Law VM where this does not compromise production-critical boundaries. Real OIDC, external sharing, SMTP, payment webhooks, persistent object storage, malware scanning, backups and security validation belong on the Law development VM.

## ADR-009 — UI direction is light and information-first

**Status:** Accepted  
**Date:** 2026-09-04

Use light layered surfaces, readable constrained client page widths, strong card/status hierarchy, compact pill navigation/status, visible needs-action states and responsive 4→2→1 style navigation where appropriate. Dark mode is not an initial requirement.

## ADR-010 — Online learning is deferred

**Status:** Accepted  
**Date:** 2026-09-04

Do not include Moodle/LMS design in the current framework pass. The Law platform should first establish identity, organisations, matters, actions, activity, billing, permissions and the document domain.

## ADR-011 — Prompt/build history lives in the repository

**Status:** Accepted  
**Date:** 2026-09-04

Significant AI-assisted build prompts and accepted interpretations are captured in `prompts/` alongside normal code/document history so future work can recover project intent, constraints and reasoning.
