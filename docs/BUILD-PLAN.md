# Build Plan

## Build philosophy

Build as much of Juanity Law as possible before provisioning the dedicated runtime VM, **but do not fake production-critical boundaries in a way that creates later rewrites**.

The Document Knowledge Engine V1 architecture is approved. Moodle and social/federated login are known future requirements, but they are **integration targets, not V1 runtime dependencies**.

## Phase 0 — Repository and design controls

Status: **complete enough to build**

Established:

- Person ↔ Company ↔ Relationship product frame;
- Document Knowledge Engine V1;
- configurable/versioned record definitions;
- company membership and multi-role access;
- external Legal Access grants;
- email-first identity and Governance model;
- stable internal Account identity direction;
- 3-click / 10-second routine-action UX rule;
- stack design;
- Info Center UI direction;
- security/privacy invariants;
- disaster recovery plan;
- prompt capture and decision log;
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

Important: do not make email the database primary key and do not make domain code assume password-only authentication.

Social-provider credentials/buttons are deferred. The V1 requirement is only that the identity model can support linked providers later without changing Person/Company relationships.

## Phase 2 — Company membership and access

Implement:

```text
Create company
  ↓
Create company Owner member
  ↓
Owner assigns required functional roles to self
  ↓
Owner invites staff by email
  ↓
Assign one or more approved roles
  ↓
Invitation accepted into stable Juanity account
  ↓
Role-limited company workspace projected
  ↓
Role/membership events audited
```

Build:

- CompanyMember;
- many-to-many functional role grants;
- Owner governance capability;
- HR / Payroll / Clerk / Legal / Manager / Billing working role concepts;
- role grant/revocation;
- membership disable/removal;
- active access re-evaluation hooks;
- Team & Access UI;
- negative access tests.

Exit gate: one-person and multi-person companies both work without special-case architecture.

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
- relationship offboarding without deleting the Person account;
- requests/actions foundation where useful.

Exit gate: Person ↔ Company relationships and profile projections work with synthetic data and server-side isolation.

## Phase 4 — Governance and configurable knowledge policy

Implement restricted `/governance` surface and domain:

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
- Governance capability checks;
- definition-policy audit.

Synthetic definitions such as Payslip, Proof of Address and BEE Certificate may be seeded for demonstration, but their behaviour must come from configuration rather than hard-coded engine branches.

## Phase 5 — Document Knowledge Engine V1

Implement the approved V1 model:

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

Build:

- Record metadata model;
- RecordFile metadata model;
- immutable definition-version binding;
- context constraints;
- storage adapter interface;
- upload-processing/scan interface;
- checksum metadata;
- derived `retain_until`;
- derived `review_due_at`;
- replacement/supersession link;
- Person profile record projection;
- Company employee-profile record projection;
- contextual `Add record` flow;
- Needs Action/review-due projection;
- audit events for create/view/download where approved.

Target common flow:

```text
Employee profile
  ↓
Add record
  ↓
Choose definition + file
  ↓
Save
  ↓
Person profile updates
  ↓
Authorised company roles can view
```

Keep this within the 3-click / 10-second routine-action target where file selection/upload time is excluded.

## Phase 6 — External Legal Access

Implement:

- LegalAccessGrant;
- grantor / represented party;
- PersonCompanyRelationship scope;
- record/category/definition scope;
- view/download capability;
- start/expiry/revocation;
- restricted Legal Access view;
- audit;
- negative tests proving the grant cannot escape its relationship/scope/expiry.

Legal professionals do not become company members solely to view granted records.

## Phase 7 — Privacy and permission proof

Before production-style infrastructure integration, validate with synthetic data:

- Company A cannot access Company B data;
- Person A cannot access Person B records;
- company membership alone does not expose every record;
- Owner without HR/Payroll/Legal does not inherit those record permissions;
- multi-role member receives only intended combined access;
- role revocation removes access;
- removed/disabled company member loses access;
- definition version changes do not rewrite historic record policy;
- legal grants remain scoped and revocable;
- normal/company users cannot access Governance;
- sensitive values are not unnecessarily logged;
- relationship offboarding preserves Person account and history appropriately.

