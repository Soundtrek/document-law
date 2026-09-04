# Stack Design

## Goal

Use a conservative, self-hostable stack that supports sensitive employment/legal workflows without forcing early infrastructure complexity.

The stack must support strong company isolation, person independence, relationship-scoped access, auditability, secure document handling, future federated/social login and later LMS integration without requiring a core rewrite.

## Proposed application stack

| Layer | Proposed choice | Reason |
|---|---|---|
| Web application | Next.js + React + TypeScript | Full-stack TypeScript, mature routing/rendering, good server boundary |
| Styling | Tailwind CSS + accessible component primitives | Consistent responsive UI without a heavy bespoke design framework |
| Database | PostgreSQL | Strong relational model, transactions, indexing and audit-friendly data |
| ORM / migrations | Prisma | Type-safe data access and explicit schema migrations |
| Identity boundary | OIDC-compatible provider; Keycloak is the leading self-hosted option | Email login now; broker/federate approved social providers later without domain coupling |
| Object storage | S3-compatible API | Decouple application code from storage provider/location |
| Background jobs | BullMQ | Simple Node/TypeScript worker path for future heavy jobs |
| Queue | Redis | BullMQ coordination; add only when asynchronous jobs are needed |
| Malware scan | ClamAV | Scan external uploads before accepting them into trusted storage |
| Transactional email | SMTP adapter | Provider-neutral mail boundary |
| Reverse proxy / TLS | Caddy | Simple HTTPS and routing on the dedicated VM |
| Packaging | Docker / Docker Compose | Repeatable development and initial deployment |
| Payments | Gateway adapter layer | Keep provider-specific webhooks/API logic outside product entitlements |
| Future learning | Moodle or another approved LMS behind SSO/API integration boundary | Keep learning delivery separate from Juanity core identity/documents |

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

Moodle is not part of the initial runtime. A later topology may add it as a separate service/integration:

```text
Juanity Law ── SSO/API ──> Moodle
     │                      │
 identity/company/          courses/progress/
 relationship authority    assessments/certification
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
│   ├── records/
│   ├── audit/
│   ├── billing/
│   ├── storage/
│   ├── integrations/       # future provider/LMS adapters; no domain authority
│   └── ui/
├── infrastructure/
│   ├── docker/
│   └── caddy/
├── docs/
└── prompts/
```

A future `matters/` or `cases/` package is added only if an actual legal workflow requires it; it is not a mandatory root domain.

## Core relational direction

PostgreSQL should represent stable Juanity identities independently from login provider details:

```text
Account
AccountIdentity
Person
Company
CompanyMember / CompanyMembership
FunctionalRoleGrant
PersonCompanyRelationship
RecordDefinition / RecordDefinitionVersion
Record / RecordFile
LegalAccessGrant
Request / Action
ActivityEvent
Product / Price
CompanySubscription
Entitlement
```

`Account.id` / `Person.id` are stable Juanity identifiers. Email and external-provider identifiers are attributes/links, not replacement primary keys.

Future Moodle/user/course identifiers are integration references and must not replace Juanity primary keys.

## Adapter boundaries

### Identity

Application code asks for an authenticated actor. Provider-specific OIDC claims are translated at the edge.

The identity provider authenticates the account; Juanity Law determines company membership, relationship context, Governance capabilities, legal access and product permissions.

Identity architecture must support:

- email-based login now;
- multiple linked external identities later;
- provider/broker integration for Google/Microsoft/Apple or other approved providers;
- verified-email state;
- MFA/step-up policy;
- safe account linking without automatic merge solely by email equality.

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

Sensitive storage must support private objects, controlled temporary access, audit integration, quarantine/scanning and protected backups according to the approved Document Knowledge Engine model.

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

### Future learning / Moodle

```text
Juanity training assignment / relationship context
        ↓
Learning integration adapter
        ↓
Moodle SSO / API
        ↓
Completion / certification result
        ↓
Juanity learning projection / optional Record artefact
```

Juanity remains authoritative for identity, company/relationship context and access. Moodle remains authoritative for course content, activities, progress, assessments and LMS-generated completion/certification results.

Do not copy the whole Moodle data model into Juanity. Synchronise only approved summary/result data needed by Juanity workflows.

A Moodle certificate PDF, when imported into Juanity, should use the normal Record/RecordFile engine rather than a separate LMS-specific document store.

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

Authorisation and document handling may consume classification as a policy input.

## Future-integration readiness rule

Preparing for a future integration means preserving a clean boundary now, not installing the integration early.

V1 should therefore:

- use stable internal account IDs;
- support multiple AccountIdentity links conceptually/schema-wise;
- avoid password-only assumptions in UI/domain logic;
- keep auth provider claims at the identity edge;
- reserve provider-neutral integration adapter boundaries;
- keep training/certification capable of attaching to Person / Company / Relationship context;
- keep certificate files inside the normal Record engine.

See `docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md`.

## What is deliberately excluded now

- Kubernetes
- service mesh
- Kafka / NATS
- Elasticsearch / OpenSearch
- multiple databases per module
- separate frontend/backend repositories
- GraphQL unless a real requirement appears
- dark-mode implementation as an initial requirement
- Moodle deployment/integration in V1
- social-login production credentials/UI in V1
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

Moodle may later justify its own runtime/container resources rather than being forced into the initial Juanity web/database footprint.

The production hosting region/provider and storage location must be chosen with security, privacy, legal/compliance, backup and operational requirements in mind rather than convenience alone.
