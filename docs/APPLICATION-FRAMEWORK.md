# Application Framework

## Architectural approach

Start as a **modular monolith** with strong domain boundaries.

The goal is to keep the codebase easy to understand and deploy while preserving the option to extract workers or services later if scale, security or document processing requires it.

## Primary domain model

SAMMA is built around three foundational concepts:

```text
Person  ↔  PersonCompanyRelationship  ↔  Company
```

The relationship is the controlled bridge through which employment context, requests, later record/document access and activity are scoped.

A generic legal `Matter` is not a foundational v1 entity. It may be introduced later as an optional context if a real workflow requires it.

A second important control plane is:

```text
SAMMA Platform Admin
        ↓
Versioned Record / Request / Workflow Definitions
        ↓
Company users execute approved workflows
```

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
- company members;
- member invitations;
- functional role grants;
- billing owner/governance context;
- company Info Center projection.

The company is expected to be the primary paid tenant/workspace.

### Company Membership and Functional Roles

Company membership and functional access must be separate concepts.

A company member may hold one or many roles.

Initial role concepts may include:

- `OWNER` — governance, company membership/role administration and approved company settings;
- `HR`;
- `PAYROLL`;
- `CLERK` / records administration;
- `LEGAL`;
- `MANAGER`;
- `BILLING`;
- other SAMMA-approved roles later.

One-person company example:

```text
Susan
  ├── OWNER
  ├── HR
  ├── PAYROLL
  └── CLERK
```

Larger-company example:

```text
Director              → OWNER, BILLING
HR Manager            → HR
Payroll Administrator → PAYROLL
Records Clerk         → CLERK
Legal Officer         → LEGAL
Manager               → MANAGER
```

`OWNER` is primarily a governance capability. It should allow the owner to invite/remove staff, assign/revoke approved roles and assign functional roles to themselves, but it must not become an unconditional sensitive-data bypass.

Role grants are server-side domain records and role changes are auditable.

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
- future linkage to employment/legal record instances.

The initial product may primarily use an employee relationship, but the domain should not be coded so narrowly that former employees, contractors or other approved relationship types require a rewrite.

Ending a relationship must not delete the person account.

### Configurable Definitions

SAMMA Platform Admin owns approved business-policy definitions.

Framework-level definition concepts should support:

- record definition;
- request/action definition;
- category;
- context: person/company/relationship;
- direction/audience;
- working classification/sensitivity;
- allowed creator/viewer/downloader/admin functional roles;
- acknowledgement requirement;
- Needs Action behaviour;
- notification policy;
- active/inactive state;
- retention-policy reference once approved;
- definition version.

Definitions must be versioned so future edits do not silently change historic record behaviour.

The final document/record storage schema remains behind the document-engine design gate. Definitions describe policy and workflow intent; they do not prematurely decide object-storage or final record persistence.

### Requests / Actions

Responsibilities:

- action requested from a person or authorised company user;
- requesting company/context;
- assigned person/user;
- due/status information where approved;
- completion state;
- response metadata;
- relationship linkage where relevant;
- linkage to a versioned request definition where used;
- future linkage to a record/document response.

Requests are a preferred pattern for obtaining information instead of granting broad access to a person's private information store.

### Information / record context

Responsibilities at framework level:

- provide neutral contextual boundaries for personal, company and relationship information;
- support data classification labels;
- support purpose/access metadata where required;
- support linkage to an approved/versioned definition;
- avoid defining the final record/document storage schema prematurely.

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
- audit company invitations and role changes;
- audit definition changes/version creation;
- support higher-fidelity access events for sensitive resources once the record/document domain is designed.

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

### SAMMA Platform Admin

Responsibilities:

- approved role catalogue/capability defaults;
- versioned record/request/workflow definitions;
- categories/classification options;
- system-wide configurable policy/templates;
- products/entitlements;
- operational administration;
- definition activation/deactivation and version history.

Platform Admin must not expose ordinary configuration that disables core security invariants.

### Company Admin

Responsibilities:

- company-member invitation/removal;
- functional role assignment/revocation;
- assigning roles to the company owner where they perform those functions;
- company-level settings within SAMMA-approved bounds;
- relationship administration according to policy;
- use of approved record/request definitions;
- company billing/subscription administration where authorised.

