# Stack Design

## Goal

Use a conservative, self-hostable stack that supports sensitive employment/legal workflows without forcing early infrastructure complexity.

The stack must support strong company isolation, person independence, relationship-scoped access, auditability and later secure document handling.

## Proposed application stack

| Layer | Proposed choice | Reason |
|---|---|---|
| Web application | Next.js + React + TypeScript | Full-stack TypeScript, mature routing/rendering, good server boundary |
| Styling | Tailwind CSS + accessible component primitives | Consistent responsive UI without a heavy bespoke design framework |
| Database | PostgreSQL | Strong relational model, transactions, indexing and audit-friendly data |
| ORM / migrations | Prisma | Type-safe data access and explicit schema migrations |
| Identity boundary | OIDC-compatible provider; Keycloak is the leading self-hosted option | Avoid application-owned password/auth complexity |
| Object storage | S3-compatible API | Decouple application code from storage provider/location |
| Background jobs | BullMQ | Simple Node/TypeScript worker path for future heavy jobs |
| Queue | Redis | BullMQ coordination; add only when asynchronous jobs are needed |
| Malware scan | ClamAV | Scan external uploads before accepting them into trusted storage |
| Transactional email | SMTP adapter | Provider-neutral mail boundary |
| Reverse proxy / TLS | Caddy | Simple HTTPS and routing on the dedicated VM |
| Packaging | Docker / Docker Compose | Repeatable development and initial deployment |
| Payments | Gateway adapter layer | Keep provider-specific webhooks/API logic outside product entitlements |

## Initial process topology

Do not start with a service zoo.

```text
                ┌─────────────────────┐
                │     law-web/API     │
                │ Next.js/TypeScript  │
                └──────────┬──────────┘
                           │
                    ┌──────┴──────┐
                    │ PostgreSQL  │
                    └─────────────┘
```

Add the worker path when document processing or asynchronous notifications genuinely require it:

```text
law-web/API ──> queue ──> law-worker
     │                       │
 PostgreSQL              storage/scan
```

## Repository layout target

```text
/
├── apps/
│   ├── web/
│   └── worker/             # may remain empty/unimplemented initially
├── packages/
│   ├── database/
│   ├── identity/
│   ├── people/
│   ├── companies/
│   ├── relationships/
│   ├── requests/
│   ├── permissions/
│   ├── classification/
│   ├── audit/
│   ├── billing/
│   ├── storage/
│   └── ui/
├── infrastructure/
│   ├── docker/
│   └── caddy/
├── docs/
└── prompts/
```

The document package/service is intentionally not named here until its domain boundary is approved.

A future `matters/` or `cases/` package is added only if an actual legal workflow requires it; it is not a mandatory root domain.

## Core relational direction

At framework level, PostgreSQL should be able to represent:

```text
Person
Company
CompanyUser / CompanyMembership
PersonCompanyRelationship
Request / Action
ActivityEvent
Product / Price
CompanySubscription
Entitlement
```

This is not the final database schema. It establishes the dependency direction only.

Do not model sensitive document records until the document-engine design gate is approved.

## Adapter boundaries

### Identity

Application code asks for an authenticated actor. Provider-specific OIDC claims are translated at the edge.

The identity provider authenticates the account; Juanity Law determines company membership, relationship context and product permissions.

### Payments

```text
Gateway webhook/API
      ↓
Gateway adapter
      ↓
Billing service
      ↓
Company subscription / payment state
      ↓
Entitlements
```

The initial commercial direction is free person accounts and paid company workspaces.

### Storage

```text
Application/domain
      ↓
Storage interface
      ↓
S3-compatible adapter
```

No public bucket URLs as an authorisation mechanism.

Sensitive storage must later support private objects, controlled temporary access, audit integration, quarantine/scanning and protected backups according to the approved document model.

### Email

```text
Application event
      ↓
Notification/mail service
      ↓
SMTP adapter
```

Notifications must not leak sensitive employment/legal content into email by default. Prefer concise notifications that direct the authenticated user back to the portal.

### Audit

Application/domain services emit structured security/business events through an audit boundary. Audit storage/export may remain in PostgreSQL initially, provided access and immutability expectations are explicitly handled.

## Data classification boundary

Classification is an application/security concept rather than a storage-provider feature.

Working classes:

```text
PUBLIC
INTERNAL
PERSONAL
SENSITIVE
HIGHLY_SENSITIVE
```

Authorisation and future document handling may consume classification as a policy input.

## What is deliberately excluded now

- Kubernetes
- service mesh
- Kafka / NATS
- Elasticsearch / OpenSearch
- multiple databases per module
- separate frontend/backend repositories
- GraphQL unless a real requirement appears
- dark-mode implementation as an initial requirement
- LMS integration
- e-signature provider
- AI document analysis
- mandatory Matter/case architecture

## Version policy

At implementation time, pin current supported/LTS versions in manifests and lockfiles. Do not encode version numbers in planning docs that will silently become stale.

## Runtime sizing assumption

For the first dedicated Law development VM, start with approximately:

- 4 vCPU
- 8 GB RAM
- 80–100 GB SSD

This is a starting assumption, not a production capacity commitment. Measure before sizing production.

The production hosting region/provider and storage location must be chosen with security, privacy, legal/compliance, backup and operational requirements in mind rather than convenience alone.
