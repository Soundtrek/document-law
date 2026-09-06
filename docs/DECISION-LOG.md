# Architecture Decision Log

This file records accepted project-level decisions. Add entries when a decision materially changes architecture, security, deployment, product boundaries or workflow.

> Earlier decisions retain Juanity, the former development name. Their architecture remains applicable to SAMMA.

## ADR-001 — Build Juanity Law as a new application
**Status:** Accepted  
**Date:** 2026-09-04

Juanity Law is built from scratch. Previous products may be used as design learning, but Juanity must not depend on their runtime, schema, identity, billing or package model.

## ADR-002 — Info Center is the primary product frame
**Status:** Accepted  
**Date:** 2026-09-04

The experience is centred on an Info Center that makes status, actions, relationships, information and recent activity obvious. The app is not a generic file manager.

## ADR-003 — Matter as foundational entity
**Status:** Superseded by ADR-012  
**Original date:** 2026-09-04

A Matter may be introduced later as optional legal-work context, but it is not the v1 root domain.

## ADR-004 — Document engine design is deferred
**Status:** Superseded by ADR-023  
**Original date:** 2026-09-04

The V1 Document Knowledge Engine is now approved for implementation.

## ADR-005 — Modular monolith first
**Status:** Accepted  
**Date:** 2026-09-04

Use one primary TypeScript codebase with clean module/adapter boundaries. Extract services/workers only when operationally justified.

## ADR-006 — Proposed technical foundation
**Status:** Accepted as planning baseline  
**Date:** 2026-09-04

Baseline: Next.js + React + TypeScript, PostgreSQL + Prisma, OIDC identity, S3-compatible storage, BullMQ/Redis when needed, ClamAV for real uploads, SMTP, Caddy, Docker/Compose and payment adapters.

## ADR-007 — Existing NUC is not a permanent Law runtime target
**Status:** Refined by ADR-030  
**Original date:** 2026-09-04

Original intent: Juanity must not become dependent on the already resource-constrained NUC for production runtime, persistence or disaster recovery. ADR-030 now permits a resource-gated **temporary development/integration runtime** on the NUC while preserving that production/dependency constraint.

## ADR-008 — Build before VM where safe
**Status:** Accepted / refined by ADR-030  
**Date:** 2026-09-04

Build domain, UI, tests and adapters before production-like infrastructure. A temporary NUC runtime may now be used if resources permit; a dedicated Law VM remains the preferred production-like integration environment.

## ADR-009 — UI direction is light and information-first
**Status:** Accepted  
**Date:** 2026-09-04

Use light layered surfaces, readable widths, strong hierarchy, compact status/navigation, obvious Needs Action states and responsive behaviour. Dark mode is not an initial requirement.

## ADR-010 — Online learning is deferred from V1
**Status:** Accepted / refined by ADR-028  
**Date:** 2026-09-04

Moodle/LMS is an expected later integration, not Document Knowledge Engine V1 runtime.

## ADR-011 — Prompt/build history lives in the repository
**Status:** Accepted  
**Date:** 2026-09-04

Capture material AI-assisted prompts/interpretations in `prompts/` and authoritative decisions here.

## ADR-012 — Person ↔ Company relationship is the core product frame
**Status:** Accepted  
**Date:** 2026-09-05

```text
Person  ↔  PersonCompanyRelationship  ↔  Company
```

A Person has an independent Info Center; a Company has a workspace; the relationship is the controlled context for employment information, records and activity.

## ADR-013 — People are free; companies are the primary paying entity
**Status:** Accepted as current commercial direction  
**Date:** 2026-09-05

People retain free accounts. Companies fund the primary commercial workspace. Exact packages/prices remain configurable.

## ADR-014 — A person's account is independent of employment
**Status:** Accepted  
**Date:** 2026-09-05

Ending a company relationship changes relationship state; it does not delete or transfer the Person account.

## ADR-015 — Company relationship does not grant blanket access to personal information
**Status:** Accepted  
**Date:** 2026-09-05

Company access is explicit, server-authorised and relationship/resource scoped. Specific requests are preferred over broad personal-vault access.

## ADR-016 — Company admin is not universal sensitive-data access
**Status:** Accepted / refined by ADR-020 and ADR-021  
**Date:** 2026-09-05

Support separation of duties such as HR, Payroll, Legal, Management and Billing. Generic admin status does not bypass sensitive-resource policy.