Company Admin must not mean unrestricted access to all sensitive records. Privileged record access requires explicit server-side policy and the relevant functional capabilities.

### Documents / Record Storage

**Reserved boundary — design pending.**

The framework may expose neutral identifiers or extension points, but no final document schema, storage model, access semantics, retention implementation, sharing model or legal ownership model is approved yet.

The eventual design must distinguish at least conceptually between:

- a person's private/personal records;
- company records;
- records created or held in the person/company relationship context.

Record instances should eventually be able to establish the definition/version that governed them. The exact snapshot/reference mechanism is part of the document-engine design.

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
 + Company membership
 + Functional role grants
 + Person relationship where applicable
 + Resource / definition policy
 + Data classification / sensitivity where applicable
 + Required capability
 = Allow / Deny
```

Client-provided company, relationship, role or entitlement claims are never authoritative.

Company membership alone must not imply access to all person/employee records.

Avoid unrestricted ad-hoc per-user exceptions in v1 unless an approved use case requires them; functional role grants are easier to understand, test and audit.

## Activity model

Examples of framework-level events:

- `PERSON_ACCOUNT_CREATED`
- `COMPANY_CREATED`
- `COMPANY_MEMBER_INVITED`
- `COMPANY_MEMBER_JOINED`
- `COMPANY_MEMBER_DISABLED`
- `COMPANY_MEMBER_ROLE_GRANTED`
- `COMPANY_MEMBER_ROLE_REVOKED`
- `RELATIONSHIP_CREATED`
- `RELATIONSHIP_STATUS_CHANGED`
- `RELATIONSHIP_ENDED`
- `DEFINITION_CREATED`
- `DEFINITION_VERSION_CREATED`
- `DEFINITION_ACTIVATED`
- `DEFINITION_DEACTIVATED`
- `REQUEST_CREATED`
- `REQUEST_COMPLETED`
- `SUBSCRIPTION_CHANGED`
- `PAYMENT_RECORDED`
- `PRIVILEGED_ACCESS_GRANTED`
- `PRIVILEGED_ACCESS_REVOKED`

Document/record-specific audit/access events will be finalised with the document engine.

## 3-click / 10-second interaction rule

Frequent routine actions should be exposed from their relevant context and normally require no more than three deliberate clicks/taps and about ten seconds, excluding meaningful data entry, file upload/selection, reading legal content or required security steps.

Examples:

```text
Relationship page → Add record → Choose definition/file → Send
Relationship page → Request → Choose request type → Send
Needs Action → Provide → Use existing/upload → Submit
Company Members → Invite → Person + roles → Send
```

This is a usability rule for routine work, not permission to compress high-risk security/administrative controls beyond what is safe.

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

`Company OWNER` is a governance role and should not be confused with legal ownership of information.

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

When a company member is disabled/removed:

- active company access is revoked;
- historical audit context remains;
- role grants no longer authorise new actions;
- membership removal must not damage records they previously created or administered.

Final record-retention and former-employee access rules remain part of the document/data-governance design gate.

## Future extraction candidates

Only extract when justified:

- document-processing worker;
- notification worker;
- specialised audit/security event export;
- external document service.

Extraction is a later operational decision, not a requirement for v1.


## Real user and company workflow V1 — 2026-09-05

The browser workflow now supports stable verified Account/Person onboarding, company creation with normal OWNER membership, selected company workspaces, employee invitations and acceptance, distinct Team & Access membership/roles, relationship-ID profiles, and existing persistent Garage record intake/download. Info Centers query PostgreSQL and enforce definition-specific employee visibility and company roles. DEV manual invitation links explicitly send no mail; Owner can assign self HR without receiving platform Governance.

See [workflow guide](REAL-WORKFLOW-V1.md), [complete preflight](REAL-WORKFLOW-V1-PREFLIGHT.md) and [validation report](REAL-WORKFLOW-V1-REPORT.md). SMTP, scanning, MFA activation and off-host restore remain open. Earlier descriptions of demo-only workflows are historical.