## Phase 8 — Dedicated Law development VM

Provision once the code foundation is coherent and real integrations become useful.

Add:

- PostgreSQL persistence;
- real OIDC/email login/account recovery/MFA;
- HTTPS/domain via Caddy;
- persistent S3-compatible object storage;
- upload quarantine/validation/malware scanning;
- Redis/BullMQ if asynchronous jobs are needed;
- SMTP integration;
- payment sandbox/webhook ingress;
- automated backups;
- restore testing;
- external Legal Access invitation testing;
- security/access logging.

The existing NUC is not the runtime target.

## Phase 9 — Social / federated login

Later, when V1 identity is stable:

- configure approved providers through the identity-provider/broker boundary;
- add provider login options such as Google/Microsoft/Apple where approved;
- link provider identities to stable Juanity Accounts;
- implement secure account-link/unlink flows;
- never auto-merge accounts solely from matching email addresses;
- test invitation acceptance through linked-provider login;
- apply the same MFA/step-up and Governance/company permissions after authentication.

This phase should not require changing Person, CompanyMember, Relationship or Record ownership/context keys.

## Phase 10 — Moodle / company training and onboarding

Later, add Moodle or another approved LMS behind a learning integration boundary.

Target capabilities:

- SSO from Juanity to LMS;
- company assigns onboarding/training to an employee relationship;
- course enrolment/assignment mapping;
- progress/completion summary where required;
- certification/result synchronisation;
- Info Center `Training` / Needs Action projections;
- certificate PDF ingestion into the normal Record engine where applicable;
- training validity/review date where appropriate;
- audit/integration references.

Authority split:

- Juanity: identity, company, relationship, permissions, entitlements, Info Center;
- Moodle/LMS: courses, activities, assessment, progress and LMS-generated completion/certification.

Do not copy the whole Moodle data model into Juanity.

See `docs/FUTURE-LEARNING-AND-FEDERATED-IDENTITY.md`.

## Phase 11 — Commercial, POPIA and security hardening

Before production:

- payment production configuration;
- final MFA/step-up policy;
- session/security review;
- company/tenant and relationship isolation tests;
- privilege-escalation/IDOR review;
- upload/download abuse tests;
- rate limiting;
- backup/restore rehearsal;
- disaster recovery drill;
- incident/breach-response runbook;
- monitoring/logging baseline;
- approved data classification/retention/destruction policy;
- privacy notice and processing-role review;
- operator/sub-processor arrangements where applicable;
- data-subject/access/correction workflow review where applicable;
- production secrets management;
- dependency vulnerability review;
- formal legal/compliance review before regulated production data.

## Build sequence rule

Prefer vertical slices over building every table first.

A feature is complete only when its:

- domain rule;
- configurable policy where applicable;
- permission/privacy rule;
- persistence/adapter contract;
- UI projection;
- activity/audit consequence;
- focused positive and negative tests

are understood together.

## Future-readiness rule

Do not overbuild future features. Prepare them by choosing stable boundaries now:

```text
stable Account ID
+ provider-linked identities
+ integration adapters
+ Person/Company/Relationship context
+ normal Record engine
```

This is sufficient preparation for both social login and Moodle without adding their runtime complexity to V1.

## 3-click / 10-second validation

For high-frequency routine workflows, check:

- can the user start from the relevant context?
- is the routine action within three deliberate clicks/taps?
- are defaults supplied by Governance configuration?
- is the flow clear on desktop/tablet/mobile?
- have required security/legal steps been preserved?

This is a usability target, not a reason to remove safeguards.

## Validation economy

Use the smallest validation set that provides confidence for the change. Repository-wide exhaustive checks are reserved for releases, migrations, dependency changes and broad refactors.
