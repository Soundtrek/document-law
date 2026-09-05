# Build Plan

## Build philosophy

Build as much of SAMMA as possible directly from the GitHub repository before provisioning a dedicated Law VM, **without weakening production-critical boundaries**.

The Document Knowledge Engine V1 architecture is approved. Moodle and social/federated login are known future requirements, but they remain integration targets rather than V1 runtime dependencies.

## Phase 0 — Repository and design controls

Status: **complete enough to build**

Established:

- Person ↔ Company ↔ Relationship product frame;
- Document Knowledge Engine V1;
- configurable/versioned record definitions;
- company membership and multi-role access;
- external Legal Access grants;
- email-first identity with stable internal Account IDs;
- Governance (`/governance`) privileged surface;
- private S3-compatible production storage direction;
- 3-click / 10-second routine-action UX rule;
- Info Center UI direction;
- security/privacy invariants;
- disaster recovery plan;
- future Moodle/social-login integration boundaries.

## Phase 1 — Application and identity skeleton

Build:

- workspace/monorepo structure;
- Next.js application shell;
- strict TypeScript/lint/test configuration;
- environment validation;
- UI tokens and shell components;
- CI for typecheck/lint/focused tests;
- stable `Account` model with internal ID;
- `AccountIdentity` provider-link model/interface;
- email as primary human-facing login/contact identifier;
- verified-email state;
- OIDC-compatible identity adapter contract;
- MFA/step-up policy hooks;
- Person, Company and Governance route shells;
- no generic `/admin` route.

Social-provider credentials/buttons are deferred. The V1 requirement is that linked providers can be added later without changing Person/Company/Record keys.

## Phase 2 — Company membership and access

Implement:

```text
Create company
  ↓
Create Owner member
  ↓
Owner assigns required functional roles to self
  ↓
Owner invites staff by email
  ↓
Assign one or more approved roles
  ↓
Invitation accepted into stable SAMMA account
  ↓
Role-limited workspace projected
  ↓
Role/membership events audited
```

Build CompanyMember, many-to-many functional roles, Owner governance capability, role revocation, membership disable/removal and Team & Access UI.

## Phase 3 — Person / Company relationship and Info Centers

Implement:

- Person;
- Company;
- PersonCompanyRelationship;
- active/former relationship lifecycle;
- Person Info Center;
- Company Info Center;
- employee/person profile in company workspace;
- relationship activity timeline;
- offboarding without deleting the Person account;
- request/action foundation where useful.

## Phase 4 — Governance and configurable knowledge policy

Implement restricted `/governance` capability surface and:

- RecordDefinition;
- immutable/versioned RecordDefinitionVersion;
- categories;
- Person / Company / Relationship context;
- direction/audience;
- classification/sensitivity;
- allowed functional roles;
- person visibility;
- retention policy representation;
- review/renewal interval representation;
- acknowledgement/Needs Action policy;
- notification policy;
- active/inactive definitions;
- definition-policy audit.

Synthetic examples may be seeded, but behaviour must come from configuration rather than hard-coded engine branches.

## Phase 5 — Document Knowledge Engine V1

Implement:

```text
RecordDefinitionVersion
      ↓
Record
      ↓
RecordFile
      ↓
Person / Company / Relationship
      ↓
Retention + review dates
      ↓
Profile projection
      ↓
Access + Activity/Audit
```

Build record/file metadata, immutable definition binding, context constraints, provider-neutral storage interface, opaque storage keys, upload-processing/scan interface, checksum metadata, retention/review derivation, replacement links, profile projections and contextual Add Record flow.

The production storage target is private S3-compatible object storage separate from the application host. Pre-VM/NUC development may use an in-memory or explicit development adapter.

## Phase 6 — External Legal Access

Implement LegalAccessGrant, represented party, relationship scope, record/category/definition scope, view/download capability, expiry/revocation, restricted Legal Access view and negative scope tests.

## Phase 7 — Privacy and permission proof

Validate with synthetic data:

