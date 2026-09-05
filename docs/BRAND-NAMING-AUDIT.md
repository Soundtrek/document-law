# Brand naming audit — Phase A

Audit date: 2026-09-05. This document is a historical audit of the rename from
Juanity (former development name) to SAMMA. Old spellings quoted below are
intentional historical evidence, not current product branding.

The initial nonignored repository scan found 379 occurrences on 351 lines in
64 files. The ignored `.env.nuc` additionally contained two old environment key
names; their values were not printed or copied into this report. Git object
history, installed dependencies, generated Prisma/Next output and caches are
not editable source; generated output is rebuilt from the renamed source.

## Classification and disposition

| Category | Occurrences | Action |
| --- | ---: | --- |
| A — User-facing branding | 19 | Rename to SAMMA; health service becomes samma-web. |
| B — Code/domain terminology | 64 | Rename product strings and private workspace scope to @samma; preserve domain model. |
| C — Environment variables | 27 | Coordinate SAMMA_* names in code, examples, Compose and ignored deployment environment. |
| D — Database identifiers | 18 | Preserve database/user/connection and volume literals. |
| E — Docker/deployment identifiers | 14 | Preserve active names and paths; rename operator messages. |
| F — Documentation | 196 | Update current prose and commands; retain literal legacy infrastructure references. |
| G — Tests/fixtures | 2 | Update package imports; synthetic domain values unchanged. |
| H — History | 39 | Preserve old decisions/prompts with former-name context. |

Each match below has a primary category; documentation can quote environment or
infrastructure identifiers and follows the corresponding identifier policy.

## Retained runtime names

**LEGACY INTERNAL NAME — SAFE TO RENAME LATER** applies to:

- Compose project/private network `juanity-dev`; containers `juanity-app`, `juanity-db`.
- PostgreSQL database `juanity_law`, role `juanity` and local-only example credentials.
- Development Compose volume `juanity-postgres`.
- Archive paths under `/srv/nuc-archive/juanity`, including caches and backups.
- Existing Caddy `juanity.caddy` include and `juanity-app:3000` upstream.

Renaming these offers no user-visible benefit and could disrupt the active
deployment or detach persistence. They do not appear in public product copy.
All `JUANITY_*` environment keys are coordinated to `SAMMA_*`; no compatibility
variables are needed because their consumers and deployment settings are owned
here. Domain entities and the approved Prisma schema/migrations remain intact.

## Original occurrence inventory

Line numbers refer to the deployment checkpoint, before the rename.

