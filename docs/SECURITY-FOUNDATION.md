# Security Foundation

## Purpose

Juanity Law will handle sensitive legal and client information. Security must therefore be structural rather than added after feature development.

This document establishes framework-level invariants. Document-specific security rules will be added only after the document engine is designed.

## Security principles

### Least privilege

Users receive only the capabilities needed for their organisation, matter and role.

### Server authority

The browser is never authoritative for:

- organisation membership;
- role;
- entitlement;
- ownership;
- access decisions;
- payment status.

### Explicit tenancy

Every protected business resource must resolve to an organisation/tenant boundary.

### Contextual matter access

Matter access is explicit. Organisation membership alone must not automatically imply access to every matter unless policy deliberately says so.

### Defence in depth

Identity, authorisation, storage access, auditing, network boundaries and backups each provide separate controls.

## Identity

Use an OIDC-compatible identity provider rather than implementing password handling inside the application.

Production expectations should include:

- secure password policy at the identity provider;
- MFA capability;
- session expiration/rotation;
- account recovery controls;
- login event visibility;
- privileged/admin authentication hardening.

Provider-specific claims are translated into an application actor at the boundary.

## Authorisation

Authorisation should be capability-based and server enforced.

Example capabilities:

- `organisation.manage`
- `matter.create`
- `matter.view`
- `matter.manage_participants`
- `request.create`
- `request.complete`
- `activity.view`
- `billing.manage`
- `admin.manage_users`

Document capabilities are intentionally deferred.

Every protected command/query should identify:

```text
actor
organisation
resource
required capability
```

and fail closed if context is incomplete.

## Data protection

- Use TLS for all external traffic.
- Encrypt infrastructure volumes/storage where the chosen provider supports it.
- Never commit secrets.
- Avoid sensitive values in URLs.
- Do not log credentials, tokens, private document content or unnecessary personal information.
- Use environment/runtime secret injection.
- Separate production credentials from development credentials.

## Storage boundary

When document storage is implemented:

- buckets/containers are private;
- application authorisation precedes file access;
- short-lived signed access may be used where appropriate;
- externally uploaded material enters a quarantine/scanning path;
- storage keys do not serve as permission checks.

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
- quarantine before trusted availability.

## Audit

Security-relevant actions should emit durable events where appropriate, including:

- membership changes;
- role/capability changes;
- matter participant changes;
- privileged admin actions;
- authentication/security events imported where practical;
- billing entitlement changes.

Document audit events will be defined with the document domain.

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

- tenant-isolation tests;
- horizontal/vertical privilege-escalation tests;
- IDOR/resource-reference tests;
- admin-path review;
- session/logout/recovery review;
- upload/download abuse testing once documents exist;
- webhook signature/idempotency testing;
- dependency vulnerability review;
- backup confidentiality review;
- secrets/config review;
- restore drill.

## Incident principle

Preserve evidence before destructive cleanup where legally and operationally appropriate. Recovery procedures must distinguish service restoration from forensic/investigation needs.
