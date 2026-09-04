# Application Framework

## Architectural approach

Start as a **modular monolith** with strong domain boundaries.

The goal is to keep the codebase easy to understand and deploy while preserving the option to extract workers or services later if scale or security requires it.

## Initial modules

### Identity boundary

Responsibilities:

- authenticated principal mapping;
- local user profile;
- organisation membership;
- session-to-domain actor resolution;
- future OIDC integration.

It must not spread provider-specific identity logic throughout the application.

### Organisations

Responsibilities:

- organisation record;
- members;
- roles/capabilities;
- billing owner relationship;
- organisation status.

### Matters

Responsibilities:

- matter lifecycle;
- matter metadata;
- participants;
- matter access boundaries;
- matter status.

A matter is intentionally generic enough to represent different legal-service workflows without assuming litigation.

### Requests / Actions

Responsibilities:

- action requested from a user or participant;
- due/status information;
- completion state;
- response metadata;
- linkage to a matter;
- future linkage to a document or other resource.

### Activity / Audit

Responsibilities:

- append meaningful business/security events;
- expose user-friendly recent activity;
- support later audit export;
- preserve actor, resource, organisation, matter and timestamp context.

### Billing / Entitlements

Responsibilities:

- product catalogue;
- prices;
- subscription state;
- payment records;
- gateway adapters;
- capability/limit grants.

Feature code consumes entitlements; it does not interpret payment-gateway payloads directly.

### Admin

Responsibilities:

- organisation/user administration;
- matter visibility according to policy;
- product and entitlement configuration;
- operational status;
- audit investigation tools.

### Documents

**Reserved boundary — design pending.**

The framework may expose neutral identifiers or extension points, but no final document schema, access semantics, retention policy, sharing model or document workflow is approved yet.

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
 + Organisation
 + Matter membership / relationship
 + Resource
 + Capability
 = Allow / Deny
```

Client-provided tenant, role or entitlement claims are never authoritative.

## Activity model

Examples of framework-level events:

- `USER_JOINED_ORGANISATION`
- `USER_ROLE_CHANGED`
- `MATTER_CREATED`
- `MATTER_STATUS_CHANGED`
- `PARTICIPANT_ADDED`
- `REQUEST_CREATED`
- `REQUEST_COMPLETED`
- `SUBSCRIPTION_CHANGED`
- `PAYMENT_RECORDED`

Document-specific audit events will be defined with the document engine.

## Data ownership

- PostgreSQL stores business/domain data.
- File binaries should not be embedded in PostgreSQL by default.
- External infrastructure is accessed through adapters.
- Secrets are runtime configuration, never database defaults or repository content.

## Future extraction candidates

Only extract when justified:

- document-processing worker;
- notification worker;
- external document service;
- specialised audit export service.

Extraction is a later operational decision, not a requirement for v1.
