# Development Guardrails

## Purpose

These guardrails keep early development fast without creating shortcuts that compromise security, tenancy, billing or the future document engine.

## Safe to build before the dedicated VM

- repository/workspace structure;
- TypeScript domain models and interfaces;
- UI shell and responsive components;
- Info Center, matter and request screens;
- permission-policy interfaces and tests;
- audit/activity contracts;
- billing/product/entitlement models;
- database schema drafts and migrations for non-document domains;
- local/dev adapters;
- focused unit and integration tests;
- Dockerfiles/Compose definitions as configuration artifacts;
- CI configuration;
- admin shell and configuration forms.

## Do not simulate away these boundaries

### Tenancy / organisation isolation

Even in mocks, every protected resource must have an organisation/tenant context and server-side authorisation path.

### Permissions

UI hiding is not authorisation. Server-side domain/application services must enforce access.

### Billing entitlements

Feature access consumes entitlement state, not hard-coded package names or gateway responses.

### Audit

Important state transitions must produce an activity/audit event through a defined interface from the beginning.

### Storage

Use a storage interface. A development filesystem adapter may exist, but domain code must not depend on local paths.

### Identity

A development identity adapter may exist, but domain code must receive a resolved actor rather than provider-specific claims.

## Runtime-dependent work that waits for the Law VM

- production-style OIDC flows and MFA;
- external user invitations;
- real SMTP delivery;
- real payment webhook ingress;
- persistent object storage;
- external share links;
- real malware scanning;
- HTTPS/domain behaviour;
- backup automation and restore drills;
- infrastructure monitoring;
- production secret handling.

## No NUC dependency

No Juanity Law service should require the existing NUC to run, build, test or deploy.

## No premature document-engine coupling

Framework code may reference a neutral future capability such as `resourceId` or an abstract attachment interface only where unavoidable. Do not create a pseudo-document engine merely to satisfy placeholder UI.

## Migration discipline

- Every schema change is represented by a migration.
- Never hand-edit production data as the primary migration mechanism.
- Destructive migrations require explicit backup/restore consideration.
- Seed data is clearly separated from production records.

## Dependency discipline

- Prefer widely used, maintained dependencies.
- Add dependencies for a clear requirement, not convenience alone.
- Avoid overlapping libraries that solve the same problem.
- Pin reproducible versions in lockfiles/manifests when implementation starts.

## Coding discipline

- Business rules live in domain/application code, not React presentation components.
- Infrastructure-specific code lives in adapters.
- Input is validated at trust boundaries.
- Errors shown to users must not leak secrets or internal implementation details.
- Logging must avoid sensitive document contents and credentials.

## Approval trigger

Stop and surface the decision when a task would materially define:

- legal document lifecycle;
- external sharing semantics;
- retention/destruction;
- signing/evidence semantics;
- production hosting/provider/region;
- encryption key architecture;
- billing product model;
- identity model beyond the approved boundary.
