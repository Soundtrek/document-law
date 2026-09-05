# Real user and company workflow V1

Normal authenticated screens read PostgreSQL. No demo Person/company fallback is used.

## Account and Personal Info Center

Auth.js verifies the configured Keycloak response before SAMMA resolves issuer + subject. Existing linked Accounts retain their IDs. A previously unseen verified subject may create a new Account/Identity/Person atomically only when there is no matching Account email. An existing-email collision fails closed for explicit identity-link review; no Account is merged or relinked. Repeat login and concurrent requests preserve one Person per Account. Suspended/unverified Accounts cannot onboard or mutate workflows. Keycloak registration and provider configuration are unchanged; DEV operators still provision identities while registration/SMTP are unavailable.

Login lands at `/person`: display identity, current/historical employment relationships, active company memberships, pending invitations and policy-visible records. A company relationship never owns the Person account. A missing Person is bootstrapped from the authenticated stable Account, including audit.

## Company and Team & Access

`/company/new` collects only company name. One transaction creates Company, ACTIVE CompanyMember, the approved active OWNER role grant, and audit. It reads the configured role catalogue and never creates platform capabilities. Company creation is unavailable if the approved OWNER configuration is missing.

`/company?companyId=…` validates membership and selected company server-side. The switcher lists only active memberships. Company context is an authorised URL parameter, not a stored default. Company Owners manage membership and may assign themselves HR or another approved functional role under `/company/team?companyId=…`. Active grants use the existing configured capabilities. OWNER is not a universal record reader. Last-Owner removal/revocation is rejected; removed membership preserves Account/Person and attribution. Functional role revocation takes effect on the next server access check.

People are shown only with `company.members.manage` or `relationship.view`; assigned-only Manager capability is not widened into access to all employees. Individual records retain definition role checks, including for Owners.

## Employee invitation and acceptance

`/company/invite?companyId=…` creates an EMPLOYMENT invitation. Team invitations use distinct MEMBERSHIP purpose and approved role IDs. Employee acceptance creates an employment relationship, not company membership; team acceptance creates membership, not employment.

Current delivery is **DEV-only manual sharing**, enabled only in `SAMMA_ENV=development`. No email is sent. A cryptographically random 256-bit token expires in 24 hours; PostgreSQL stores only its SHA-256 hash. The manual link carries its token in the URL fragment, which is not sent in the HTTP request. The acceptance form clears the fragment from browser history and submits it in a same-origin POST. Copy links through the UI; never paste tokens into Git, logs or reports.

An employee must sign into their own verified account. If opening a link while signed out, sign in and reopen the shared link. `/person` lists valid invitations for the authoritative verified Account email; acceptance still requires possession of the link/code. A known invited Account is bound by ID as well as email; another logged-in Account cannot accept it. An unknown address creates no fake Account or Person. Its later verified OIDC onboarding must succeed independently.

One company/email/purpose invitation is idempotent. Repeating creation reports its existing state without reissuing a token. Explicit Refresh rotates a pending token and invalidates the previous link; owners may revoke pending links. Acceptance rechecks company and inviter membership capability, expiry, revocation, stable Account, verified email, and active role definitions. Successful retry returns the previous result without granting roles again. A removed/disabled membership is never resurrected by invitation acceptance.

Company-row locking and serializable transactions serialize relationship/role lifecycle writes. An existing pending/active relationship is reused; former/ended relationships stay historical. Accepted/revoked invitation rows are retained. Re-invitation after a completed/offboarded invitation lifecycle requires a future explicit workflow rather than silently resetting accepted evidence.

## Employee profile, records and files

`/company/people/{relationshipId}` is authoritative by opaque relationship ID. It exposes only that company's employment context and permitted records. Private Person records and other-company relationships are excluded. The profile links to the existing `/company/relationships/{relationshipId}/add-record` intake screen.

Record types come from active Governance definitions/versions. Server checks active membership, functional role, company/relationship consistency, active relationship state and definition context before intake and again at commit. No authorised type gives a real empty state. An Owner can explicitly assign self HR in Team & Access to use HR-restricted definitions.

The existing storage orchestration stages and validates bytes, writes quarantined Garage objects with opaque immutable keys, verifies SHA-256, applies the explicit NOT_SCANNED_DEV policy and persists Record/RecordFile/audit transactionally. There is no second upload path. File replacement keeps the previous object. Record versions keep their original definition policy, retention and review values.

`personVisible` is the existing employee visibility policy: true appears in the employee's Info Center; false does not. No new acknowledgement workflow is claimed. Authorised downloads use the existing private streaming route, fresh permissions and checksum validation. Company Owners need the definition's permitted role; platform Governance remains separate.

## Configuration and migration

Preflight: [REAL-WORKFLOW-V1-PREFLIGHT.md](REAL-WORKFLOW-V1-PREFLIGHT.md).
Migration `0004_company_invitations` is additive. Review SQL, take a private PostgreSQL dump, migrate deploy, then status and schema zero-diff. No destructive conversion, storage migration or default company column.

When a DEV environment has no configuration, an operator with `platform.roles.manage` and `platform.definitions.manage` may run:

```sh
node_modules/.bin/tsx infrastructure/workflow/seed-dev.ts GOVERNANCE_ACCOUNT_ID
```

This audited command inserts only absent approved roles. If no active relationship definitions exist, it adds two synthetic HR-only types (employee-visible/internal), without retention/destruction values. It never runs in request code, overwrites existing configuration or restores revoked privileges.

## Validation and remaining operations

`npm run test:workflow` runs isolated real PostgreSQL security tests after migrations; CI provisions a disposable Postgres service and applies/checks all migrations. `infrastructure/workflow/browser-validation.cjs` drives disposable real Keycloak identities through the complete two-company browser workflow and 1440/768/390 layouts. Operator credentials, tokens and screenshots stay in private validation storage outside Git. The existing auth/storage suites continue to cover sessions, scoped Legal Access, object isolation and uncertain commit compensation.

SMTP transport and recovery, malware scanner, Governance MFA activation, approved production infrastructure and tested off-host backup/restore remain separate work. This deployment remains synthetic-data-only DEV despite using the public domain.