- Company A cannot access Company B data;
- Person A cannot access Person B records;
- company membership alone does not expose every record;
- Owner without HR/Payroll/Legal does not inherit those permissions;
- multi-role members receive only intended combined access;
- role revocation removes access;
- removed/disabled company member loses access;
- definition changes do not rewrite historic record policy;
- legal grants remain scoped/revocable;
- normal/company users cannot access Governance;
- relationship offboarding preserves the Person account;
- unauthorised actors cannot resolve RecordFiles by changing identifiers;
- object keys reveal no sensitive person/company/document naming data.

## Phase 8 — Optional temporary NUC integration runtime

The NUC may be used as a **temporary development/integration host** if a resource check shows enough disk, RAM and CPU headroom.

Start minimally:

```text
law-web
+
PostgreSQL
```

Only add when justified and resources permit:

```text
S3-compatible dev storage
Redis/BullMQ
worker
ClamAV
```

Rules:

- synthetic data only;
- no production dependency on the NUC;
- no sole backup on the NUC;
- do not treat NUC-local file storage as the production object-storage architecture;
- stop adding services if existing workloads become unstable;
- deployments remain reproducible from Git/configuration.

See `docs/CODE-BEFORE-VM.md`.

## Phase 9 — Dedicated Law development VM

Use a dedicated VM when production-like integration becomes useful or the NUC no longer provides safe headroom.

Add/validate:

- PostgreSQL persistence;
- real OIDC/email login/account recovery/MFA;
- HTTPS/domain via Caddy;
- persistent private S3-compatible storage;
- quarantine/validation/malware scanning;
- Redis/BullMQ where needed;
- SMTP integration;
- payment sandbox/webhooks;
- automated backups and restore testing;
- external Legal Access invitation testing;
- security/access logging.

The dedicated VM remains the preferred production-like development environment even if the temporary NUC runtime works well.

## Phase 10 — Social / federated login

Later configure approved Google/Microsoft/Apple-style providers through the identity-provider/broker boundary, with safe account linking to stable SAMMA Accounts and no email-only auto-merge.

## Phase 11 — Moodle / company training and onboarding

Later add Moodle or another approved LMS behind SSO/API boundaries. SAMMA remains authoritative for identity/company/relationship/access; Moodle owns courses/progress/assessment. Certificates imported into SAMMA use the normal Record/RecordFile storage path.

## Phase 12 — Commercial, POPIA and security hardening

Before production:

- payment production configuration;
- final MFA/step-up policy;
- session/security review;
- tenant/relationship/IDOR testing;
- upload/download abuse tests;
- rate limiting;
- backup/restore rehearsal;
- disaster recovery drill;
- incident/breach runbook;
- monitoring/logging baseline;
- approved retention/destruction policy;
- privacy/processing-role review;
- sub-processor arrangements where applicable;
- production secrets management;
- dependency vulnerability review;
- formal legal/compliance review before regulated production data.

## Build sequence rule

Prefer vertical slices over building every table first. A feature is complete only when domain rule, configurable policy, permissions/privacy, persistence/adapter contract, UI projection, audit consequence and focused positive/negative tests are understood together.

## 3-click / 10-second validation

For high-frequency workflows, verify the user can start from the relevant context, complete the routine path within three deliberate clicks/taps where safe, rely on Governance defaults rather than repeated policy configuration, and retain required security/legal steps.

## Guiding deployment rule

**Use the NUC as a temporary accelerator only if it has headroom; build SAMMA so moving to the dedicated Law VM is deployment, not redesign.**


## Real user and company workflow V1 — 2026-09-05

The browser workflow now supports stable verified Account/Person onboarding, company creation with normal OWNER membership, selected company workspaces, employee invitations and acceptance, distinct Team & Access membership/roles, relationship-ID profiles, and existing persistent Garage record intake/download. Info Centers query PostgreSQL and enforce definition-specific employee visibility and company roles. DEV manual invitation links explicitly send no mail; Owner can assign self HR without receiving platform Governance.

See [workflow guide](REAL-WORKFLOW-V1.md), [complete preflight](REAL-WORKFLOW-V1-PREFLIGHT.md) and [validation report](REAL-WORKFLOW-V1-REPORT.md). SMTP, scanning, MFA activation and off-host restore remain open. Earlier descriptions of demo-only workflows are historical.