## ADR-017 — Sensitive data classification is a framework capability
**Status:** Accepted  
**Date:** 2026-09-05

Support working classes such as Public, Internal, Personal, Sensitive and Highly Sensitive as policy inputs. They are engineering controls, not a final legal taxonomy.

## ADR-018 — POPIA/privacy must influence architecture from the start
**Status:** Accepted  
**Date:** 2026-09-05

Least privilege, data minimisation, controlled access, retention, offboarding, audit and incident investigation are structural. Technical implementation alone is not proof of legal compliance.

## ADR-019 — Juanity configures record/workflow policy instead of hard-coding record types
**Status:** Accepted  
**Date:** 2026-09-05

Governance defines versioned record/request/workflow definitions. Historic records do not silently inherit changed policy. Security invariants are not ordinary configurable switches.

## ADR-020 — Company members may hold multiple functional roles
**Status:** Accepted  
**Date:** 2026-09-05

Company membership and functional access are separate, many-to-many concepts. One-person companies may combine roles; larger companies may distribute them.

## ADR-021 — Company Owner is governance, not an automatic sensitive-data bypass
**Status:** Accepted  
**Date:** 2026-09-05

Owner manages company membership/roles/settings and may assign functional roles to self. `OWNER` alone does not imply HR/Payroll/Legal record access.

## ADR-022 — Frequent routine actions follow the 3-click / 10-second rule
**Status:** Accepted  
**Date:** 2026-09-05

Frequent routine actions should normally be reachable within three deliberate clicks/taps and about ten seconds, excluding meaningful typing, file upload, legal reading and required security steps.

## ADR-023 — Juanity Law is a document knowledge system and V1 is approved
**Status:** Accepted  
**Date:** 2026-09-05

```text
Definition/version
  ↓
Record
  ↓
File/object
  ↓
Person / Company / Relationship profile projection
  ↓
Retention + review knowledge
  ↓
Access + audit
```

Juanity is a document knowledge system, not a generic file manager, HR suite or case-management platform.

## ADR-024 — Email is primary human-facing login, but Account ID is stable identity
**Status:** Accepted / refined by ADR-027  
**Date:** 2026-09-05

Email is the primary sign-in/contact identifier, but Account/Person use stable internal IDs. Authentication remains behind an OIDC-compatible boundary.

## ADR-025 — Juanity privileged control surface is Governance, not `/admin`
**Status:** Accepted  
**Date:** 2026-09-05

Juanity-only privileged control is **Governance**, initially `/governance`. Route naming is not a security control; verified identity, capability checks, MFA, server authorisation and audit are.

## ADR-026 — External legal professionals use scoped access grants
**Status:** Accepted  
**Date:** 2026-09-05

Lawyers/legal professionals receive explicit, revocable, time-bound access to approved Person ↔ Company relationship records without becoming company members.

## ADR-027 — Social/federated login attaches external identities to a stable Juanity account
**Status:** Accepted as future-ready architecture  
**Date:** 2026-09-05

Use an `AccountIdentity`-style boundary so Google/Microsoft/Apple-style identities can later link to one stable Juanity Account. Never auto-merge accounts solely because provider emails match.

## ADR-028 — Moodle is the expected future company training/onboarding LMS boundary
**Status:** Accepted as future direction; deferred from V1  
**Date:** 2026-09-05

Juanity remains authoritative for identity/company/relationship/access. Moodle owns courses, activities, progress, assessments and LMS-generated certification. Certificates imported into Juanity use the normal Record/RecordFile engine.

## ADR-029 — Document binaries live in separate private S3-compatible object storage
**Status:** Accepted  
**Date:** 2026-09-05

PostgreSQL stores document knowledge, metadata, permissions, retention/review and audit. Actual binaries live in private S3-compatible object storage behind a provider-neutral adapter.

Production rules: no public buckets/permanent public URLs; opaque keys; Juanity authorisation before object access; quarantine/validation/malware scan/checksum before acceptance; independent backup/replication; PostgreSQL remains authoritative for access and retention policy.

See `docs/STORAGE-ARCHITECTURE.md`.

## ADR-030 — NUC may be used as a temporary resource-gated development runtime
**Status:** Accepted  
**Date:** 2026-09-05

The existing NUC may host Juanity **temporarily for development/integration** if disk, RAM, CPU and current workload headroom are acceptable.

Start minimally with:

```text
law-web + PostgreSQL
```

