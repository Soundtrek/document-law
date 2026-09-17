# SAMMA Hosting Before Dedicated VMs

## Current decision

Until the client approves a different hosting/VM arrangement, the NUC is the approved temporary host for both SAMMA production and development.

This supersedes the earlier assumption in this document that the NUC was development-only.

Current runtime:

```text
NUC
├── production
│   ├── https://samma.co.za
│   ├── branch: main
│   └── PostgreSQL: juanity_law
│
└── development
    ├── https://dev.samma.co.za
    ├── branch: dev
    └── PostgreSQL: samma_dev
```

The NUC decision is deliberately small and temporary. Do not add infrastructure merely to imitate a future production topology.

## Repository-first remains mandatory

The application must remain reproducible from Git and private runtime configuration. Do not make SAMMA dependent on hand-tuned NUC state.

Keep infrastructure behind adapters and configuration boundaries:

- PostgreSQL for metadata, knowledge, access, retention and audit;
- private S3-compatible object storage for document binaries;
- OIDC/Keycloak behind the identity boundary;
- mail behind the mail adapter;
- future external services behind explicit integration boundaries.

## Production and development separation

Even on one physical NUC, production and development are distinct runtime contexts.

Production database:

```text
juanity_law
```

Development database:

```text
samma_dev
```

Never point DEV at `juanity_law` to make tests pass. Never copy DEV metadata, users, companies, records or definitions into production as an implicit effect of code promotion.

Production and development currently share some infrastructure. In particular, Keycloak is currently a shared service/realm, and document storage currently uses shared Garage configuration. These are known temporary limitations, not proof of full environment isolation.

## Object storage direction

The NUC should not become the long-term document-binary store.

The intended direction is separate external S3-compatible storage for production and development, with private buckets/credentials and SAMMA authorisation remaining authoritative before object access.

Until that migration is completed:

- do not delete existing Garage objects as part of unrelated work;
- do not treat the shared Garage bucket as a fully isolated production storage design;
- do not create a second application storage implementation;
- continue using the provider-neutral storage adapter.

## Keep the NUC boring

Current production/development hosting should remain intentionally small:

- web application;
- PostgreSQL;
- Keycloak;
- existing reverse proxy/runtime plumbing;
- only the supporting services actually required.

Do not introduce Kubernetes, microservices, extra orchestration layers, extra preview tiers or duplicate databases merely because they might be useful later.

Temporary experiment/preview runtimes may be created for a specific task and removed when no longer needed.

## Resource gate

Because production and development share one physical host, resource awareness still matters. Before adding a material service, inspect only the relevant capacity:

- disk headroom;
- RAM/swap pressure;
- CPU/load;
- persistent database/storage growth;
- impact on the other SAMMA runtime.

Do not repeat broad resource audits for ordinary code/UI changes.

## Sensitive data boundary

Development uses synthetic/test data. Do not copy real production employee/client documents or production metadata into DEV for convenience.

Production may contain real data under the approved runtime, but the current NUC arrangement is temporary pending the client infrastructure decision. Backup, storage separation and eventual host migration remain explicit infrastructure work rather than assumptions hidden inside feature development.

## Session validation

Follow `docs/CODEX-SESSION-METHODOLOGY.md`.

Validate the session, not every code block:

```text
session start baseline
→ focused implementation checks
→ session-close validation once
→ promotion/deployment gate when required
```

Use stronger checks immediately only when the session crosses a high-risk boundary such as schema/migrations, permissions, authentication, storage migration, destructive data work, secrets or production infrastructure.

## Future VM/hosting change

When the client decides on dedicated VMs or another provider:

1. define the new production/development topology;
2. update the runtime/branch documentation first;
3. migrate with explicit database/storage/identity rollback boundaries;
4. do not assume the old Rackzar proposal or any historical target is still the chosen destination.

## Guiding rule

**Use the NUC as the current production + development host, keep it boring, preserve environment boundaries, and be ready to move when the client hosting decision is made.**
