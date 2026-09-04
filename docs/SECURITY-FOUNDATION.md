# Security Foundation

## Purpose

Juanity Law will handle sensitive personal, employment and legal information. Security and privacy must therefore be structural rather than added after feature development.

Potential information includes identity data, contact details, payslips, banking confirmations, employment agreements, disciplinary records, hearing outcomes and legal correspondence.

This document establishes framework-level invariants. Document-specific security, retention and evidence rules will be added only after the document engine is designed.

Juanity Law must be designed to support a **POPIA-aware operating model**, but application architecture is not a substitute for formal legal/compliance review before production use.

## Security principles

### Least privilege

Users receive only the capabilities needed for their company role, person/company relationship and resource.

Company membership or `admin` status must not automatically imply access to all sensitive employee/person information.

### Server authority

The browser is never authoritative for:

- company membership;
- person/company relationship;
- role;
- entitlement;
- sensitivity/classification;
- ownership/control claims;
- access decisions;
- payment status.

### Explicit company tenancy

Every company-side protected business resource must resolve to a company/tenant boundary.

### Explicit relationship scoping

Where information concerns a person in a company context, access must resolve through the correct person/company relationship or another explicitly approved context.

The existence of an employment relationship does not grant a company unrestricted access to the person's private information store.

### Privacy by design

Design should support:

- data minimisation;
- purpose/context-aware access;
- controlled sharing rather than blanket access;
- retention rules;
- correction/update workflows where required;
- access/account offboarding;
- auditable sensitive-data access;
- incident investigation and notification workflows.

Exact legal policies and processing roles require approval/review before production.

### Defence in depth

Identity, authorisation, classification, storage access, auditing, network boundaries and backups each provide separate controls.

## Identity

Use an OIDC-compatible identity provider rather than implementing password handling inside the application.

Production expectations should include:

- secure password policy at the identity provider;
- MFA capability, with stronger requirements for privileged company roles;
- session expiration/rotation;
- account recovery controls;
- login event visibility;
- privileged/admin authentication hardening.

Provider-specific claims are translated into an application actor at the boundary.

A person's identity/account must remain separate from company/employer control.

## Authorisation

Authorisation should be capability-based and server enforced.

Example non-document capabilities:

- `company.manage`
- `company.users.manage`
- `relationship.create`
- `relationship.view`
- `relationship.manage`
- `request.create`
- `request.complete`
- `activity.view`
- `billing.manage`
- `admin.manage_users`

Document capabilities are intentionally deferred.

Every protected command/query should identify as appropriate:

```text
actor
company/account context
person
person/company relationship
resource
classification/sensitivity
required capability
```

and fail closed if required context is incomplete.

## Company-role separation

Do not model company access as only `user` versus `admin`.

The permission system must be capable of supporting restricted functions such as:

- company administration;
- HR;
- payroll;
- legal;
- management;
- audit/investigation;
- billing.

The final role catalogue is configurable/product design, but the architecture must support separation of duties.

Example principle: a payroll user may legitimately need payslip/payroll access without being entitled to disciplinary/legal records.

## Data classification

Introduce a framework-level classification concept early.

Working labels:

- `PUBLIC`
- `INTERNAL`
- `PERSONAL`
- `SENSITIVE`
- `HIGHLY_SENSITIVE`

These labels are engineering controls, not a final legal classification taxonomy.

Classification may influence:

- required permission strength;
- UI masking;
- audit detail;
- download/share behaviour once designed;
- admin visibility;
- retention policy;
- notification content;
- incident triage.

## Data protection

- Use TLS for all external traffic.
- Encrypt infrastructure volumes/storage where the chosen provider supports it.
- Never commit secrets.
- Avoid sensitive values in URLs.
- Do not log credentials, tokens, private document content, salary/banking values or unnecessary personal information.
- Use environment/runtime secret injection.
- Separate production credentials from development credentials.
- Avoid copying sensitive data into analytics, debugging or notification payloads unless explicitly required and approved.

## Storage boundary

When document storage is implemented:

- buckets/containers are private;
- application authorisation precedes file access;
- storage keys/URLs never serve as permission checks;
- short-lived signed access may be used only where consistent with the approved access model;
- externally uploaded material enters a quarantine/scanning path;
- sensitive storage access is auditable where required;
- backup copies receive equivalent confidentiality protections.

Final storage semantics remain part of the document-engine design gate.

## Input and upload safety

Framework inputs:

- validate at API/server boundaries;
- use allow-listed enums/status values;
- constrain lengths and shapes;
- parameterise database access via ORM/query APIs.

Future file uploads should include at minimum:

- size limits;
- MIME/content validation;
- filename normalisation;
- malware scanning;
- quarantine before trusted availability;
- safe preview/conversion design where previews are introduced.

## Requests instead of blanket vault access

Where a company needs information from a person, prefer a scoped request flow:

```text
Company requests specific information
        ↓
Person reviews the request
        ↓
Person provides/authorises the relevant response
        ↓
Company receives only the approved relationship-scoped result
```

This principle helps avoid unnecessary exposure of unrelated personal information.

## Offboarding

Ending a relationship is a security event.

The system must support:

- relationship state transition rather than destructive disappearance;
- revocation of active relationship permissions;
- preservation of the person's independent account;
- removal of inappropriate company access;
- explicit retention handling rather than automatic deletion;
- audit history of termination/access changes.

Final former-employee record access and retention rules are deferred to the document/data-governance design.

## Audit

Security-relevant actions should emit durable events where appropriate, including:

- company-user membership changes;
- role/capability changes;
- relationship creation/status/end;
- privileged admin actions;
- authentication/security events imported where practical;
- billing entitlement changes;
- privileged sensitive-information access where applicable.

Once documents exist, the design must determine which of these require high-fidelity audit records:

- document view;
- document download;
- share/access grant;
- access revocation;
- document replacement;
- deletion/retention action;
- sensitive record export.

## Incident and breach readiness

The platform must preserve enough trustworthy operational/audit information to investigate a suspected compromise, including where possible:

- affected company;
- affected people/relationships;
- affected resources;
- actor/account;
- access/download events;
- timestamps;
- permission changes;
- containment actions.

A formal POPIA/security-compromise response process, notification decision process and responsible roles must be approved before production handling of regulated data.

Do not assume that disaster recovery and security-incident response are the same process.

## Rate limiting and abuse controls

Before public production, define limits for:

- login/recovery flows;
- invitations;
- public/recipient access endpoints;
- upload endpoints;
- download endpoints;
- webhook endpoints;
- expensive background jobs.

## Payment security

- Never infer entitlement from browser return URLs.
- Verify gateway callbacks/webhooks server-side.
- Store provider transaction references, not unnecessary payment-card data.
- Keep gateway secrets out of client bundles.
- Make webhook processing idempotent.

## Security validation before production

Minimum release gate:

- company/tenant-isolation tests;
- person/relationship-isolation tests;
- horizontal/vertical privilege-escalation tests;
- IDOR/resource-reference tests;
- company-role separation tests;
- admin-path review;
- session/logout/recovery review;
- MFA/privileged-auth review;
- upload/download abuse testing once documents exist;
- webhook signature/idempotency testing;
- dependency vulnerability review;
- backup confidentiality review;
- logging/privacy review;
- secrets/config review;
- offboarding/revocation test;
- restore drill;
- privacy/POPIA legal-compliance review.

## Incident principle

Preserve evidence before destructive cleanup where legally and operationally appropriate. Recovery procedures must distinguish service restoration from forensic/investigation needs.
