# Development Guardrails

## Purpose

These guardrails keep early development fast without creating shortcuts that compromise privacy, company isolation, person/company relationships, billing or the future document engine.

## Safe to build before the dedicated VM

- repository/workspace structure;
- TypeScript domain models and interfaces;
- UI shell and responsive components;
- Person Info Center and Company Info Center;
- person/company relationship screens;
- request/action screens;
- permission-policy interfaces and tests;
- data-classification primitives;
- audit/activity contracts;
- billing/product/entitlement models;
- database schema drafts and migrations for approved non-document domains;
- local/dev adapters;
- focused unit and integration tests;
- Dockerfiles/Compose definitions as configuration artifacts;
- CI configuration;
- admin shell and configuration forms.

## Do not simulate away these boundaries

### Company tenancy

Even in mocks, every protected company resource must have a company/tenant context and server-side authorisation path.

### Person independence

A person's account must not be implemented as a child login owned by the company.

A person may outlive an employment/company relationship and may later have multiple company relationships.

### Relationship scoping

Information and actions concerning a person in a company context must resolve through the correct person/company relationship or another explicitly approved context.

Do not use a loose `companyId + personId` pair everywhere instead of an explicit relationship model.

### Permissions

UI hiding is not authorisation. Server-side domain/application services must enforce access.

Company `admin` must not be treated as a universal bypass for sensitive information.

### Sensitive data

Assume the platform will carry personal and highly sensitive employment/legal information.

- Do not put real client/employee sensitive information in source code, seeds, fixtures or screenshots.
- Do not log salary, banking, ID numbers, document contents, disciplinary/legal narrative or unnecessary personal information.
- Prefer synthetic fixture data.
- Data classification must be available as a policy input.

### Billing entitlements

Feature access consumes entitlement state, not hard-coded package names or gateway responses.

Initial commercial direction is a free person account and a paid company workspace, but exact limits/prices remain configuration.

### Audit

Important state transitions and privileged access changes must produce an activity/audit event through a defined interface from the beginning.

### Storage

Use a storage interface. A development filesystem adapter may exist, but domain code must not depend on local paths.

No storage URL/key may become an authorisation mechanism.

### Identity

A development identity adapter may exist, but domain code must receive a resolved actor rather than provider-specific claims.

## Relationship lifecycle guardrail

Do not implement offboarding as `delete employee`.

Ending a relationship should support:

- active → ended/former state;
- revocation of active relationship capabilities;
- preservation of the person's independent account;
- preservation of required historical/audit context;
- later application of approved retention/access policies.

Final legal retention behaviour remains deferred.

## Requests before broad access

Where a company needs information from a person, prefer an explicit request/action flow rather than assuming the company may browse the person's entire private information set.

Do not implement a convenience `view all employee personal files` capability before the document/access model is approved.

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
- production secret handling;
- production-like security/access logging.

## No NUC dependency

No Juanity Law service should require the existing NUC to run, build, test or deploy.

## No premature document-engine coupling

Framework code may reference a neutral future resource/attachment capability only where unavoidable. Do not create a pseudo-document engine merely to satisfy placeholder UI.

Do not finalise:

- personal/company/relationship document tables;
- document ownership/control semantics;
- recipient/sharing model;
- document role matrix;
- retention/destruction;
- signing/evidence semantics;
- former-employee document rights

until the document design gate is approved.

## Matter/case guardrail

Do not reintroduce `Matter` as a mandatory root entity simply because this is a legal product.

If later workflows require matters/cases, add them as an explicit optional context after the requirement is understood.

## Migration discipline

- Every schema change is represented by a migration.
- Never hand-edit production data as the primary migration mechanism.
- Destructive migrations require explicit backup/restore consideration.
- Seed data is clearly separated from production records.
- Migration tests must consider tenant/relationship isolation for security-sensitive changes.

## Dependency discipline

- Prefer widely used, maintained dependencies.
- Add dependencies for a clear requirement, not convenience alone.
- Avoid overlapping libraries that solve the same problem.
- Pin reproducible versions in lockfiles/manifests when implementation starts.

## Coding discipline

- Business rules live in domain/application code, not React presentation components.
- Infrastructure-specific code lives in adapters.
- Input is validated at trust boundaries.
- Errors shown to users must not leak secrets, relationship existence or internal implementation details.
- Logging must avoid sensitive document contents and credentials.
- Avoid technical field names that make accidental legal claims such as `legalOwner` unless that concept has been explicitly approved.

## POPIA/privacy guardrail

Architecture should support privacy principles such as minimisation, access control, purpose/context, retention, correction and incident response.

Do not claim that a technical feature makes the product POPIA-compliant. Production compliance depends on technology, policy, contracts, operating practice and legal review.

## Approval trigger

Stop and surface the decision when a task would materially define:

- legal/employment document lifecycle;
- external sharing semantics;
- sensitive company role access;
- retention/destruction/legal hold;
- signing/evidence semantics;
- production hosting provider/region;
- encryption key architecture;
- billing product model beyond the approved free-person/paid-company direction;
- identity model beyond the approved boundary;
- responsible-party/operator assumptions;
- privacy notice/consent/legal basis behaviour.
