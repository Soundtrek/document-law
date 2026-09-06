# Person / Company onboarding experiment

## Status: PARTIAL — implementation validated; baseline limitations remain

The requested experiment is implemented and validated separately. It has not been
merged to `dev`, promoted to `main`, or installed as the normal NUC runtime.

Remaining limits:

1. The **normal DEV database fails zero-diff**: it contains an extra
   `CompanyInvitation` table (three existing rows) and `InvitationKind` enum absent
   from current `dev`. Its migration status nevertheless reports all three
   migrations applied. This is pre-existing drift: the experiment's schema and
   migrations are byte-for-byte unchanged from `dev`. No normal DEV tables or data
   were changed or removed. The isolated candidate database has **zero diff**.
2. Keycloak DEV has self-registration disabled and SMTP unconfigured. Both SAMMA
   journeys pass with fresh disposable, administratively verified Keycloak DEV
   identities, without pre-linking them in SAMMA. Public provider credential
   registration and recovery remain outside this experiment.
3. Phil's Account remains ACTIVE, verified and holds all ten active Governance
   grants (read-only DEV check). His private interactive login was not exercised.
   Governance access/denial/revocation passed with a real synthetic OIDC session
   and an explicitly granted, subsequently removed test capability fixture.

## Branch

- Source `dev`: `67c2a8973a6ec0dfb437944176f8da4878fb4a58`.
- Experiment: `experiment/onboarding-person-company`.
- Worktree: `/home/philip/samma-onboarding-person-company`.
- Normal NUC checkout: `/opt/Juanita-Labour-Law`, still clean on `dev`.
- `main`: `0bc1660f03b8380aedcf24a44881f4196e5eb4de`, unchanged.
- Commit and push are restricted to the experiment. The final handoff supplies
  its exact commit SHA and verified origin status.
- The rejected archived workflow was not merged, cherry-picked or reused.

## Person path — PASS

`/` or `/onboarding` → Person → real Keycloak → stable Account + one Person →
`/person`. Fresh and repeat logins retain identity. There is no Company,
CompanyMember, OWNER grant or PersonCompanyRelationship. The normal Person UI has
useful empty records/relationships and no Create Company action.

## Company path — PASS

`/` or `/onboarding` → Company → real Keycloak → Account + Person →
`/onboarding/company` → explicit company-name submission → Company Info Center.
Company, ACTIVE CompanyMember, approved OWNER grant and three audit events commit
together. Existing active company members go directly to `/company`; they can
navigate between both Info Centers. No additional company fields, invitation,
relationship, billing, package or approval process is introduced.

## Security and audit — PASS

- Keycloak retains passwords and OIDC credentials. No provider role taxonomy or
  provider registration/client configuration is changed.
- Strict PERSON/COMPANY input. Encrypted 15-minute host-only, Secure, HttpOnly,
  SameSite=Lax state is bound to Auth.js OAuth state, then Account/identity.
  Callback consumes authentication state; successful setup clears setup state;
  another sign-in clears abandoned setup. Existing members get no new setup state.
- Bootstrap resolves issuer/subject; matching emails never merge/link Accounts.
  Concurrent callbacks retain one Account and Person. Suspended/unverified
  Accounts, unverified claims and invalid state are denied.
- Company POST checks exact Origin, live verified session, matching identity,
  active approved OWNER policy and exactly one company-name field. Extra role,
  companyId, accountType and platform-capability fields are rejected.
- OWNER grants only `company.members.manage` and `company.settings.manage`.
  **Onboarding grants no Governance, HR, PAYROLL, LEGAL, CLERK or BILLING.**
- Account locking and the opaque flow nonce as Company ID protect concurrent
  submits, retries after a lost response and replay after membership removal.
  Abandoned setup creates no Company. Audit failure rolls back all entity writes.
- Real-browser DB evidence before other fixtures: **2 Accounts, 2 Persons,
  1 Company, 1 ACTIVE member, 1 OWNER grant, 0 relationships, 0 Governance grants**.
  `PERSON_ACCOUNT_CREATED` occurred twice; `COMPANY_CREATED`,
  `COMPANY_MEMBER_JOINED`, `COMPANY_MEMBER_ROLE_GRANTED` once each.

## UI and browser validation — PASS

Desktop 1440, tablet 768 and mobile 390: entry choices, Person empty state,
company-name setup and Company Info Center fit without horizontal overflow.
Desktop/tablet choices sit side by side; mobile choices stack. Synthetic
screenshots were inspected and remain outside Git in
`/home/philip/samma-onboarding-validation/` (`entry-*`, `person-*`,
`company-setup-*`, `company-*`).

Real Keycloak tests cover PKCE/state/nonce, protected-route redirects, secure
cookies, both journeys, normal Person repeat login, Company repeat login,
abandoned setup, duplicate submit, cross-account setup-cookie reuse, invalid
fields/Origin, tampered authentication state, unverified provider identity, real
logout and rejection of the old session.

## Regression — PASS except the stated Phil interactive-login limitation

- Stable identity, email-link denial, suspension/unverified/expired/unlinked
  sessions and revocation.
- Person/tenant isolation, functional-role revocation, definition-version
  integrity, private record isolation and Governance not being a record bypass.
- Company protections and scoped Legal Access, including view-only download
  denial, explicit download permission and revocation.
- Real S3-backed UI upload, checksum download, replacement with immutable prior
  version, current/prior downloads after candidate restart, and DB/S3 readiness.
  Existing storage code and configuration were not changed; synthetic storage
  fixtures and objects were cleaned up.
- Candidate and normal DEV `/api/health` and `/api/ready` return 200.

## Validation

| Check | Result |
| --- | --- |
| `npm ci` | PASS; lockfile and dependencies unchanged |
| Prisma generate / validate | PASS |
| Migration status | PASS on isolated candidate and normal DEV; three existing migrations |
| Candidate schema zero-diff | PASS; no migration required |
| Normal DEV schema zero-diff | FAIL: pre-existing invitation table/enum described above |
| `npm test` | PASS: 62 tests |
| PostgreSQL onboarding integration suite | PASS, including concurrency and audit rollback |
| Existing database auth/access regression | PASS |
| Real Keycloak browser and DB evidence | PASS |
| Governance synthetic browser regression | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, no warnings |
| `npm run build` | PASS, production build |
| `SAMMA_ENV=development npm run audit:production` | PASS with the existing documented DEV-only Prisma exception; no new exception |
| `git diff --check` | PASS |

The audit does not give production/sensitive-data approval. The first isolated
network audit attempt could not reach npm; the final live audit ran from the host
with the explicitly required development environment.

Test entrypoints and isolation requirements are in
[`infrastructure/onboarding/README.md`](../infrastructure/onboarding/README.md).
The candidate used a separate database and loopback port 2022, with canonical
HTTPS browser routing preserving the real OIDC callback. No public routing change
was made. Disposable provider identities, sessions, candidate runtime and database
are cleaned up after evidence capture; normal DEV remains running.

**Do not merge to dev yet. Phil's approval is required before integration.**
