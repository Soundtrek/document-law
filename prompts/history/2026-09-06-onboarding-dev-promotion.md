SAMMA — MERGE ONBOARDING EXPERIMENT TO DEV + CHECK REAL FLOW

GOAL

Promote the approved onboarding experiment into dev and test the real Person / Company onboarding flow at:

https://dev.samma.co.za

Do NOT touch main.

Do NOT change port 2022 experiment rules.

==================================================
CURRENT BRANCH MODEL
==================================================

experiment/*
→ http://192.168.1.152:2022

dev
→ https://dev.samma.co.za

main
→ https://samma.co.za

==================================================
CURRENT BRANCHES
==================================================

dev
→ current integrated DEV branch

experiment/onboarding-person-company
→ current onboarding experiment
→ overlay shows experiment/onboarding-person-company on port 2022

The experiment has already passed:

- 62 tests
- typecheck
- lint
- production build
- auth/storage regression
- desktop/tablet/mobile
- audit gate

Do NOT rerun all of that unless the merge creates a real conflict or build failure.

==================================================
STEP 1 — PRECHECK
==================================================

Verify only:

- working trees clean
- local dev == origin/dev
- onboarding experiment == origin experiment branch
- main unchanged
- no unexpected commits on dev

Fetch origin.

==================================================
STEP 2 — MERGE EXPERIMENT INTO DEV
==================================================

Merge:

experiment/onboarding-person-company
→ dev

Use normal merge/fast-forward where possible.

Do NOT squash unless branch policy requires it.

Resolve only straightforward conflicts.

If a material conflict changes onboarding/auth semantics:

STOP and report.

Push dev normally.

Do NOT touch main.

==================================================
STEP 3 — BUILD DEV
==================================================

Build exact new dev SHA.

Inject:

SAMMA_SHOW_BUILD_OVERLAY=true
SAMMA_BUILD_CHANNEL=dev
SAMMA_BUILD_BRANCH=dev
SAMMA_BUILD_SHA=<exact new dev SHA>

Use proportional validation only:

- production build
- typecheck only if needed
- focused onboarding smoke if convenient

No full 60+ suite rerun.

==================================================
STEP 4 — DEPLOY DEV ONLY
==================================================

Deploy new dev build to:

https://dev.samma.co.za

Do not change:

https://samma.co.za

Do not redeploy main/RC.

Do not change port 2022 experiment runtime unless needed later.

Do not change Keycloak issuer.

Use existing dev callback already configured for:

https://dev.samma.co.za/api/auth/callback/keycloak

==================================================
STEP 5 — REAL FLOW SMOKE TEST
==================================================

Check the actual browser journey at dev.samma.co.za.

PERSON FLOW

1. Open dev.samma.co.za
2. Choose Person
3. Keycloak login
4. callback returns to dev.samma.co.za
5. lands in Personal Info Center

Confirm:

- Account resolves
- Person resolves
- no company is created
- no company membership is created
- no OWNER grant is created

COMPANY FLOW

Use a disposable real DEV identity if needed.

1. Open dev.samma.co.za
2. Choose Company
3. Keycloak login
4. company-name setup
5. submit company
6. land in Company Info Center

Confirm:

- Company created
- active CompanyMember created
- OWNER granted
- no Governance capability
- no implicit HR/Payroll/Legal role

==================================================
STEP 6 — UI CHECK
==================================================

Only quick visual checks:

- Person / Company choice visible
- dev overlay shows:

DEV
dev
<short SHA>

- no layout break on desktop
- one mobile check if easy

No full responsive suite.

==================================================
STEP 7 — HEALTH
==================================================

Verify:

https://dev.samma.co.za
→ 200

https://dev.samma.co.za/api/health
→ 200

https://dev.samma.co.za/api/ready
→ 200

Confirm:

storage = s3
database ready
storage ready

==================================================
STEP 8 — RC SAFETY
==================================================

Confirm:

https://samma.co.za
→ unchanged
→ still main/RC build

No main branch change.

No RC deploy.

==================================================
STEP 9 — STOP FOR PHIL
==================================================

After real Person and Company flows pass on dev.samma.co.za:

STOP.

Do not promote dev to main.

Wait for Phil to visually/functionally approve dev.

==================================================
FINAL REPORT
==================================================

STATUS: PASS / BLOCKED

DEV
- new SHA
- origin/dev
- deployed SHA
- overlay text

PERSON FLOW
- login
- Person
- no Company
- destination

COMPANY FLOW
- login
- Company
- CompanyMember
- OWNER
- no Governance
- no implicit functional roles
- destination

HEALTH
- homepage
- health
- readiness

RC
- samma.co.za unchanged: YES/NO

VALIDATION
- proportional checks only
- full suite rerun: NO

MAIN
- unchanged: YES