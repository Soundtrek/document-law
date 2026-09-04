# Application Framework

## Architectural approach

Start as a **modular monolith** with strong domain boundaries.

The goal is to keep the codebase easy to understand and deploy while preserving the option to extract workers or services later if scale, security or document processing requires it.

## Primary domain model

Juanity Law is built around three foundational concepts:

```text
Person  ↔  PersonCompanyRelationship  ↔  Company
```

The relationship is the controlled bridge through which employment context, requests, later document access and activity are scoped.

A generic legal `Matter` is not a foundational v1 entity. It may be introduced later as an optional context if a real workflow requires it.

## Initial modules

### Identity boundary

Responsibilities:

- authenticated principal mapping;
- local person/company-user actor resolution;
- session-to-domain actor resolution;
- future OIDC integration;
- account state mapping.

It must not spread provider-specific identity logic throughout the application.

A person's identity account is distinct from any company/employer relationship.

### People

Responsibilities:

- persistent person record;
- personal profile/preferences required by the app;
- account status;
- relationship discovery/acceptance where approved;
- personal Info Center projection.

A person account is expected to be free in the initial commercial model.

The system must not assume that a company owns or controls the person's login.

### Companies

Responsibilities:

- company record;
- company status;
- company users;
- roles/capabilities;
- billing owner relationship;
- company Info Center projection.

The company is expected to be the primary paid tenant/workspace.

### Person / Company Relationships

Responsibilities:

- connect one person to one company;
- relationship type/status;
- employment or other approved contextual metadata;
- relationship start/end state;
- access context;
- offboarding state;
- relationship-scoped requests/actions;
- relationship-scoped activity;
- future linkage to employment/legal document records.

The initial product may primarily use an employee relationship, but the domain should not be coded so narrowly that former employees, contractors or other approved relationship types require a rewrite.

Ending a relationship must not delete the person account.

### Requests / Actions

Responsibilities:

- action requested from a person or authorised company user;
- requesting company/context;
- assigned person/user;
- due/status information where approved;
- completion state;
- response metadata;
- relationship linkage where relevant;
- future linkage to a document or other resource.

Requests are a preferred pattern for obtaining information instead of granting broad access to a person's private information store.

### Information / record context

Responsibilities at framework level:

- provide neutral contextual boundaries for personal, company and relationship information;
- support data classification labels;
- support purpose/access metadata where required;
- avoid defining the final document schema prematurely.

Working information classes may include:

- public;
- internal;
- personal;
- sensitive;
- highly sensitive.

These are framework-level security labels, not a final legal taxonomy.

### Activity / Audit

Responsibilities:

- append meaningful business/security events;
- expose user-friendly recent activity;
- support later audit export/investigation;
- preserve actor, company, person, relationship, resource and timestamp context;
- support higher-fidelity access events for sensitive resources once the document domain is designed.

### Billing / Entitlements

Responsibilities:

- product catalogue;
- prices;
- subscription state;
- payment records;
- gateway adapters;
- capability/limit grants;
- company billing state.

Feature code consumes entitlements; it does not interpret payment-gateway payloads directly.

The initial commercial assumption is:

- people: free account;
- companies: paid workspace/subscription.

Exact packages, prices and limits remain configurable.

### Admin

Responsibilities:

- company/user administration;
- person/company relationship administration according to policy;
- role/capability configuration;
- product and entitlement configuration;
- operational status;
- audit investigation tools.

Admin must not mean unrestricted access to all sensitive records. Privileged record access requires explicit server-side policy.

### Documents

**Reserved boundary — design pending.**

The framework may expose neutral identifiers or extension points, but no final document schema, access semantics, retention policy, sharing model, document ownership model or document workflow is approved yet.

The eventual design must distinguish at least conceptually between:

- a person's private/personal records;
- company records;
- records created or held in the person/company relationship context.

This distinction must not be implemented as a final schema until the document-engine design is approved.

## Request flow

```text
Browser
  ↓
Next.js route / server action
  ↓
Application service
  ↓
Domain policy / permission check
  ↓
Repository / adapter
  ↓
PostgreSQL or external infrastructure
```

React components must not become the business-rule layer.

## Authorisation model

Every protected operation should resolve approximately:

```text
Actor
 + Company / account context
 + Person relationship where applicable
 + Resource
 + Data classification / sensitivity where applicable
 + Capability
 = Allow / Deny
```

Client-provided company, relationship, role or entitlement claims are never authoritative.

Company membership alone must not imply access to all person/employee records.

## Activity model

Examples of framework-level events:

- `PERSON_ACCOUNT_CREATED`
- `COMPANY_CREATED`
- `COMPANY_USER_ADDED`
- `COMPANY_USER_ROLE_CHANGED`
- `RELATIONSHIP_CREATED`
- `RELATIONSHIP_STATUS_CHANGED`
- `RELATIONSHIP_ENDED`
- `REQUEST_CREATED`
- `REQUEST_COMPLETED`
- `SUBSCRIPTION_CHANGED`
- `PAYMENT_RECORDED`
- `PRIVILEGED_ACCESS_GRANTED`
- `PRIVILEGED_ACCESS_REVOKED`

Document-specific audit/access events will be defined with the document engine.

## Data ownership and control language

Do not use the word `owner` casually in domain code for sensitive information.

The system should distinguish where relevant between:

- account holder;
- company/tenant context;
- subject/person the information concerns;
- uploader/creator;
- authorised recipient;
- storage custodian;
- responsible-party/operator roles where later confirmed by legal/compliance design.

This prevents technical ownership fields from accidentally making legal conclusions.

## Data storage boundary

- PostgreSQL stores business/domain data.
- File binaries should not be embedded in PostgreSQL by default.
- External infrastructure is accessed through adapters.
- Secrets are runtime configuration, never database defaults or repository content.
- Sensitive values must not be duplicated into logs or convenience caches without a defined requirement.

## Offboarding boundary

When a person/company relationship ends:

- the relationship changes state rather than disappearing;
- active relationship capabilities can be revoked;
- the person's account remains independent;
- company records are not silently deleted;
- future retention/access rules must be applied by explicit policy.

Final record-retention and former-employee access rules remain part of the document/data-governance design gate.

## Future extraction candidates

Only extract when justified:

- document-processing worker;
- notification worker;
- specialised audit/security event export;
- external document service.

Extraction is a later operational decision, not a requirement for v1.
