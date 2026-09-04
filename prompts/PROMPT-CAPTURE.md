# Prompt and Build-History Capture

## Purpose

Juanity Law uses AI-assisted development. Important prompts therefore form part of the project record because they often contain intent, constraints and approval boundaries that are not obvious from code alone.

This file defines the capture format. New significant sessions should normally create a dated Markdown file under `prompts/history/`.

## What to capture

Capture prompts/work sessions when they:

- define or change architecture;
- define a new workflow;
- create or change security/permission behaviour;
- change the data model;
- add a third-party integration;
- change billing/entitlements;
- create a migration;
- define deployment or disaster-recovery behaviour;
- materially change UI/product direction;
- include an owner directive that future agents must preserve.

Do not capture routine typo fixes or trivial implementation details unless they reveal a useful constraint.

## Prompt history format

```markdown
# YYYY-MM-DD — Short session title

## Goal
What was requested?

## Owner constraints
- Explicit constraints and non-negotiables.

## Accepted interpretation
How was the request translated into implementation scope?

## Decisions
- Decision 1
- Decision 2

## Deferred / explicitly not changed
- Important exclusions.

## Files / areas affected
- paths or modules

## Validation
- focused tests/checks performed

## Result
- PASS / PARTIAL / BLOCKED
- commit / PR / issue reference

## Follow-up
- next approved discussion or task
```

## Initial project capture — 2026-09-04

### Goal

Establish the Juanity Law repository as the planning/build-control base for a new paid legal client portal before designing the document engine itself.

### Owner constraints

- Build Juanity Law from scratch.
- Keep other product development out of the Law runtime/design dependency chain.
- Use the successful Info Center approach only as learning for the Law UI.
- Do not focus on an LMS/online learning system yet.
- Build as much code as safely possible before a dedicated VM is needed.
- The existing NUC is stretched and must not become the Juanity Law runtime target.
- Create build documentation, plans, skills, prompt capture, stack design and disaster recovery support first.
- Discuss and design the legal document engine only after the framework/support material is established.

### Initial accepted interpretation

Build a modular-monolith platform frame around identity, organisations, matters, requests/actions, activity/audit, billing/entitlements and admin. Reserve a clean document boundary without inventing final document behaviour.

This initial matter-centric interpretation was later superseded by the 2026-09-05 product clarification below.

### Stack planning baseline

- Next.js + React + TypeScript
- PostgreSQL + Prisma
- OIDC identity boundary; Keycloak leading self-hosted option
- S3-compatible storage interface
- BullMQ + Redis when asynchronous work is justified
- ClamAV once external uploads exist
- SMTP adapter
- Caddy
- Docker / Docker Compose
- payment gateway adapter layer

### UI learning retained

- light surfaces;
- constrained readable client page width;
- strong heading/card hierarchy;
- pill navigation/status;
- obvious needs-action state;
- responsive layouts;
- no initial dark-mode requirement.

### Deferred

- final document schema;
- document sharing lifecycle;
- document retention/destruction;
- legal audit evidence semantics;
- e-signature;
- LMS/Moodle;
- production hosting provider/region;
- production payment gateway configuration.

### Result

Repository support-document bootstrap created on `main`.

## Product clarification — 2026-09-05

### Goal

Correct the framework so it reflects the actual Juanity Law product rather than a generic legal matter portal.

### Owner context

The working theory is an Info Center exchange model:

- individuals keep their own information/documents;
- companies keep their own information/documents;
- a defined relationship between the individual and company permits controlled requests and sharing;
- for Juanity Law, the common relationship is employer/employee;
- companies will pay most of the fees;
- people should sign up for free;
- employment records may include payslips, disciplinary hearing outcomes and legal documentation;
- the application will carry sensitive data and must be significantly more security/privacy conscious, including POPIA considerations.

### Accepted interpretation

Replace the matter-first root with:

```text
Person  ↔  PersonCompanyRelationship  ↔  Company
```

The Info Center pattern remains the primary UX. A Person Info Center and Company Info Center share one design system while presenting different workflows.

### Decisions

- Person accounts are independent of employers/companies.
- People are free in the current commercial direction.
- Companies are the primary paid tenants/workspaces.
- The person/company relationship is first-class domain state.
- Ending employment changes relationship status; it does not delete the person's account.
- Requests/actions are preferred over blanket access to a person's private information store.
- Company admin does not imply universal access to sensitive employee records.
- Permission architecture must support separation such as HR, payroll, legal, management, billing and company administration.
- A framework-level data classification capability is required.
- POPIA/privacy, audit, offboarding and incident readiness influence architecture from the start.
- `Matter` is now an optional future legal-work context, not a v1 root entity.

### Document-domain implication

The future document-engine discussion must explicitly distinguish, at least conceptually:

1. personal/person records;
2. company records;
3. employment/legal records held in the person/company relationship context.

No final document tables, ownership semantics, sharing model, retention rules or former-employee document rights were approved in this session.

### Security implications

The framework must be capable of protecting sensitive records such as:

- identity information;
- payslips/payroll-related information;
- banking confirmations;
- employment agreements;
- disciplinary records/hearing outcomes;
- legal correspondence.

Development/test data must be synthetic and logging must avoid sensitive values/content.

### Files / areas affected

- `README.md`
- `AGENTS.md`
- `docs/PROJECT-CHARTER.md`
- `docs/APPLICATION-FRAMEWORK.md`
- `docs/BUILD-PLAN.md`
- `docs/CODE-BEFORE-VM.md`
- `docs/DEVELOPMENT-GUARDRAILS.md`
- `docs/SECURITY-FOUNDATION.md`
- `docs/STACK-DESIGN.md`
- `docs/UI-DESIGN-SYSTEM.md`
- `docs/DECISION-LOG.md`
- `prompts/PROMPT-CAPTURE.md`

### Deferred / explicitly not changed

- final document engine;
- final legal definition of ownership/control of records;
- document retention/destruction;
- final POPIA policies/contractual roles;
- production hosting/provider/region;
- LMS/Moodle;
- e-signature.

### Result

**PASS — framework documentation reframed around Person ↔ Company ↔ Relationship.**

### Follow-up

Discuss the document engine using the corrected employment/legal information model.

## Capture discipline

When a prompt results in an accepted material decision, also update `docs/DECISION-LOG.md` rather than relying on prompt history alone.

Prompt history is context. The decision log is authority.
