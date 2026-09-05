SAMMA — EXPERIMENT: PERSON / COMPANY ONBOARDING

GOAL

Build the intended SAMMA account-entry model:

Create account
  ↓
Choose:

[ Person ]   [ Company ]

This experiment must restore the simple product model already defined in SAMMA documentation.

Repository:

/opt/Juanita-Labour-Law

Remote:

Soundtrek/document-law

Current DEV baseline:

67c2a8973a6ec0dfb437944176f8da4878fb4a58

Branch model:

experiment/*
    ↓
dev
    ↓
main

Create:

experiment/onboarding-person-company

from current dev.

Do NOT work directly on dev.

Do NOT touch main.

==================================================
PRODUCT MODEL
==================================================

SAMMA has two entry journeys.

PERSON

A human joins SAMMA for their own employment records.

Result:

Account
  ↓
Person
  ↓
Personal Info Center

A Person:

- has a free persistent SAMMA account;
- is independent of employers;
- may later have relationships with multiple companies;
- receives employment/legal records through those relationships;
- does not automatically become a CompanyMember;
- does not receive a generic Create Company action as part of the normal Person flow.

COMPANY

A human joins SAMMA to create and operate a company workspace.

Result:

Account
  ↓
Person
  ↓
Company
  ↓
CompanyMember
  ↓
OWNER
  ↓
Company Info Center

The human still has a stable Person identity underneath for audit/security.

The Company is the workspace.

Company OWNER is company governance only.

It does not grant:

- SAMMA Governance;
- HR;
- Payroll;
- Legal;
- universal sensitive-record access.

Functional roles remain explicit.

==================================================
IMPORTANT — DO NOT INVENT MORE
==================================================

Do NOT add:

- company approval states;
- company verification queues;
- pending company review;
- manual SAMMA approval;
- account tiers;
- package selection;
- billing setup;
- payment setup;
- employee invitation;
- employee relationship creation;
- SMTP;
- document workflow;
- legal access changes;
- Governance changes;
- new account taxonomy.

This experiment is only:

PERSON or COMPANY onboarding.

==================================================
PHASE 1 — PREFLIGHT
==================================================

Before coding inspect:

- current landing page
- /sign-in
- Keycloak login flow
- Account creation/linking
- Person bootstrap
- post-login redirect
- /person
- /company
- Company model
- CompanyMember
- FunctionalRoleGrant
- current approved OWNER role
- current route protection
- current navigation
- current DB schema/migrations
- dev branch policy

Also inspect the archived rejected workflow only if useful for reusable implementation pieces:

archive/overengineered-workflow-2026-09-05

Do NOT merge or cherry-pick that branch wholesale.

You may reuse narrowly understood code ideas only if they match this exact model.

==================================================
PHASE 2 — ENTRY UX
==================================================

The public account-entry journey should clearly present:

SAMMA

Create your account

I'M JOINING AS

[ Person ]
For individuals who want to receive and manage their employment records.

[ Company ]
For organisations that want to manage employment records for their people.

Keep wording concise.

Do not over-explain architecture.

==================================================
AUTHENTICATION BOUNDARY
==================================================

Keycloak remains the credential provider.

SAMMA must not implement password handling.

The selection:

PERSON
or
COMPANY

is SAMMA onboarding state, not a Keycloak role.

Do not encode product type into Keycloak realm roles.

==================================================
PHASE 3 — ONBOARDING STATE
==================================================

Determine the cleanest way to preserve the user's chosen onboarding path through authentication.

Requirements:

- no sensitive value in URL;
- no trust in client-only state for final authorisation;
- value limited to PERSON or COMPANY;
- safe against tampering;
- expires/clears after use;
- repeat login does not recreate entities.

Prefer existing secure session/onboarding mechanisms where possible.

Do not add a large onboarding framework.

==================================================
PHASE 4 — PERSON JOURNEY
==================================================

PERSON selection:

1. user chooses Person;
2. real Keycloak authentication occurs;
3. stable SAMMA Account resolves/creates under existing identity rules;
4. one Person resolves/creates;
5. user lands at Personal Info Center.

Do NOT create:

- Company
- CompanyMember
- OWNER
- PersonCompanyRelationship

Person empty state should be normal and useful.

Example:

Your companies
No company relationships yet.

Your records
No records yet.

Do not show synthetic data.

==================================================
PHASE 5 — COMPANY JOURNEY
==================================================

COMPANY selection:

1. user chooses Company;
2. real Keycloak authentication occurs;
3. stable Account resolves;
4. Person resolves;
5. company setup asks only for the minimum required company information;
6. Company is created;
7. authenticated Person becomes ACTIVE CompanyMember;
8. approved OWNER role is assigned;
9. audit event created;
10. land in Company Info Center.

Minimum company field:

Company name

Only collect more if the current model genuinely requires it.

Do not ask for registration number, tax number, address, industry, etc. unless technically mandatory.

==================================================
PHASE 6 — EXISTING ACCOUNT BEHAVIOUR
==================================================

Handle existing users carefully.

Existing Person with no company:

- normal Person login goes to /person;
- no generic Create Company button added.

Existing Company member:

- login may access authorised company workspace through existing membership.

Do not create duplicate companies on repeat login.

Do not silently create a company merely because someone selected Company once and then abandoned setup.

Company creation should complete only after explicit company-name submission.

==================================================
PHASE 7 — COMPANY OWNER
==================================================

On successful company creation:

create:

Company
CompanyMember
OWNER role grant

in one safe transaction where possible.

Audit all important transitions.

Do not grant:

platform.*
HR
PAYROLL
LEGAL
CLERK
BILLING

unless separately assigned later through normal Company Team & Access.

OWNER remains exactly what current policy defines.

==================================================
PHASE 8 — NAVIGATION
==================================================

PERSON navigation should remain person-focused.

Do not show normal Person users:

Create company

as a prominent Personal Info Center action.

COMPANY users should have access to Company workspace through their membership.

If the same Account legitimately has both Person context and Company membership:

allow navigation between:

Personal Info Center
Company Info Center

Do not create separate accounts.

==================================================
PHASE 9 — ROUTES
==================================================

Use clear routes.

Possible structure:

/onboarding
/onboarding/company

or existing equivalent.

Do not resurrect the rejected generic:

/company/new

as a normal Person dashboard action.

If /company/new is reused internally, it must only be reachable as part of the Company onboarding journey and not promoted as a general Person action.

Prefer route naming that reflects onboarding intent.

==================================================
PHASE 10 — DATABASE
==================================================

First attempt implementation with existing schema.

Do not add migrations unless genuinely required.

If onboarding-choice persistence requires a new database field/table:

justify it first.

Prefer short-lived secure flow state over permanent Account type flags.

Do NOT add:

account_type = PERSON | COMPANY

as a permanent identity classification unless absolutely necessary.

Why:

one Account may legitimately have:

- personal context
- one or more Company memberships
- Legal Access
- Governance

The onboarding choice determines initial journey, not permanent human identity.

==================================================
PHASE 11 — SECURITY
==================================================

Server must verify:

- authenticated Account;
- verified identity;
- one Person per Account;
- approved active OWNER role exists before assignment;
- company creation transaction integrity.

Do not trust browser claims like:

role=OWNER
companyId
accountType

Do not allow Company onboarding to grant Platform Governance.

==================================================
PHASE 12 — AUDIT
==================================================

Use existing audit boundary.

Expected events include equivalents of:

PERSON_ACCOUNT_CREATED
COMPANY_CREATED
COMPANY_MEMBER_JOINED
COMPANY_MEMBER_ROLE_GRANTED

Do not log:

passwords
OIDC tokens
session IDs
unnecessary personal data

==================================================
PHASE 13 — UI
==================================================

Keep it visually aligned with SAMMA:

- light
- calm
- simple
- two clear selection cards/buttons
- mobile friendly
- no marketing clutter

Desktop:

two side-by-side choices where space permits.

Mobile:

stacked choices.

Do not create a wizard with many steps.

Target:

Choice
→ authentication
→ minimum setup
→ Info Center

==================================================
PHASE 14 — TESTS
==================================================

Add focused tests.

PERSON

- choose Person
- Account created/resolved
- one Person created
- no Company
- no CompanyMember
- no OWNER
- lands /person
- repeat login does not duplicate

COMPANY

- choose Company
- Account created/resolved
- Person created/resolved
- company-name form shown
- create Company
- create active CompanyMember
- grant OWNER
- no platform Governance capability
- no HR/Payroll/Legal grant
- lands Company Info Center
- repeat submit does not duplicate

SECURITY

- client cannot assign arbitrary role
- client cannot grant Governance
- suspended/unverified Account denied
- invalid onboarding choice rejected
- abandoned Company onboarding creates no Company

==================================================
PHASE 15 — BROWSER VALIDATION
==================================================

Use disposable real Keycloak DEV identities.

Test:

PERSON JOURNEY

Landing
→ Person
→ Keycloak login
→ Personal Info Center

Confirm:

- no company created
- no Create Company action in normal Person UI

COMPANY JOURNEY

Landing
→ Company
→ Keycloak login
→ company name
→ Company Info Center

Confirm:

- Company exists
- member exists
- OWNER exists
- no Governance grant

Validate:

1440
768
390

==================================================
PHASE 16 — REGRESSION
==================================================

Confirm existing foundations still work:

- Keycloak login/logout
- Phil Governance
- Person Info Center
- Company Info Center protections
- S3 readiness
- persistent file download
- Legal Access protection
- /api/health
- /api/ready

Do not modify storage.

==================================================
PHASE 17 — DOCUMENTATION
==================================================

Update ONLY current product/workflow docs needed to make the entry model explicit.

At minimum review:

README
PROJECT-CHARTER
APPLICATION-FRAMEWORK
BUILD-PLAN
AUTHENTICATION-AND-GOVERNANCE
DECISION-LOG

Record clearly:

SAMMA onboarding begins with:

PERSON
or
COMPANY

PERSON:
free independent personal account / Info Center

COMPANY:
creates Company workspace during onboarding; first user becomes Company OWNER

Do not rewrite historic records unnecessarily.

Mark the rejected Real Workflow V1 model as archived/rejected if referenced.

Do not reintroduce complex signup concepts.

==================================================
PHASE 18 — VALIDATION
==================================================

Run:

npm ci
prisma generate
prisma validate
migration status
schema zero-diff
tests
typecheck
lint
production build
production audit gate

No new Prisma exception.

==================================================
PHASE 19 — EXPERIMENT COMMIT
==================================================

Commit only on:

experiment/onboarding-person-company

Suggested commit:

feat: add person and company onboarding paths

Push the experiment branch.

DO NOT merge to dev yet.

DO NOT deploy the experiment as the normal NUC runtime yet unless using an isolated candidate deployment.

==================================================
PHASE 20 — EXPERIMENT REVIEW
==================================================

Validate the experiment separately.

Return to Phil for approval before:

experiment/onboarding-person-company
    ↓
dev

No merge without approval.

==================================================
FINAL REPORT
==================================================

STATUS: PASS / PARTIAL / BLOCKED

BRANCH
- source dev SHA
- experiment branch
- experiment SHA
- pushed status

PERSON PATH
- onboarding choice
- Account
- Person
- destination
- company created: NO

COMPANY PATH
- onboarding choice
- Account
- Person
- Company
- CompanyMember
- OWNER
- destination

SECURITY
- Governance granted: NO
- implicit HR/Payroll/Legal: NO
- duplicate protection
- invalid-state handling

DATABASE
- migration required: YES/NO
- zero-diff

UI
- desktop
- tablet
- mobile

REGRESSION
- auth
- Governance
- storage
- Legal Access
- health/readiness

VALIDATION
- tests
- typecheck
- lint
- build
- audit

GIT
- experiment commit
- origin branch
- dev unchanged
- main unchanged

DO NOT MERGE TO DEV YET