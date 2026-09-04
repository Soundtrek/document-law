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

### Accepted interpretation

Build a modular-monolith platform frame around identity, organisations, matters, requests/actions, activity/audit, billing/entitlements and admin. Reserve a clean document boundary without inventing final document behaviour.

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

### Follow-up

Discuss the document engine domain before implementing it.

## Capture discipline

When a prompt results in an accepted material decision, also update `docs/DECISION-LOG.md` rather than relying on prompt history alone.

Prompt history is context. The decision log is authority.