Add S3-compatible development storage, Redis/BullMQ, worker and ClamAV only when required and only if resources remain healthy.

Constraints:

- synthetic data only;
- the NUC is not the Juanity production host;
- the NUC is not the sole backup destination;
- NUC-local storage is not the production object-storage architecture;
- Juanity must remain reproducible from Git/configuration and portable to the dedicated Law VM;
- if existing workloads become unstable, stop the NUC runtime experiment rather than compromising them.

The dedicated Law VM remains the preferred production-like integration environment. Moving from the temporary NUC runtime to that VM must be deployment/configuration work, not redesign.

## ADR-031 — Two-service synthetic NUC deployment at samma.co.za
**Status:** Accepted for temporary DEV deployment
**Date:** 2026-09-05

Use the existing repository in `/opt/Juanita-Labour-Law`, dedicated PostgreSQL,
development identity and memory storage. Generate the initial migration from the
unchanged approved Prisma schema, apply it to the new Juanity database and verify
zero schema drift before committing migration history. Use a pinned Node 22
container with the checkout mounted to avoid unnecessary image builds. Resource-
limited preparation and validation are separate from the running web server.

Only web joins the existing Caddy network; the database is private to Juanity.
Keep host binding `127.0.0.1:2020`; Caddy uses `juanity-app:3000`. Add a scoped
include only after local validation and a proxy backup/validation. Existing
services and schemas remain untouched. USB mount checks and manual startup
prevent automatic fallback to root-backed data after a reboot.

See `docs/NUC-DEV-DEPLOYMENT.md` and
`prompts/history/2026-09-05-nuc-deployment.md`. This authorization supersedes the
older no-NUC constraint still present in the historical skills map. The UI remains
synthetic; verifying the Prisma boundary does not make UI forms persistent.


## ADR-032 — SAMMA public product name

Date: 2026-09-05

Juanity was the original development/working name.
The product was renamed SAMMA before public-facing development continued.
The public descriptor is **Employment Records & Document Management**.

Public strings, package namespaces, product CSS variables and repository-owned
application/environment configuration use SAMMA. Deployment updates coordinate
the environment key and workspace command changes after both phases pass.
Active PostgreSQL identifiers, Compose project/container/network names, archive
paths and Caddy upstream/include remain unchanged: **LEGACY INTERNAL NAME —
SAFE TO RENAME LATER**. No schema or migration changes are required. Historical
prompts and earlier decisions retain their original wording.

Phase A and the public landing page are separate commits. Validation occurs in
a temporary worktree so the live development server cannot publish partial work.
See `docs/BRAND-NAMING-AUDIT.md` for the classified occurrence inventory.


## ADR-033 — Public SAMMA email entry

Date: 2026-09-05

The root route presents only the SAMMA brand/descriptor, supplied introductory
copy, an email entry card and disabled Privacy/Terms/Help placeholders. Existing
application routes retain their development navigation; `/` does not show it.

Email format validation and a replaceable handoff lead to the existing sign-in
preview. Temporary browser session storage carries the input without exposing
it in URLs and is consumed on arrival; blocked storage allows manual entry.
This action does not authenticate, send email or create an account. Production
authentication remains a future integration. No document-engine, access-control,
model, schema or migration changes accompany the landing page.

## ADR-034 — Real authentication through Keycloak

Date: 2026-09-05. Accepted for initial DEV; implementation blocked on DNS.

The owner selects Keycloak for password/recovery/provider-session management,
verified-email state and future MFA/federation. SAMMA retains stable Account,
AccountIdentity, Person and all domain authorisation. Use Authorization Code
with PKCE and maintained session tooling; never implement password/session
cryptography or merge arbitrary accounts by matching email.

Exactly phil@samma.co.za and juanita@samma.co.za are initial Governance Owners
through explicit current capabilities, with no SUPERADMIN bypass. Controlled
administrative email verification is allowed only for these DEV bootstrap
identities and must be audited. Temporary credentials remain outside Git and
web, must be supplied manually, and require replacement at first login.

MFA support remains mandatory; enforcement is temporarily disabled for initial
DEV. Enable Governance MFA before real sensitive data. Public synthetic identity
must be disabled at authentication cutover. This supersedes the earlier synthetic
deployment direction as the target, but does not claim the cutover has occurred.

