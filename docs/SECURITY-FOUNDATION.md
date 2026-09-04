# Security Foundation

## Purpose

Juanity Law will handle sensitive personal, employment and legal information. Security and privacy must therefore be structural rather than added after feature development.

Potential information includes identity data, contact details, payslips, banking confirmations, employment agreements, disciplinary records, hearing outcomes and legal correspondence.

This document establishes framework-level invariants. Document-specific security, retention and evidence rules will be added only after the document engine is designed.

Juanity Law must be designed to support a **POPIA-aware operating model**, but application architecture is not a substitute for formal legal/compliance review before production use.

## Security principles

### Least privilege

Users receive only the capabilities needed for their company role, person/company relationship and resource.

Company membership, `OWNER` or generic `admin` status must not automatically imply access to all sensitive employee/person information.

### Server authority

The browser is never authoritative for:

- company membership;
- person/company relationship;
- functional role grants;
- entitlement;
- record-definition policy;
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

Identity, authorisation, configuration policy, classification, storage access, auditing, network boundaries and backups each provide separate controls.

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

## Company membership and functional roles

Do not model company access as only `user` versus `admin`.

The system must support many-to-many role assignment: one person may hold several functions, and one function may be held by several people.

Working role concepts include:

- `OWNER` — company governance, membership/role administration and approved company settings;
- `HR`;
- `PAYROLL`;
- `CLERK` / records;
- `LEGAL`;
- `MANAGER`;
- `BILLING`;
- other Juanity-approved roles.

A small company owner may be assigned `OWNER + HR + PAYROLL + CLERK` while a large company may split those roles across different members.

Important security rule:

> `OWNER` grants governance powers; it is not an unconditional `read_all_sensitive_records` capability.

If the owner performs HR, Payroll or Legal functions, the corresponding functional role is assigned explicitly.

The company owner/governance role may invite/remove staff and assign/revoke approved functional roles, including to themselves. Every role grant/revocation must be server-authorised and auditable.

## Authorisation

Authorisation should be capability-based and server enforced.

Example non-document capabilities:

- `company.manage`
- `company.members.invite`
- `company.members.manage_roles`
- `relationship.create`
- `relationship.view`
- `relationship.manage`
- `request.create`
- `request.complete`
- `activity.view`
- `billing.manage`
- `platform.definitions.manage`

Future record/document capabilities may resolve through approved definitions, for example create/view/download/admin actions against a definition/category/context.

Every protected command/query should identify as appropriate:

```text
actor
company/account context
company membership
functional role grants
person
person/company relationship
resource
definition/version policy where relevant
classification/sensitivity
required capability
```

and fail closed if required context is incomplete.

## Configurable policy must not configure away security

Juanity Platform Admin may configure business policy such as record definitions, categories, allowed functional roles, acknowledgement behaviour, notifications and approved retention-policy references.

However, configuration must not disable system invariants such as:

- tenant/company isolation;
- deny-by-default server authorisation;
- safe identity/session handling;
- private object storage as the default security boundary;
- prohibition on trusting client-supplied roles/claims;
- required audit of privileged membership/role changes;
- sensitive logging restrictions;
- approved definition-version integrity.

Company-level administrators may only configure options Juanity explicitly exposes within safe bounds.

## Definition versioning and policy integrity

Record/request/workflow definitions must be versioned.

A later definition edit must not silently reclassify or expand access to historic records without an explicit approved migration/policy step.

Security testing must include definition-version behaviour once record instances exist.

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

## Staff invitation and removal security

Company staff invitation must be company-scoped and auditable.

Minimum expectations:

- invitation is issued by an actor with membership-management capability;
- invitation identifies one company only;
- assigned roles are validated against Juanity-approved roles;
- accepting an invitation does not create cross-company access;
- disabling/removing a company member promptly revokes active company access;
- historical audit context remains;
- role/membership changes trigger appropriate session/cache invalidation where needed.

## Offboarding

Ending a person/company relationship is a security event.

The system must support:

- relationship state transition rather than destructive disappearance;
- revocation of active relationship permissions;
- preservation of the person's independent account;
- removal of inappropriate company access;
- explicit retention handling rather than automatic deletion;
- audit history of termination/access changes.

Disabling/removing a company staff member is a separate security event and must revoke that staff member's company capabilities without deleting historical records or audit attribution.

Final former-employee record access and retention rules are deferred to the document/data-governance design.

## Audit

Security-relevant actions should emit durable events where appropriate, including:

- company-member invitations;
- invitation acceptance/cancellation/expiry;
- membership disable/removal;
- role/capability grants and revocations;
- definition creation/version/activation changes;
- relationship creation/status/end;
- privileged admin actions;
- authentication/security events imported where practical;
- billing entitlement changes;
- privileged sensitive-information access where applicable.

Once documents exist, the design must determine which of these require high-fidelity audit records:

- document/record view;
- document/record download;
- share/access grant;
- access revocation;
- replacement/versioning;
- deletion/retention action;
- sensitive record export.

## Incident and breach readiness

The platform must preserve enough trustworthy operational/audit information to investigate a suspected compromise, including where possible:

- affected company;
- affected people/relationships;
- affected resources;
- actor/account;
- company membership/roles at the relevant time;
- definition/version governing the resource where applicable;
- access/download events;
- timestamps;
- permission changes;
- containment actions.

A formal POPIA/security-compromise response process, notification decision process and responsible roles must be approved before production handling of regulated data.

Do not assume that disaster recovery and security-incident response are the same process.

## 3-click / 10-second safety boundary

The product's 3-click / 10-second rule applies to frequent routine actions, but must not remove necessary security controls.

Authentication challenges, explicit sensitive-data confirmation, meaningful legal acknowledgement and other justified security/legal steps may exceed the routine-action target.

The preferred way to keep daily work fast is **smart defaults from approved definitions**, not skipping authorisation or asking users to manually reconfigure security on every action.

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
- multi-role member tests;
- owner-without-functional-role negative tests;
- invitation/role-change/revocation tests;
- definition-version policy tests once records exist;
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