| File:line | Category | Matches | Original line (historical) |
| --- | --- | ---: | --- |
| infrastructure/docker/Dockerfile.dev:19 | B | 1 | CMD ["npm", "run", "dev", "--workspace", "@juanity/web", "--", "-H", "0.0.0.0"] |
| apps/web/components/invite-member-form.tsx:3 | B | 1 | import type { FunctionalRoleDefinition } from "@juanity/domain"; |
| apps/web/components/add-record-form.tsx:3 | B | 1 | import type { RecordDefinitionVersion } from "@juanity/domain"; |
| apps/web/components/add-record-form.tsx:37 | A | 1 | Juanity policy will apply automatically: {selected.category} · {selected.classification.replaceAll("_", " ")} · person visible: {selected.personVisible ? "yes" : "no"} · retention: {selected.retentionMonths ?? "none"} months · review: {selected.reviewMonths ?? "none"} months. |
| infrastructure/docker/compose.dev.yml:5 | D | 1 | POSTGRES_DB: juanity_law |
| infrastructure/docker/compose.dev.yml:6 | D | 1 | POSTGRES_USER: juanity |
| infrastructure/docker/compose.dev.yml:7 | D | 1 | POSTGRES_PASSWORD: juanity_dev_only |
| infrastructure/docker/compose.dev.yml:9 | D | 2 | test: ["CMD-SHELL", "pg_isready -U juanity -d juanity_law"] |
| infrastructure/docker/compose.dev.yml:14 | E | 1 | - juanity-postgres:/var/lib/postgresql/data |
| infrastructure/docker/compose.dev.yml:22 | D | 3 | DATABASE_URL: postgresql://juanity:juanity_dev_only@db:5432/juanity_law |
| infrastructure/docker/compose.dev.yml:23 | C | 1 | JUANITY_ENV: development |
| infrastructure/docker/compose.dev.yml:24 | C | 1 | JUANITY_BASE_URL: http://localhost:3000 |
| infrastructure/docker/compose.dev.yml:25 | C | 1 | JUANITY_DEV_IDENTITY_ENABLED: "true" |
| infrastructure/docker/compose.dev.yml:26 | C | 1 | JUANITY_STORAGE_DRIVER: memory |
| infrastructure/docker/compose.dev.yml:35 | E | 1 | juanity-postgres: |
| apps/web/components/grant-legal-access-form.tsx:3 | B | 1 | import type { RecordDefinitionVersion } from "@juanity/domain"; |
| apps/web/components/sign-in-form.tsx:23 | A | 1 | {ready ? <p className="notice warning">Development boundary reached for {email}. Credentials, verification, recovery and MFA will be handled by the OIDC identity provider rather than by Juanity application code.</p> : null} |
| infrastructure/docker/compose.nuc.yml:1 | E | 1 | name: juanity-dev |
| infrastructure/docker/compose.nuc.yml:12 | E | 1 | container_name: juanity-db |
| infrastructure/docker/compose.nuc.yml:14 | D | 1 | POSTGRES_DB: juanity_law |
| infrastructure/docker/compose.nuc.yml:15 | D | 1 | POSTGRES_USER: juanity |
| infrastructure/docker/compose.nuc.yml:16 | C | 2 | POSTGRES_PASSWORD: ${JUANITY_DB_PASSWORD:?Set JUANITY_DB_PASSWORD in .env.nuc} |
| infrastructure/docker/compose.nuc.yml:19 | D | 2 | test: ["CMD-SHELL", "pg_isready -U juanity -d juanity_law"] |
| infrastructure/docker/compose.nuc.yml:25 | E | 1 | source: /srv/nuc-archive/juanity/postgres |
| infrastructure/docker/compose.nuc.yml:40 | C | 2 | image: ${JUANITY_NODE_IMAGE:?Set pinned JUANITY_NODE_IMAGE in .env.nuc} |
| infrastructure/docker/compose.nuc.yml:41 | E | 1 | container_name: juanity-app |
| infrastructure/docker/compose.nuc.yml:45 | B | 1 | command: ["npm", "run", "dev", "--workspace", "@juanity/web", "--", "-H", "0.0.0.0"] |
| infrastructure/docker/compose.nuc.yml:47 | C | 3 | DATABASE_URL: postgresql://juanity:${JUANITY_DB_PASSWORD}@db:5432/juanity_law |
| infrastructure/docker/compose.nuc.yml:48 | C | 1 | JUANITY_ENV: development |
| infrastructure/docker/compose.nuc.yml:49 | C | 1 | JUANITY_BASE_URL: https://samma.co.za |
| infrastructure/docker/compose.nuc.yml:50 | C | 1 | JUANITY_DEV_IDENTITY_ENABLED: "true" |
| infrastructure/docker/compose.nuc.yml:51 | C | 1 | JUANITY_STORAGE_DRIVER: memory |
| infrastructure/docker/compose.nuc.yml:68 | E | 1 | source: /srv/nuc-archive/juanity/node_modules |
| infrastructure/docker/compose.nuc.yml:73 | E | 1 | source: /srv/nuc-archive/juanity/next-cache |
| infrastructure/docker/compose.nuc.yml:78 | E | 1 | source: /srv/nuc-archive/juanity/npm-cache |
| infrastructure/docker/compose.nuc.yml:85 | E | 1 | aliases: [juanity-app] |
| infrastructure/docker/compose.nuc.yml:92 | C | 1 | mem_limit: ${JUANITY_WEB_MEMORY:-1g} |
| infrastructure/docker/compose.nuc.yml:94 | C | 1 | memswap_limit: ${JUANITY_WEB_MEMORY:-1g} |
| infrastructure/docker/compose.nuc.yml:95 | C | 1 | cpus: ${JUANITY_WEB_CPUS:-0.75} |
| infrastructure/docker/compose.nuc.yml:103 | E | 1 | name: juanity-dev |
| apps/web/components/activity-list.tsx:1 | B | 1 | import type { ActivityEvent } from "@juanity/domain"; |
| infrastructure/docker/nuc-compose.sh:6 | E | 1 | echo 'Refusing Juanity operation: expected archive filesystem is not mounted.' >&2 |
| infrastructure/docker/nuc-compose.sh:10 | E | 1 | test -d "/srv/nuc-archive/juanity/$directory" \|\| { |
| infrastructure/docker/nuc-compose.sh:11 | E | 1 | echo "Missing Juanity directory: $directory" >&2 |
| apps/web/components/record-list.tsx:1 | B | 1 | import type { RecordProjection } from "@juanity/domain"; |
| apps/web/package.json:2 | B | 1 | "name": "@juanity/web", |
| apps/web/package.json:14 | B | 1 | "@juanity/domain": "*", |
| apps/web/package.json:15 | B | 1 | "@juanity/identity": "*", |
| apps/web/package.json:16 | B | 1 | "@juanity/storage": "*", |
| .github/workflows/ci.yml:1 | B | 1 | name: Juanity V1 CI |
| .github/workflows/ci.yml:13 | D | 3 | DATABASE_URL: postgresql://juanity:juanity@localhost:5432/juanity_law |
| .env.example:1 | D | 3 | DATABASE_URL=postgresql://juanity:juanity@127.0.0.1:5432/juanity_law |
| .env.example:2 | C | 1 | JUANITY_ENV=development |
| .env.example:3 | C | 1 | JUANITY_BASE_URL=http://localhost:3000 |
| .env.example:4 | C | 1 | JUANITY_DEV_IDENTITY_ENABLED=true |
| .env.example:5 | C | 1 | JUANITY_STORAGE_DRIVER=memory |
| apps/web/app/api/health/route.ts:8 | A | 1 | service: "juanity-law-web", |
| apps/web/app/api/health/route.ts:9 | C | 1 | mode: process.env.JUANITY_ENV ?? "development", |
| apps/web/app/api/health/route.ts:10 | C | 1 | storage: process.env.JUANITY_STORAGE_DRIVER ?? "memory", |
| apps/web/app/layout.tsx:8 | A | 1 | title: "Juanity Law", |
| apps/web/app/layout.tsx:19 | A | 1 | <strong>Juanity Law</strong> |
| apps/web/app/governance/page.tsx:1 | B | 1 | import { syntheticDefinitions } from "@juanity/domain"; |
| apps/web/app/governance/page.tsx:14 | A | 1 | eyebrow="JUANITY GOVERNANCE" |
| apps/web/app/governance/page.tsx:16 | A | 1 | description="Governance is Juanity's restricted policy surface—not a generic company admin area. Production access requires verified identity, MFA and explicit Governance capabilities on every protected request." |
| apps/web/app/governance/page.tsx:29 | C | 1 | <p className="muted">Set JUANITY_DEV_IDENTITY_ENABLED=true only in a non-production development environment to view synthetic Governance fixtures. Production will use the OIDC/MFA capability boundary.</p> |
| apps/web/app/governance/page.tsx:40 | A | 1 | <h2>Juanity sets policy once; daily users get smart defaults</h2> |
| prompts/history/2026-09-05-configurable-records-company-roles.md:5 | H | 2 | Refine Juanity Law so employment/legal record behaviour is configured in Juanity Platform Admin instead of hard-coded for every record type, while supporting both one-person companies and larger companies with separate HR/payroll/legal/admin staff. |
| prompts/history/2026-09-05-configurable-records-company-roles.md:10 | H | 1 | - Juanity must be able to define record/workflow policy in Admin. |
| prompts/history/2026-09-05-configurable-records-company-roles.md:22 | H | 1 | Introduce a Juanity Platform Admin configuration layer with versioned record/request/workflow definitions. |
| prompts/history/2026-09-05-configurable-records-company-roles.md:54 | H | 1 | - future Juanity-approved roles. |
| prompts/history/2026-09-05-configurable-records-company-roles.md:83 | H | 1 | Smart defaults from Juanity-approved definitions carry complexity so routine users do not repeatedly select security/policy options. |
| prompts/history/2026-09-05-storage-architecture.md:5 | H | 1 | Define how Juanity Law stores sensitive document binaries without coupling the Document Knowledge Engine to the application VM or PostgreSQL. |
| prompts/history/2026-09-05-storage-architecture.md:12 | H | 1 | - The NUC is not a Juanity Law runtime/storage target. |
| prompts/history/2026-09-05-storage-architecture.md:31 | H | 1 | - Production object storage is private and intended to be separate from the Juanity application VM failure domain. |
| prompts/history/2026-09-05-storage-architecture.md:32 | H | 1 | - Juanity server-side authorisation precedes file/object access. |
| prompts/history/2026-09-05-storage-architecture.md:37 | H | 1 | - S3 lifecycle rules may support operations but do not replace Juanity retention policy. |
| prompts/history/2026-09-05-nuc-deployment.md:15 | H | 1 | applied to a new Juanity database and verified by an empty schema diff; and a |
| prompts/history/2026-09-05-nuc-deployment.md:16 | H | 1 | Juanity-only Caddy include targeting the app container on port 3000. It also |
| prompts/PROMPT-CAPTURE.md:5 | H | 1 | Juanity Law uses AI-assisted development. Important prompts therefore form part of the project record because they often contain intent, constraints and approval boundaries that are not obvious from code alone. |
| prompts/PROMPT-CAPTURE.md:65 | H | 1 | Establish the Juanity Law repository as the planning/build-control base for a new paid legal client portal before designing the document engine itself. |
| prompts/PROMPT-CAPTURE.md:69 | H | 1 | - Build Juanity Law from scratch. |
| prompts/PROMPT-CAPTURE.md:74 | H | 1 | - The existing NUC is stretched and must not become the Juanity Law runtime target. |
| prompts/PROMPT-CAPTURE.md:126 | H | 1 | Correct the framework so it reflects the actual Juanity Law product rather than a generic legal matter portal. |
| prompts/PROMPT-CAPTURE.md:135 | H | 1 | - for Juanity Law, the common relationship is employer/employee; |
| apps/web/app/records/[recordId]/page.tsx:1 | B | 1 | import { syntheticDefinitions, syntheticFiles, syntheticRecords } from "@juanity/domain"; |
| package.json:2 | B | 1 | "name": "juanity-law", |
| package.json:13 | B | 1 | "dev": "npm run dev --workspace @juanity/web", |
| package.json:18 | B | 1 | "db:generate": "npm run generate --workspace @juanity/database", |
| package.json:19 | B | 1 | "db:validate": "npm run validate --workspace @juanity/database" |
| apps/web/app/sign-in/page.tsx:12 | A | 1 | description="Email is the primary human-facing login identifier. Juanity keeps a stable internal Account ID so email changes and future linked providers do not create duplicate people or relationships." |
| apps/web/app/sign-in/page.tsx:21 | A | 1 | <p className="muted">The identity provider proves who you are. Juanity then resolves Person, company membership, functional roles, Legal Access and Governance capabilities for that stable account.</p> |
| apps/web/app/sign-in/page.tsx:22 | A | 1 | <p className="notice">Juanity application code never needs to implement password cryptography.</p> |
| README.md:1 | F | 1 | # Juanity Law |
| README.md:3 | F | 1 | Juanity Law is a secure **document knowledge system** for employment and legal records. |
| README.md:15 | F | 1 | - Juanity Governance defines versioned record types, retention/review policy and approved role access rather than hard-coding every document workflow. |
| README.md:74 | F | 1 | - \`/governance\` — restricted Juanity Governance shell; |
| README.md:82 | F | 1 | Juanity Governance defines versioned record/request/workflow policy instead of hard-coding every record type. |
| README.md:92 | F | 1 | Email address is the primary human-facing login/contact identifier, while Juanity uses a stable internal Account ID so later social/federated identities can link to the same person without duplicating their records or company relationships. |
| README.md:94 | F | 1 | There is no generic \`/admin\` surface. Juanity-only privileged controls live under **Governance** (\`/governance\` initially). |
| README.md:112 | F | 1 | Production object storage is intended to be private and separate from the application-host failure domain. Juanity authorises access before any object is served. Object keys are opaque, uploads pass through quarantine/validation/malware-scan/checksum before acceptance, and primary object storage is not treated as a backup. |
| README.md:122 | F | 1 | Juanity is expected to add company onboarding, training and certification later, with **Moodle currently the leading LMS direction**. |
| README.md:124 | F | 2 | Juanity remains the authority for identity, companies, relationships and access; Moodle remains the learning-delivery engine. Training certificates imported into Juanity use the normal Record/RecordFile engine. |
| README.md:159 | F | 1 | The existing NUC may be used as a **temporary development/integration host** if a resource check shows adequate disk, RAM and CPU headroom. The NUC is not the Juanity production host, not the sole backup destination, and not the production object-storage design. |
| AGENTS.md:1 | F | 1 | # Juanity Law — AI / Codex Working Rules |
| AGENTS.md:7 | F | 1 | Juanity Law is a new application and **document knowledge system**. Do not couple it to another product runtime, schema, authentication system, database or package model. |
| AGENTS.md:69 | F | 1 | - Juanity authorisation occurs before object access; |
| AGENTS.md:73 | F | 1 | - S3 lifecycle rules do not replace Juanity retention policy; |
| AGENTS.md:80 | F | 1 | Juanity Governance defines approved record/request/workflow policy instead of hard-coding every employment/legal record type. Definitions are versioned. System security invariants are not ordinary Governance settings. |
| AGENTS.md:104 | F | 1 | Do not create a generic \`/admin\` route. Juanity-only privileged control is **Governance**, initially \`/governance\`. |
| AGENTS.md:110 | F | 2 | Moodle/company training is a future integration, not V1 runtime. Juanity remains authoritative for account/company/relationship/access; Moodle owns courses/progress/assessment. Certificates imported into Juanity use the normal Record/RecordFile path. |
| AGENTS.md:161 | F | 1 | The NUC is not the production host, not the sole backup destination and not the production object-storage architecture. Synthetic data only. If Juanity destabilises existing workloads, stop the NUC runtime experiment and continue repository-first or move to the dedicated Law VM. |
| package-lock.json:2 | B | 1 | "name": "juanity-law", |
| package-lock.json:7 | B | 1 | "name": "juanity-law", |
| package-lock.json:17 | B | 1 | "name": "@juanity/web", |
| package-lock.json:20 | B | 1 | "@juanity/domain": "*", |
| package-lock.json:21 | B | 1 | "@juanity/identity": "*", |
| package-lock.json:22 | B | 1 | "@juanity/storage": "*", |
| package-lock.json:1542 | B | 1 | "node_modules/@juanity/application": { |
| package-lock.json:1546 | B | 1 | "node_modules/@juanity/database": { |
| package-lock.json:1550 | B | 1 | "node_modules/@juanity/domain": { |
| package-lock.json:1554 | B | 1 | "node_modules/@juanity/identity": { |
| package-lock.json:1558 | B | 1 | "node_modules/@juanity/integrations": { |
| package-lock.json:1562 | B | 1 | "node_modules/@juanity/storage": { |
| package-lock.json:1566 | B | 1 | "node_modules/@juanity/web": { |
| package-lock.json:8409 | B | 1 | "name": "@juanity/application", |
| package-lock.json:8412 | B | 1 | "@juanity/domain": "*", |
| package-lock.json:8413 | B | 1 | "@juanity/storage": "*" |
| package-lock.json:8432 | B | 1 | "name": "@juanity/database", |
| package-lock.json:8448 | B | 1 | "name": "@juanity/domain", |
| package-lock.json:8457 | B | 1 | "name": "@juanity/identity", |
| package-lock.json:8466 | B | 1 | "name": "@juanity/integrations", |
| package-lock.json:8473 | B | 1 | "name": "@juanity/storage", |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:5 | F | 1 | Juanity Law is a **document knowledge system**. |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:42 | F | 1 | - computes retention/review dates from Juanity policy; |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:79 | F | 1 | Juanity Governance defines record types as versioned configuration. |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:103 | F | 1 | Retention rule: Juanity policy |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:114 | F | 1 | Retention rule: Juanity policy |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:118 | F | 1 | The examples are policy examples, not hard-coded application values. Juanity Governance owns the definitions. |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:126 | F | 1 | How long the record/file must be retained according to the approved Juanity policy. |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:199 | F | 1 | Production object storage is intended to be separate from the Juanity application VM and independently recoverable. |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:207 | F | 1 | - Juanity server authorisation before object access; |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:211 | F | 1 | - object-store lifecycle rules may assist but do not replace Juanity policy; |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:238 | F | 1 | - other Juanity-defined employment records. |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:306 | F | 1 | Email is the primary human-facing login identifier from the start, while a stable internal Account ID remains the Juanity identity key. |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:312 | F | 1 | - Juanity Governance capabilities; |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:317 | F | 1 | ## Juanity Governance |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:321 | F | 1 | Juanity-only policy control lives under **Governance** (\`/governance\` initially). |
| docs/DOCUMENT-KNOWLEDGE-ENGINE-V1.md:334 | F | 1 | Company owners manage their own team/access in the company workspace, not in Juanity Governance. |
| docs/SECURITY-FOUNDATION.md:5 | F | 1 | Juanity Law will handle sensitive personal, employment and legal information. Security and privacy must therefore be structural rather than added after feature development. |
| docs/SECURITY-FOUNDATION.md:11 | F | 1 | Juanity Law must be designed to support a **POPIA-aware operating model**, but application architecture is not a substitute for formal legal/compliance review before production use. |
| docs/SECURITY-FOUNDATION.md:96 | F | 1 | - other Juanity-approved roles. |
| docs/SECURITY-FOUNDATION.md:147 | F | 1 | Juanity Platform Admin may configure business policy such as record definitions, categories, allowed functional roles, acknowledgement behaviour, notifications and approved retention-policy references. |
| docs/SECURITY-FOUNDATION.md:160 | F | 1 | Company-level administrators may only configure options Juanity explicitly exposes within safe bounds. |
| docs/SECURITY-FOUNDATION.md:262 | F | 1 | - assigned roles are validated against Juanity-approved roles; |
| apps/web/app/company/people/alex/grant-legal-access/page.tsx:1 | B | 1 | import { syntheticDefinitions } from "@juanity/domain"; |
| docs/NUC-DEV-DEPLOYMENT.md:11 | F | 1 | - Compose: \`infrastructure/docker/compose.nuc.yml\`, project \`juanity-dev\`. |
| docs/NUC-DEV-DEPLOYMENT.md:12 | F | 1 | - \`juanity-app\`: pinned official Node 22 Bookworm image (including OpenSSL) with the checkout mounted, running |
| docs/NUC-DEV-DEPLOYMENT.md:14 | F | 2 | - \`juanity-db\`: pinned PostgreSQL 17 image, database \`juanity_law\`. |
| docs/NUC-DEV-DEPLOYMENT.md:15 | F | 1 | - Web publishes only \`127.0.0.1:2020:3000\` and joins \`caddy-net\` as \`juanity-app\`. |
| docs/NUC-DEV-DEPLOYMENT.md:16 | F | 1 | - PostgreSQL joins only the internal \`juanity-dev\` network, with no host port. |
| docs/NUC-DEV-DEPLOYMENT.md:17 | F | 2 | - Caddy proxies to \`juanity-app:3000\` through a separate \`juanity.caddy\` include. |
| docs/NUC-DEV-DEPLOYMENT.md:22 | F | 1 | Juanity instance; production role separation is outside this deployment. |
| docs/NUC-DEV-DEPLOYMENT.md:28 | F | 1 | caches are under \`/srv/nuc-archive/juanity\`, with separate subdirectories. |
| docs/NUC-DEV-DEPLOYMENT.md:32 | F | 1 | Juanity startup. Use \`infrastructure/docker/nuc-compose.sh\` for all operations; |
| docs/NUC-DEV-DEPLOYMENT.md:55 | F | 1 | For preparation/validation only, set \`JUANITY_WEB_MEMORY=2g\`, |
| docs/NUC-DEV-DEPLOYMENT.md:56 | F | 1 | \`JUANITY_WEB_CPUS=0.5\`, and override |
| docs/NUC-DEV-DEPLOYMENT.md:103 | F | 1 | - Added \`/home/philip/Projects/crewfinder-app/caddy-conf.d/juanity.caddy\`. |
| docs/NUC-DEV-DEPLOYMENT.md:106 | F | 1 | \`/srv/nuc-archive/juanity/backups/caddy-20260905T114030Z\`. |
| docs/UI-DESIGN-SYSTEM.md:5 | F | 1 | Juanity Law should feel calm, clear, private and trustworthy. The UI is information-first, not decorative, and should help people and company users understand status and next actions quickly. |
| docs/UI-DESIGN-SYSTEM.md:9 | F | 1 | This document defines a **Juanity Law design direction**, not a code copy. |
| docs/UI-DESIGN-SYSTEM.md:13 | F | 1 | Juanity Law has two primary working surfaces: |
| docs/UI-DESIGN-SYSTEM.md:20 | F | 1 | A third restricted surface is **Juanity Platform Admin**, used to define approved record/workflow configuration and product policy. It is not a normal company admin screen. |
| docs/UI-DESIGN-SYSTEM.md:103 | F | 1 | Juanity Law uses a formal routine-work UX target: |
| docs/UI-DESIGN-SYSTEM.md:152 | F | 1 | Juanity Law |
| docs/UI-DESIGN-SYSTEM.md:167 | F | 1 | Juanity Law — [Company] |
| docs/UI-DESIGN-SYSTEM.md:339 | F | 1 | When a user chooses a Juanity-approved record/request definition, the UI should inherit approved defaults such as: |
| docs/UI-DESIGN-SYSTEM.md:350 | F | 1 | Do not ask routine users to repeatedly choose security/policy fields that Juanity already defined. |
| docs/UI-DESIGN-SYSTEM.md:354 | F | 1 | ## Juanity Platform Admin UI |
| apps/web/app/company/people/alex/add-record/page.tsx:1 | B | 1 | import { syntheticDefinitions, syntheticOwnerActor } from "@juanity/domain"; |
| apps/web/app/company/people/alex/add-record/page.tsx:17 | A | 1 | description="Daily users choose the approved record type and file. Juanity Governance supplies the security, visibility, retention and review defaults." |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:5 | F | 1 | Juanity Law V1 remains focused on the Document Knowledge System. Two later capabilities are now known requirements and must be accommodated without becoming current build dependencies: |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:16 | F | 1 | Juanity must use a stable internal account identifier: |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:38 | F | 1 | - one human using several login methods without creating several Juanity accounts; |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:40 | F | 1 | - provider changes without changing the Juanity Person record; |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:41 | F | 1 | - one Juanity identity across Person, Company Member, Legal Access and future Learning contexts. |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:54 | F | 1 | Juanity Account / Person |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:57 | F | 1 | Juanity domain services consume a resolved authenticated account/actor. They do not care which provider authenticated the session. |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:63 | F | 1 | Linking an additional provider to an existing Juanity account should require an authenticated account session and appropriate re-authentication/verification. |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:71 | F | 1 | After authentication, Juanity resolves the accepted invitation to the stable internal account. The user may have authenticated with email or a linked social provider, provided the invitation verification rules are satisfied. |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:75 | F | 1 | Moodle is a future **learning delivery engine**, not the identity, company or document authority for Juanity Law. |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:80 | F | 1 | JUANITY LAW |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:91 | F | 1 | Juanity remains authoritative for: |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:99 | F | 1 | - the Juanity Info Center and Document Knowledge System. |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:119 | F | 1 | Juanity sends user into LMS through SSO |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:125 | F | 1 | Juanity Info Center / employee profile updates |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:134 | F | 2 | Juanity should be capable of representing a learning result as knowledge associated with a Person, Company or PersonCompanyRelationship without making Moodle tables part of the Juanity core schema. |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:152 | F | 1 | If Moodle produces a certificate PDF, Juanity may later ingest or reference it through the normal Record/RecordFile engine according to an approved Record Definition. The LMS integration must not create a second uncontrolled document store inside the core application. |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:172 | F | 1 | Do not copy the entire Moodle dataset into Juanity. |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:174 | F | 1 | Only synchronise information required for Juanity workflows, such as: |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:187 | F | 1 | All external systems must be mapped through explicit integration identifiers rather than replacing Juanity primary keys. |
| docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md:205 | F | 1 | - keeping company membership and permissions in Juanity, not in the identity provider; |
| apps/web/app/company/people/alex/page.tsx:11 | B | 1 | } from "@juanity/domain"; |
| apps/web/app/company/people/alex/page.tsx:54 | A | 1 | <p className="muted">The employee&apos;s independent Juanity account remains separate from this company relationship.</p> |
| docs/STACK-DESIGN.md:26 | F | 1 | \| Future learning \| Moodle or another approved LMS behind SSO/API integration boundary \| Keep learning delivery separate from Juanity core identity/documents \| |
| docs/STACK-DESIGN.md:86 | F | 1 | Production document storage should be a **separate failure domain from the Juanity application VM**: |
| docs/STACK-DESIGN.md:89 | F | 1 | Juanity application runtime |
| docs/STACK-DESIGN.md:105 | F | 1 | Juanity Law ── SSO/API ──> Moodle |
| docs/STACK-DESIGN.md:144 | F | 1 | PostgreSQL should represent stable Juanity identities independently from login provider details: |
| docs/STACK-DESIGN.md:164 | F | 1 | \`Account.id\` / \`Person.id\` are stable Juanity identifiers. Email and external-provider identifiers are attributes/links, not replacement primary keys. |
| docs/STACK-DESIGN.md:168 | F | 1 | Future Moodle/user/course identifiers are integration references and must not replace Juanity primary keys. |
| docs/STACK-DESIGN.md:176 | F | 1 | The identity provider authenticates the account; Juanity Law determines company membership, relationship context, Governance capabilities, legal access and product permissions. |
| docs/STACK-DESIGN.md:222 | F | 1 | - provider lifecycle rules do not replace Juanity retention/review policy; |
| docs/STACK-DESIGN.md:247 | F | 1 | Juanity training assignment / relationship context |
| docs/STACK-DESIGN.md:255 | F | 1 | Juanity learning projection / optional Record artefact |
| docs/STACK-DESIGN.md:258 | F | 1 | Juanity remains authoritative for identity, company/relationship context and access. Moodle remains authoritative for course content, activities, progress, assessments and LMS-generated completion/certification results. |
| docs/STACK-DESIGN.md:260 | F | 2 | Do not copy the whole Moodle data model into Juanity. Synchronise only approved summary/result data needed by Juanity workflows. |
| docs/STACK-DESIGN.md:262 | F | 1 | A Moodle certificate PDF, when imported into Juanity, uses the normal Record/RecordFile engine and the same private object-storage path rather than a separate LMS-specific document store. |
| docs/STACK-DESIGN.md:328 | F | 1 | Moodle may later justify its own runtime/container resources rather than being forced into the initial Juanity web/database footprint. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:5 | F | 1 | Juanity Law carries sensitive employment and legal information. Identity and privileged access are therefore part of the product foundation, not a later add-on. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:9 | F | 1 | Juanity Law uses **email address as the primary human-facing login and contact identifier** from the start. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:40 | F | 1 | - one human keeps one Juanity account even when they belong to multiple companies, hold multiple roles or later use more than one login provider. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:48 | F | 1 | Juanity is expected to add social/federated login later, potentially including providers such as Google, Microsoft, Apple or other approved providers. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:57 | F | 1 | Stable Juanity Account |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:62 | F | 2 | Provider identities attach to an existing Juanity account. They do not replace the Juanity \`Account\` or \`Person\` primary key. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:64 | F | 1 | Do **not** silently merge two Juanity accounts merely because two identity providers report the same email address. Linking an additional provider to an existing account should require an authenticated session and appropriate verification/re-authentication. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:76 | F | 1 | - Juanity Governance users: MFA required; |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:78 | F | 1 | - HR, Payroll and Legal users: MFA policy should default to required unless Juanity explicitly approves another policy; |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:83 | F | 1 | A social/federated provider session does not automatically waive Juanity's MFA/step-up policy for privileged operations. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:87 | F | 1 | Juanity Law does not expose a generic \`/admin\` product surface. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:89 | F | 1 | The Juanity-only privileged control surface is named **Governance**. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:102 | F | 1 | - Juanity-only Governance membership; |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:114 | F | 1 | Juanity Governance and Company Owner management are different scopes. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:116 | F | 1 | ### Juanity Governance |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:136 | F | 1 | - assign/revoke Juanity-approved company functional roles; |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:142 | F | 1 | Company Owner is not Juanity Governance and does not receive platform-wide access. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:148 | F | 1 | Juanity Governance should support specific capabilities that may be grouped into roles. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:174 | F | 1 | One Juanity staff member may hold several Governance roles in a small operation. Larger operations may separate them. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:193 | F | 1 | The same Juanity account may have several independent contexts: |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:222 | F | 1 | After authentication, the invitation resolves to the stable Juanity account. The user may have authenticated with email or a safely linked federated identity, provided the invitation verification rules are satisfied. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:240 | F | 1 | Juanity is expected to add company onboarding, training and certification through Moodle or another approved LMS later. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:242 | F | 2 | Juanity should remain the identity/company/relationship authority. The LMS should consume SSO/federated identity rather than owning a second unrelated Juanity password/account. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:244 | F | 2 | A future learning integration must map the stable Juanity account to an external LMS user ID through an explicit integration link. Moodle user IDs must never replace Juanity Account or Person IDs. |
| docs/AUTHENTICATION-AND-GOVERNANCE.md:252 | F | 1 | - \`Governance\` — Juanity platform policy/security control; |
| docs/DEVELOPMENT-GUARDRAILS.md:116 | F | 1 | No Juanity Law service should require the existing NUC to run, build, test or deploy. |
| apps/web/app/company/team/invite/page.tsx:1 | B | 1 | import { syntheticRoleDefinitions } from "@juanity/domain"; |
| docs/BUILD-PLAN.md:5 | F | 1 | Build as much of Juanity Law as possible directly from the GitHub repository before provisioning a dedicated Law VM, **without weakening production-critical boundaries**. |
| docs/BUILD-PLAN.md:65 | F | 1 | Invitation accepted into stable Juanity account |
| docs/BUILD-PLAN.md:210 | F | 1 | Later configure approved Google/Microsoft/Apple-style providers through the identity-provider/broker boundary, with safe account linking to stable Juanity Accounts and no email-only auto-merge. |
| docs/BUILD-PLAN.md:214 | F | 2 | Later add Moodle or another approved LMS behind SSO/API boundaries. Juanity remains authoritative for identity/company/relationship/access; Moodle owns courses/progress/assessment. Certificates imported into Juanity use the normal Record/RecordFile storage path. |
| docs/BUILD-PLAN.md:247 | F | 1 | **Use the NUC as a temporary accelerator only if it has headroom; build Juanity so moving to the dedicated Law VM is deployment, not redesign.** |
| apps/web/app/company/page.tsx:1 | B | 1 | import { syntheticCompany, syntheticMembers, syntheticPerson, syntheticRelationship, syntheticRoleGrants } from "@juanity/domain"; |
| docs/DISASTER-RECOVERY.md:5 | F | 1 | This plan defines how Juanity Law should recover from infrastructure failure, data corruption, accidental deletion, compromised deployment, storage loss or loss of the primary host. |
| docs/DISASTER-RECOVERY.md:7 | F | 1 | Juanity Law is expected to carry sensitive personal, employment and legal information. Recovery must therefore restore **confidentiality, integrity and access control**, not merely make containers start again. |
| docs/DISASTER-RECOVERY.md:309 | F | 1 | The existing NUC must not be treated as either the primary Law runtime or the only backup destination. Juanity Law recovery must remain independent of that machine. |
| docs/APPLICATION-FRAMEWORK.md:11 | F | 1 | Juanity Law is built around three foundational concepts: |
| docs/APPLICATION-FRAMEWORK.md:24 | F | 1 | Juanity Platform Admin |
| docs/APPLICATION-FRAMEWORK.md:90 | F | 1 | - other Juanity-approved roles later. |
| docs/APPLICATION-FRAMEWORK.md:137 | F | 1 | Juanity Platform Admin owns approved business-policy definitions. |
| docs/APPLICATION-FRAMEWORK.md:228 | F | 1 | ### Juanity Platform Admin |
| docs/APPLICATION-FRAMEWORK.md:249 | F | 1 | - company-level settings within Juanity-approved bounds; |
| docs/PROJECT-CHARTER.md:5 | F | 1 | Juanity Law is a secure paid portal for companies and people to manage employment/legal information through an **Info Center** experience. |
| docs/PROJECT-CHARTER.md:52 | F | 1 | ## Juanity configuration principle |
| docs/PROJECT-CHARTER.md:54 | F | 1 | Juanity Law follows the owner's **no-hardcoding** principle for business policy where practical. |
| docs/PROJECT-CHARTER.md:56 | F | 1 | Juanity Platform Admin should be able to define approved record/request/workflow definitions such as: |
| docs/PROJECT-CHARTER.md:71 | F | 1 | Definitions must be versioned. Historic record behaviour must not silently change when Juanity edits a definition. |
| docs/PROJECT-CHARTER.md:92 | F | 1 | - other Juanity-approved roles later. |
| docs/PROJECT-CHARTER.md:131 | F | 1 | - Juanity Platform Administration |
| docs/PROJECT-CHARTER.md:179 | F | 1 | ### Juanity Platform Admin |
| docs/PROJECT-CHARTER.md:181 | F | 1 | Juanity's own control plane should manage approved system/business configuration such as: |
| docs/PROJECT-CHARTER.md:214 | F | 1 | Juanity Platform Admin |
| docs/PROJECT-CHARTER.md:285 | F | 1 | - Juanity Platform Admin and company-admin separation; |
| docs/PROJECT-CHARTER.md:293 | F | 1 | **Juanity defines approved rules once; companies perform simple, role-authorised actions; people receive clear information/actions. Keep business policy configurable, keep security invariants enforced, and do not let configurability or convenience weaken privacy, tenancy, offboarding or audit.** |
| apps/web/app/person/page.tsx:10 | B | 1 | } from "@juanity/domain"; |
| apps/web/app/person/page.tsx:29 | A | 1 | description="Your employment relationships, records and actions stay attached to your Juanity account even when a company relationship later ends." |
| apps/web/app/person/page.tsx:47 | A | 1 | {reviewDue.length > 0 ? <RecordList records={reviewDue} /> : <p className="muted">Juanity will surface configured renewal/review dates here without deleting the historical record.</p>} |
| apps/web/app/person/page.tsx:62 | A | 1 | <h2>Independent Juanity identity</h2> |
| apps/web/app/person/page.tsx:63 | A | 1 | <p className="muted">Your Juanity account is separate from the employer relationship and is designed to survive job changes and future linked login providers.</p> |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:5 | F | 1 | Juanity Law should not hard-code every employment/legal record type or every company staffing pattern into application code. |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:9 | F | 1 | 1. **Juanity Platform Admin** defines approved record/workflow definitions and safe system policy. |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:15 | F | 1 | Juanity configures the rules once |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:24 | F | 1 | ## 1. Juanity Platform Admin |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:26 | F | 1 | Juanity administrators may define or maintain approved configuration such as: |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:99 | F | 1 | Juanity changes access/default workflow |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:114 | F | 1 | Possible Juanity configuration: |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:134 | F | 1 | Possible Juanity configuration: |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:178 | F | 1 | └── other Juanity-approved roles |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:215 | F | 1 | - assign or revoke Juanity-approved functional roles; |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:218 | F | 1 | - configure company-level settings that Juanity permits companies to control. |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:277 | F | 1 | ## 9. Juanity Admin vs Company Admin |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:279 | F | 1 | ### Juanity Platform Admin controls |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:293 | F | 1 | - their own company settings within Juanity-approved bounds; |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:297 | F | 2 | A company must not be able to create a custom role or configuration that bypasses Juanity's system invariants unless Juanity explicitly designs and approves such extensibility later. |
| docs/CONFIGURABLE-RECORDS-AND-COMPANY-ROLES.md:301 | F | 1 | Juanity Law adopts the following UX rule: |
| apps/web/app/page.tsx:11 | A | 1 | description="This synthetic development shell proves the Juanity Person ↔ Company ↔ Relationship model, configurable record policy, scoped legal access and Governance separation before real identity and object storage are connected." |
| apps/web/app/page.tsx:37 | A | 1 | <p className="eyebrow">Juanity only</p> |
| docs/SKILLS.md:5 | F | 1 | This document defines the practical capability areas that implementation agents should use when working on Juanity Law. It is not a dependency list; it is a work-routing guide. |
| docs/SKILLS.md:194 | F | 1 | Constraint: do not deploy Juanity Law runtime services to the existing NUC. |
| docs/DECISION-LOG.md:5 | H | 1 | ## ADR-001 — Build Juanity Law as a new application |
| docs/DECISION-LOG.md:9 | H | 2 | Juanity Law is built from scratch. Previous products may be used as design learning, but Juanity must not depend on their runtime, schema, identity, billing or package model. |
| docs/DECISION-LOG.md:45 | H | 1 | Original intent: Juanity must not become dependent on the already resource-constrained NUC for production runtime, persistence or disaster recovery. ADR-030 now permits a resource-gated **temporary development/integration runtime** on the NUC while preserving that production/dependency constraint. |
| docs/DECISION-LOG.md:117 | H | 1 | ## ADR-019 — Juanity configures record/workflow policy instead of hard-coding record types |
| docs/DECISION-LOG.md:141 | H | 1 | ## ADR-023 — Juanity Law is a document knowledge system and V1 is approved |
| docs/DECISION-LOG.md:159 | H | 1 | Juanity is a document knowledge system, not a generic file manager, HR suite or case-management platform. |
| docs/DECISION-LOG.md:167 | H | 1 | ## ADR-025 — Juanity privileged control surface is Governance, not \`/admin\` |
| docs/DECISION-LOG.md:171 | H | 1 | Juanity-only privileged control is **Governance**, initially \`/governance\`. Route naming is not a security control; verified identity, capability checks, MFA, server authorisation and audit are. |
| docs/DECISION-LOG.md:179 | H | 1 | ## ADR-027 — Social/federated login attaches external identities to a stable Juanity account |
| docs/DECISION-LOG.md:183 | H | 1 | Use an \`AccountIdentity\`-style boundary so Google/Microsoft/Apple-style identities can later link to one stable Juanity Account. Never auto-merge accounts solely because provider emails match. |
| docs/DECISION-LOG.md:189 | H | 2 | Juanity remains authoritative for identity/company/relationship/access. Moodle owns courses, activities, progress, assessments and LMS-generated certification. Certificates imported into Juanity use the normal Record/RecordFile engine. |
| docs/DECISION-LOG.md:197 | H | 1 | Production rules: no public buckets/permanent public URLs; opaque keys; Juanity authorisation before object access; quarantine/validation/malware scan/checksum before acceptance; independent backup/replication; PostgreSQL remains authoritative for access and retention policy. |
| docs/DECISION-LOG.md:205 | H | 1 | The existing NUC may host Juanity **temporarily for development/integration** if disk, RAM, CPU and current workload headroom are acceptable. |
| docs/DECISION-LOG.md:218 | H | 1 | - the NUC is not the Juanity production host; |
| docs/DECISION-LOG.md:221 | H | 1 | - Juanity must remain reproducible from Git/configuration and portable to the dedicated Law VM; |
| docs/DECISION-LOG.md:232 | H | 1 | unchanged approved Prisma schema, apply it to the new Juanity database and verify |
| docs/DECISION-LOG.md:237 | H | 1 | Only web joins the existing Caddy network; the database is private to Juanity. |
| docs/DECISION-LOG.md:238 | H | 1 | Keep host binding \`127.0.0.1:2020\`; Caddy uses \`juanity-app:3000\`. Add a scoped |
| apps/web/app/legal-access/page.tsx:9 | B | 1 | } from "@juanity/domain"; |
| docs/CODE-BEFORE-VM.md:5 | F | 1 | Build as much of Juanity Law as possible from the GitHub repository before a dedicated Law VM is required, while preserving production-grade boundaries. |
| docs/CODE-BEFORE-VM.md:11 | F | 1 | The following can be built and validated without any persistent Juanity runtime host: |
| docs/CODE-BEFORE-VM.md:72 | F | 1 | Before adding Juanity services to the NUC, inspect at minimum: |
| docs/CODE-BEFORE-VM.md:81 | F | 1 | If Juanity materially destabilises existing workloads, stop the NUC runtime experiment and continue repository-first until the dedicated Law VM is available. |
| docs/CODE-BEFORE-VM.md:87 | F | 1 | - it is **not** the Juanity production host; |
| docs/CODE-BEFORE-VM.md:158 | F | 1 | **Use the NUC if it helps us move faster, but never let Juanity become dependent on it.** |
| apps/web/next.config.ts:4 | B | 3 | transpilePackages: ["@juanity/domain", "@juanity/identity", "@juanity/storage"], |
| docs/STORAGE-ARCHITECTURE.md:5 | F | 1 | Juanity Law separates **document knowledge** from **document binaries**. |
| docs/STORAGE-ARCHITECTURE.md:47 | F | 1 | This keeps Juanity free to change physical storage provider/location later without redesigning the record engine. |
| docs/STORAGE-ARCHITECTURE.md:69 | F | 1 | Juanity authorisation happens before object access: |
| docs/STORAGE-ARCHITECTURE.md:74 | F | 1 | Juanity resolves actor and context |
| docs/STORAGE-ARCHITECTURE.md:87 | F | 1 | A storage object key, bucket path or signed URL possession is never a substitute for Juanity authorisation. |
| docs/STORAGE-ARCHITECTURE.md:152 | F | 1 | Record becomes available according to Juanity permissions |
| docs/STORAGE-ARCHITECTURE.md:175 | F | 1 | Juanity Governance defines retention and review/renewal policy through versioned record definitions/policies. |
| docs/STORAGE-ARCHITECTURE.md:187 | F | 1 | A provider lifecycle rule must never delete an object earlier than Juanity policy permits. |
| docs/STORAGE-ARCHITECTURE.md:273 | F | 1 | **Juanity stores knowledge and permissions in PostgreSQL; document binaries live in private, independently recoverable S3-compatible object storage behind a provider-neutral adapter.** |
| packages/identity/package.json:2 | B | 1 | "name": "@juanity/identity", |
| apps/web/lib/dev-security.ts:1 | B | 1 | import { requireCapability, requireMfa, requireVerifiedPrincipal, type AuthenticatedPrincipal } from "@juanity/identity"; |
| apps/web/lib/dev-security.ts:10 | C | 1 | const enabled = process.env.JUANITY_DEV_IDENTITY_ENABLED === "true"; |
| packages/identity/src/index.ts:34 | B | 1 | if (existing && existing.accountId !== accountId) throw new Error("Provider identity is already linked to another Juanity account"); |
| packages/identity/src/index.ts:46 | B | 1 | throw new Error("Juanity does not merge or resolve accounts solely from matching provider email"); |
| packages/integrations/package.json:2 | B | 1 | "name": "@juanity/integrations", |
| packages/storage/package.json:2 | B | 1 | "name": "@juanity/storage", |
| packages/database/package.json:2 | B | 1 | "name": "@juanity/database", |
| packages/database/src/client.ts:7 | B | 1 | if (!connectionString) throw new Error("DATABASE_URL is required to create the Juanity Prisma client"); |
| packages/database/verify-nuc.ts:5 | C | 1 | if (process.env.JUANITY_ENV !== "development") { |
| packages/application/package.json:2 | B | 1 | "name": "@juanity/application", |
| packages/application/package.json:14 | B | 1 | "@juanity/domain": "*", |
| packages/application/package.json:15 | B | 1 | "@juanity/storage": "*" |
| packages/application/src/index.ts:8 | B | 1 | } from "@juanity/domain"; |
| packages/application/src/index.ts:9 | B | 1 | import { canCompanyMemberViewRecord, deriveRecordDates, validateRecordContext } from "@juanity/domain"; |
| packages/application/src/index.ts:10 | B | 1 | import { createRecordObjectKey, type StorageProvider } from "@juanity/storage"; |
| packages/application/src/record-intake.test.ts:9 | G | 1 | } from "@juanity/domain"; |
| packages/application/src/record-intake.test.ts:10 | G | 1 | import { InMemoryStorageProvider } from "@juanity/storage"; |
| packages/domain/package.json:2 | B | 1 | "name": "@juanity/domain", |

## Post-rename source scan

Excluding this historical before/after audit itself, the remaining occurrences
are 42 historical record/context references and 43 legacy infrastructure
references. Every remaining match was checked against those categories. No old
product name remains in application/package source or current product prose.
The ignored deployment environment keys are changed only at final deployment.

Phase A validation passed before Phase B began: Prisma validation/generation,
12 tests, production build, all-workspace typecheck and lint. The renamed
identity flag also passed production-denial, disabled-denial and enabled-dev
checks. Prisma schema/migration files and dependency versions are unchanged.