Authoritative DNS returns NXDOMAIN for auth.samma.co.za. Honour the owner's
explicit DNS/secure-issuer stop condition before implementation/deployment.
See [preflight](REAL-AUTHENTICATION-V1-PREFLIGHT.md) and
[owner request](../prompts/history/2026-09-05-real-authentication-v1.md).

### ADR-034 continuation — DNS and passwords supplied

The owner confirmed "domain added and passwords added". Authoritative/public DNS
and both filled credential fields were verified without displaying values.
Continue the already approved implementation/deployment. Select pinned Keycloak
26.7.3 and Auth.js Core 0.41.3, using a custom adapter for the existing domain
Account/AccountIdentity and only two new tables for sessions/rate windows. Public
onboarding remains closed; provider-subject bootstrap is explicit. MFA remains
supported, with enforcement disabled only for initial DEV. The two owners must
choose/store their final passwords themselves; automation never chooses them.

Deploy the web production build with synthetic identity disabled. Replace demo
actors on protected pages with Account-bound server projections; static demo
resource URLs deny instead of granting assumed company context. No unrelated
persisted document/company workflows or domain schema changes are introduced.
See docs/REAL-AUTHENTICATION-V1.md for the security/session boundaries.

### ADR-034 deployment validation

Public cutover uses application commit `8ed98f5`; real OIDC, session, logout,
verification and negative authorisation checks passed. Public synthetic identity
is disabled. Exactly two initial owner links/capability sets were provisioned.
Owner passwords must still be replaced and stored by the owners themselves;
retain the external bootstrap file until those human checklist steps are
confirmed. See the current NUC deployment report for validation evidence and
remaining operational limitations.

### ADR-034 handoff — current runtime revalidated

The original Real Authentication V1 request was reissued against a clean checkout
at `5d73317`, three commits ahead of origin/main. Preserve the existing deployment
and complete validation/documentation/publication rather than reprovisioning
owners or resetting passwords. Phil's password change and Governance login are
now confirmed by provider state and SAMMA audit; Juanita's mandatory password
change remains pending. Keep the owner worksheet until both credential-storage
checklists are confirmed. Browser regression checks may explicitly skip obsolete
bootstrap credentials and validate disposable users on desktop and mobile.

Both private databases, Keycloak and web were restarted with stable identity
linkage; public negative-access/session checks passed. Correct stale README
claims about synthetic login. No domain schema or application build changes were
needed for this handoff. See [the report](REAL-AUTHENTICATION-V1-REPORT.md).

The fast-forward push succeeded. GitHub CI exposed the already-failing Prisma
transitive dependency audit (`deepmerge-ts`/`mysql2`). Preserve the audit gate and
record the failure; do not apply npm's forced Prisma 7 → 6 downgrade as an
authentication handoff workaround. Local validation remains separately recorded.

### Prisma transitive override experiment — 2026-09-05

The user authorised only temporary exact overrides for the Prisma 7.10.0
transitive advisories, preserving the original audit and compatibility gates.
Registry-confirmed candidates were deepmerge-ts 8.0.2 and mysql2 3.24.3.
Normal npm install retained the vulnerable resolutions and npm ls marked both
invalid. Follow the explicit stop condition: revert the overrides, retain the
baseline, and do not commit/push/deploy the candidate. No workaround is accepted.
See [the focused experiment report](PRISMA-TRANSITIVE-SECURITY-EXPERIMENT.md)
and [the captured request](../prompts/history/2026-09-05-prisma-transitive-security-overrides.md).

## ADR-035 — Explicit temporary Prisma security exception for DEV

The owner subsequently authorised a documented exception for Prisma 7.10.0,
deepmerge-ts 7.1.5 and mysql2 3.15.3, limited to GHSA-ggr8-5vv4-36mx,
GHSA-3f6p-5ww8-9rcr and GHSA-rgwj-5xj2-c3m3. Keep npm audit running and visible;
accept only the exact approved dependency graph/versions/advisories in explicit
DEV context. Unknown high, every critical finding, drift and audit errors fail.
This replaces the previous unexcepted DEV CI outcome by explicit user decision,
not by suppressing security debt. No runtime or deployment change is authorised
or required by this policy change.

