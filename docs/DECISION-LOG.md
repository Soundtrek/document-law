# Architecture Decision Log

This file records accepted project-level decisions. Add entries when a decision materially changes architecture, security, deployment, product boundaries or workflow.

## ADR-001 — Build Juanity Law as a new application

**Status:** Accepted  
**Date:** 2026-09-04

Juanity Law is built from scratch. Previous products may be used as learning/reference material, but Juanity Law must not depend on their runtime, schema, identity, billing or package model.

## ADR-002 — Info Center is the primary product frame

**Status:** Accepted  
**Date:** 2026-09-04

The experience is centred on an Info Center that makes status, required actions, waiting states, relationships/information and recent activity obvious. The app is not framed as a generic file manager.

## ADR-003 — Matter as foundational entity

**Status:** Superseded by ADR-012  
**Original date:** 2026-09-04  
**Superseded:** 2026-09-05

Original decision: legal work would be organised around a generic `Matter`.

This was superseded after the product model was clarified. A Matter may still be introduced later as an optional legal-work context, but it is no longer the root of the v1 domain.

## ADR-004 — Document engine design is deferred

**Status:** Accepted / refined by ADR-019  
**Date:** 2026-09-04

The surrounding application framework may be designed and coded, but the final document storage schema, sharing semantics, retention implementation, external recipient access, audit evidence, content versioning and storage workflow will not be implemented until separately discussed and approved.

The document design must explicitly consider personal records, company records and person/company relationship-context employment/legal records.

ADR-019 approves a configurable/versioned record-definition policy layer without approving the final document storage engine.

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

Use light layered surfaces, readable constrained person-facing page widths, strong card/status hierarchy, compact pill navigation/status, visible needs-action states and responsive 4→2→1 style navigation where appropriate. Dark mode is not an initial requirement.

The design supports separate Person Info Center and Company Info Center/workspace experiences using the same visual system.

## ADR-010 — Online learning is deferred

**Status:** Accepted  
**Date:** 2026-09-04

Do not include Moodle/LMS design in the current framework pass. The Law platform should first establish identity, people, companies, relationships, actions, activity, billing, permissions and the document domain.

## ADR-011 — Prompt/build history lives in the repository

**Status:** Accepted  
**Date:** 2026-09-04

Significant AI-assisted build prompts and accepted interpretations are captured in `prompts/` alongside normal code/document history so future work can recover project intent, constraints and reasoning.

## ADR-012 — Person ↔ Company relationship is the core product frame

**Status:** Accepted  
**Date:** 2026-09-05

Juanity Law is fundamentally organised around:

```text
Person  ↔  PersonCompanyRelationship  ↔  Company
```

A person has an independent account/Info Center. A company has a company workspace/Info Center. The relationship is the controlled context through which employment information, requests, later records/documents and activity flow.

A Matter/case is optional future context rather than a mandatory foundation.

## ADR-013 — People are free; companies are the primary paying entity

**Status:** Accepted as current commercial direction  
**Date:** 2026-09-05

People should be able to sign up for and retain a free personal account. Companies are expected to fund most/all commercial usage through paid company workspaces/subscriptions.

Exact package names, prices, limits and paid features remain configurable and are not yet approved.

## ADR-014 — A person's account is independent of employment

**Status:** Accepted  
**Date:** 2026-09-05

A company does not own a person's login/account. Ending employment or another company relationship transitions the relationship to an ended/former state rather than deleting the person account.

This supports job changes, multiple company relationships and continuity after offboarding.

## ADR-015 — Company relationship does not grant blanket access to personal information

**Status:** Accepted  
**Date:** 2026-09-05

Company access must be explicit, server authorised and scoped to the company/person relationship and resource. The preferred pattern for obtaining personal information is a specific request/action rather than unrestricted browsing of a person's private information store.

## ADR-016 — Company admin is not universal sensitive-data access

**Status:** Accepted / refined by ADR-020 and ADR-021  
**Date:** 2026-09-05

The permission model must support separation of duties such as company administration, HR, payroll, legal, management and billing. Company administrator status must not automatically bypass sensitive-resource policy.

## ADR-017 — Sensitive data classification is a framework capability

**Status:** Accepted  
**Date:** 2026-09-05

The framework should support a working classification model such as Public, Internal, Personal, Sensitive and Highly Sensitive. Classification can be used as a policy input for authorisation, masking, audit and later document behaviour.

The labels are engineering controls, not a final legal taxonomy.

## ADR-018 — POPIA/privacy must influence architecture from the start

**Status:** Accepted  
**Date:** 2026-09-05

Juanity Law is expected to carry sensitive employment/legal information. The architecture must support least privilege, data minimisation, controlled access, retention, offboarding, audit, incident investigation and privacy-aware operations from the beginning.

No technical implementation should be represented as sufficient proof of POPIA compliance on its own. Final production policies, processing roles, contracts and legal/compliance requirements require formal review.

## ADR-019 — Juanity configures record/workflow policy instead of hard-coding record types

**Status:** Accepted  
**Date:** 2026-09-05

Juanity Platform Admin will define approved record/request/workflow definitions and business-policy configuration rather than requiring application code changes for every employment/legal record type.

Definitions may contain context, category, direction/audience, working classification, allowed functional roles, acknowledgement/Needs Action behaviour, notification policy, approved retention-policy references and other approved behaviour.

Definitions are **versioned**. Editing a definition must not silently alter the policy governing historic records. The final record-instance binding/snapshot implementation will be decided with the document engine.

System security invariants remain code/policy enforced and cannot be treated as ordinary configurable switches.

## ADR-020 — Company members may hold multiple functional roles

**Status:** Accepted  
**Date:** 2026-09-05

Company membership is separate from functional access. A company member may hold one or many roles such as HR, Payroll, Clerk/Records, Legal, Manager, Billing and other Juanity-approved roles.

A one-person company may have one owner holding all required functional roles. A larger company may distribute the same roles across multiple people.

The architecture must support many-to-many company-member ↔ functional-role grants.

## ADR-021 — Company Owner is governance, not an automatic sensitive-data bypass

**Status:** Accepted  
**Date:** 2026-09-05

The Company Owner/governance role may invite/remove company staff, assign/revoke approved functional roles, manage approved company settings and assign functional roles to themselves.

`OWNER` must not implicitly grant every HR/Payroll/Legal record permission. Where the owner performs those functions, the relevant functional roles are explicitly granted.

Role and membership changes are server authorised and auditable.

## ADR-022 — Frequent routine actions follow the 3-click / 10-second rule

**Status:** Accepted  
**Date:** 2026-09-05

A frequent routine action should normally be reachable from the relevant context in no more than three deliberate clicks/taps and be completable in about ten seconds, excluding substantial typing, file selection/upload, reading legal content and required security steps.

The rule applies to daily workflows such as requests, record delivery, request responses and staff invitation/role assignment. It does not override necessary security or legal controls.

Smart defaults from Juanity-approved definitions should absorb complexity so daily users are not repeatedly asked to configure security/policy choices.