Remove the exception when official stable Prisma incorporates patched
dependencies and before production/sensitive-data approval. Track removal in
[issue #5](https://github.com/Soundtrek/document-law/issues/5), without inventing
an upstream release date. See the [policy](PRISMA-SECURITY-EXCEPTION.md) and
[captured authorisation](../prompts/history/2026-09-05-prisma-security-exception.md).

The now-reachable CI build exposed missing OIDC environment inputs. Supply only
synthetic build-step values and `.invalid` HTTPS origins in the workflow;
retain disabled synthetic identity activation and the existing auth checks.
No live secrets, authentication code or deployed configuration change is needed.

## Persistent storage V1 — explicit stop condition observed

2026-09-05: The owner requested private Garage DEV storage behind the existing
provider boundary, while explicitly requiring a stop if the current scan model
cannot represent unscanned DEV acceptance. Inspection found `CLEAN | REJECTED`
scanner results and `PENDING | ACCEPTED | REJECTED` persisted statuses, without
`NOT_SCANNED_DEV`. Stop implementation rather than return a false clean result.
No model change or deployment was made. Baseline, private database checkpoint,
migration status and zero drift were verified. The proposed explicit DEV scan
extension remains for review, not an accepted schema decision. See
[preflight evidence](PERSISTENT-STORAGE-V1-PREFLIGHT.md) and
[the captured request](../prompts/history/2026-09-05-persistent-document-storage-v1.md).

## ADR-036 — Persistent private S3 storage with an explicit DEV scan outcome

The owner superseded the initial stop with a full-preflight requirement and
explicit authority for grouped non-destructive YELLOW/ORANGE compensations,
implementation, the scan enum migration, Garage DEV setup, CI, fast-forward push
and exact-SHA deployment. The completed [preflight](PERSISTENT-STORAGE-V1-PLAN.md)
found no RED blocker. Keep the original report as historical evidence.

Use pinned Garage v2.3.0 for single-node synthetic DEV only, on the existing
verified USB archive and private SAMMA network. Keep provider-neutral S3 code;
production provider/region remains undecided. Core runtime remains web + SAMMA
PostgreSQL + Garage; existing separate Keycloak services are unchanged.

Add only ScanStatus.NOT_SCANNED_DEV. Storage acceptance remains separate from
malware outcome: DEV files retain NOT_SCANNED_DEV in DB/UI/audit. Accept only
under explicit SAMMA_ENV=development and not-scanned-dev scanner policy; all
other deployment modes fail closed until a real scanner is integrated.

Complete the small authenticated relationship-upload/download/history UI path,
including Legal Access canDownload, server-resolved roles, CSRF Origin/custom
header checks, bounded USB staging and streamed S3 SHA-256 verification. New UUID
key per file version; no shared-checksum deduplication or permanent document URLs.
Metadata/current-file pointer and audit commit together; compensating deletion
must not delete an object after an ambiguous successful DB commit.

No public Garage ports, no bucket owner rights for web, no browser credentials,
no worker/Redis/ClamAV or unrelated product integration. Rollback preserves the
additive migration and any newly written objects; memory is not a substitute for
S3-backed data. A recovery set includes PostgreSQL and Garage metadata/data with
protected configuration. Off-host backup/restore and malware scanning remain
required before sensitive production use. See the captured
[continuation authority](../prompts/history/2026-09-05-storage-full-preflight-authorisation.md).


### ADR-036 — Ambiguous COMMIT compensation

A negative DB read immediately after a lost COMMIT acknowledgement does not
prove rollback: it may race the original transaction. Preserve the object on
uncertain outcomes even if no row is visible yet. Delete only after a known
rollback (callback not completed, or explicit Prisma P2034 transaction abort).
A confirmed committed file can return success. This tightens the authorised
failure semantics without a schema/runtime-service expansion; tests cover all
three outcomes against real PostgreSQL and Garage with disposable fixtures.

## ADR-037 — Development branch promotion policy

2026-09-05: The owner approved `experiment/* → dev → main`. Create experiments
from current `dev`, validate before integration, and perform NUC integration,
visual and functional approval on `dev`. Keep `main` stable and deployable as the
RC branch, receiving only approved `dev` promotions through normal merge /
fast-forward workflow. Do not normally force-push `main`; preserve useful archives.

For establishment, create/push `dev` from
`0bc1660f03b8380aedcf24a44881f4196e5eb4de` and switch the canonical NUC checkout to
it. Commit only policy documentation on `dev`; leave local/remote `main` at the
baseline and the existing archive at `536a75499976ce96712ac2ad29313f29fa8bc045`.
Application code and runtime configuration remain unchanged; no rebuild or
redeploy is needed. This supersedes earlier normal-NUC-branch instructions.
See the [branch policy](BRANCH-WORKFLOW.md) and
[captured request](../prompts/history/2026-09-05-branch-workflow.md).

## ADR-038 — Explicit build identity for DEV and experiment candidates

2026-09-06: Add an opt-in build overlay and public health build metadata, using
only a build-time branch/channel/full SHA snapshot. Map dev → DEV,
experiment/* → EXPERIMENT, main → RC. Never infer deployed identity from runtime
Git, container labels or the mutable canonical checkout. The visibility flag is
also frozen at build time; disabled builds omit public build metadata. Capture
clean candidate identity before bounded isolated builds, leaving the live
artifact unchanged. No database, authentication or storage changes. Work and
push only on `experiment/dev-version-overlay`; no merge or deployment is
approved by this request. See the [captured prompt](../prompts/history/2026-09-06-dev-version-overlay.md)
and [build procedure](BUILD-VERSION-OVERLAY.md).

## ADR-039 — Person / Company entry experiment

2026-09-05: Implement the owner's requested Person or Company entry from `dev`
`67c2a8973a6ec0dfb437944176f8da4878fb4a58` on
`experiment/onboarding-person-company`. Person remains free and independent.
Company onboarding asks only for a company name and creates Company, active
CompanyMember and the approved OWNER grant transactionally with audit. OWNER
never supplies implicit HR/Payroll/Legal or platform capabilities.

Use existing Account/Identity/Person schema and verified Keycloak callbacks;
never merge matching emails or classify Accounts permanently. Encrypted,
short-lived flow state is bound to OAuth state, then Account/identity. The opaque
flow nonce doubles as the Company creation idempotency key. Repeat login and
concurrent submissions preserve entity identity. No migration is required.

The overengineered Real Workflow V1 is rejected/archived at
`archive/overengineered-workflow-2026-09-05`; it is not the approved signup model.
This experiment does not reuse that branch or add approvals, packages, billing,
invitations, relationships, SMTP, document workflows or Governance changes.
Provider registration remains disabled pending its separate verification setup.

Normal NUC checkout/runtime remain on `dev`; validate in a separate worktree,
synthetic database and loopback candidate. Push the experiment for Phil's review;
**do not merge to dev or touch main without approval**. See the
[captured request](../prompts/2026-09-05-onboarding-person-company.md) and
[validation report](ONBOARDING-PERSON-COMPANY-REPORT.md).

## ADR-040 — Approved overlay promotion and one LAN experiment slot

2026-09-06: Phil visually approved the overlay at `deed84b` for fast-forward
promotion into dev. Rebase the existing onboarding experiment onto that dev,
with only straightforward conflict resolution and proportional build checks.
Preserve both features; do not merge onboarding into dev before Phil approves.

Reserve `192.168.1.152:2022` exclusively for a single experiment build. Phil uses
`http://192.168.1.152:2022`; never run dev/main there or allocate additional
experiment ports. Replace only the previous experiment runtime after the exact
new experiment SHA is built with an enabled, immutable experiment overlay.
Keep samma.co.za, main and shared services unchanged. Smoke-check the entry UI,
health and badge, then stop for Phil. This supersedes the earlier loopback-only
experiment inspection instructions. See the [captured request](../prompts/history/2026-09-06-overlay-promotion-onboarding-lan.md).

## ADR-041 — Dedicated public DEV runtime

2026-09-06: Explicitly approved `dev.samma.co.za` for exact `dev` builds,
`samma.co.za` for `main` RC, and LAN port 2022 for experiment previews only.
Use a separate `samma-dev-web` container on loopback 2023 with isolated source,
dependencies and build output. Share the existing synthetic DEV PostgreSQL,
Garage and Keycloak; add exact DEV callback/logout URLs without wildcards.
Keep host-only secure cookies, a separate DEV auth secret and canonical origin.
Caddy uses the existing proxy network; validate and back up before reload.
Commit this requested documentation/runtime scaffold directly on `dev` only
as explicitly instructed; no main promotion or RC/experiment restart.
See [request](../prompts/history/2026-09-06-dedicated-dev-runtime.md) and
[operations](DEV-RUNTIME.md). Validation is limited to build and focused
runtime/auth smoke checks, with no full regression suite.

## ADR-042 — Approved onboarding promotion to public DEV

2026-09-06: Phil approved merging `experiment/onboarding-person-company` into
`dev` with a normal merge, building the exact new dev SHA with the DEV overlay,
and deploying only the existing dedicated public DEV runtime. Verify actual
Person and Company Keycloak journeys and their database outcomes using disposable
synthetic identities, public health/readiness, and quick desktop/mobile visuals.
Use proportional validation; do not repeat the full regression suite. Preserve
main/RC, the Keycloak issuer/callback configuration and port 2022 experiment
runtime. Stop for Phil's visual/functional approval before any main promotion.
The merge conflict was confined to appended decision-log entries; preserve both
sets of decisions, numbering the dedicated runtime entry ADR-041 to avoid the
independent ADR-039 collision. No onboarding/auth semantics changed.
See the [captured request](../prompts/history/2026-09-06-onboarding-dev-promotion.md).

## ADR-043 — Public auth completion gated by real SAMMA mail

2026-09-06: Phil requested complete provider-owned registration, verification,
password recovery and Person/Company onboarding on
`experiment/auth-registration-v1` from current DEV. Preserve stable issuer/subject
identity, fail closed on email collisions, require verified public email, grant
only explicit initial company OWNER, and retain optional DEV MFA. Keep exact
DEV/RC callbacks and host-only cookies; port 2022 is preview-only. Merge requires
Phil's later approval.

The explicit RED SMTP gate was reached in read-only preflight: Keycloak has no
SMTP configuration and existing NUC authenticated mail is configured for another
domain, with no identified SAMMA sender authorisation. Do not copy those
credentials, invent a mail provider, fake verification or enable public flows.
Resume once a dedicated SAMMA sender and suitable secure SMTP credentials are
available outside Git under `/etc/samma-dev/`, mode 0600. Phil's provider required
actions are complete; Juanita still requires UPDATE_PASSWORD. Preserve both
identities and the bootstrap worksheet. No application/provider/runtime changes
were made. See the [request](../prompts/2026-09-06-auth-registration-v1.md) and
[preflight evidence](AUTH-REGISTRATION-V1-PREFLIGHT.md).

### ADR-043 continuation — owner supplied dedicated SMTP

The owner supplied `no-reply@samma.co.za` mailbox settings and entered the password
directly into a 0600 operator file. Mail DNS currently points to the web host, so
use the existing hosting endpoint `wp13.host-ww.net:465`, whose TLS certificate
also validates the SAMMA mail domain and which accepts the supplied mailbox
credentials. Preserve normal certificate checks. No other product's credentials
or runtime are reused. Dedicated provider verification/reset messages were
retrieved only from an exact disposable tagged mailbox folder and their links
tested; no existing mailbox content was fetched.

Enable provider registration/recovery, retain verified-email/MFA boundaries, and
apply a 12-character provider password policy plus a baseline common-password
denylist. Native recovery lacks request throttling, and the existing Caddy has
no rate-limit module. A bounded stock Nginx forward-auth gate (32 MB, 0.1 CPU)
therefore protects provider login-action/recovery endpoints without handling
passwords or changing the SAMMA architecture. Only the auth proxy route changed;
disk/loaded proxy configuration and unrelated routes were verified.

The application experiment adds `prompt=create`, preserves existing-session
Company setup, rejects case-insensitive email collisions without linking, and
maps safe auth errors. Existing owner identities/checklist remain untouched.
No schema or records/storage functionality changed. Build/targeted validation
and the [report](AUTH-REGISTRATION-V1-REPORT.md) precede Phil's merge gate; actual
Person/Company browser acceptance on DEV remains after approved integration.
No experiment callback/hostname, port-2022 auth exception or dev/main merge was added.

## ADR-044 — Approved auth registration DEV promotion and acceptance

2026-09-06: Phil approved normal merge of experiment/auth-registration-v1 at
44fd91a into DEV, an exact DEV build/deployment, and real public browser
Person/Company registration, verification, password recovery, session isolation
and logout acceptance. Preserve main/RC application deployment and port 2022.
Use proportional promotion checks; do not rerun validated suites when merged
auth code is unchanged. Preserve Phil/Juanita and scope cleanup only to fresh
disposable test accounts and SAMMA Auth Test Company. The existing shared
Keycloak realm/client means its registration/SMTP/recovery policies affect both
DEV and RC sign-in; report that independently of unchanged RC application code.
Stop for Phil after DEV acceptance; no main promotion is authorised. See the
[captured request](../prompts/2026-09-06-auth-registration-dev-promotion.md).
