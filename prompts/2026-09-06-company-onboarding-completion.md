SAMMA — DEV FIX: COMPANY ONBOARDING COMPLETION

GOAL

Fix two issues in the current DEV Company onboarding flow:

1. Company creation currently fails with a generic error for a valid company name such as "Soundtrek".
2. "Set up later" incorrectly allows a user who chose Company onboarding to fall through into the normal Person Info Center with no clear path back.

This is a focused correction on dev.

Do NOT redesign auth.
Do NOT touch main.
Do NOT rerun the full historical test suite.

==================================================
CURRENT DEV
==================================================

Runtime:

https://dev.samma.co.za

Current behaviour:

Company
→ register
→ verify email
→ password setup/login
→ /onboarding/company
→ enter company name
→ creation fails generically

Then:

Set up later
→ /person

This is not the intended flow.

==================================================
FIX 1 — FIND AND FIX COMPANY CREATION FAILURE
==================================================

Inspect the actual server-side failure when submitting:

Soundtrek

Do not guess.

Check:

- Company creation action/service
- CompanyMember creation
- OWNER role lookup/assignment
- transaction
- audit write
- duplicate/uniqueness handling
- any DEV configuration dependency
- current deployed role catalogue
- logs/error boundary

Identify the exact failing step.

Fix the smallest real cause.

Requirements:

- valid company name should create successfully
- Company + ACTIVE CompanyMember + OWNER must be created atomically
- no Governance capability
- no implicit HR/Payroll/Legal/Clerk/Billing roles
- repeat submit must not duplicate
- failure must not leave partial Company/member/role state

Improve the user-facing error only enough to distinguish:

- validation problem
- already-created/already-completed state
- unexpected server failure

Do not expose stack traces/internal IDs.

==================================================
FIX 2 — REMOVE "SET UP LATER"
==================================================

For users who selected Company onboarding:

remove the "Set up later" escape.

Company onboarding is not complete until the Company workspace is created.

Correct flow:

Choose Company
→ register
→ verify
→ authenticate
→ /onboarding/company
→ create Company
→ Company Info Center

If company creation fails:

remain on /onboarding/company

Do NOT redirect to /person.

==================================================
PRESERVE COMPANY ONBOARDING INTENT
==================================================

Ensure the Company onboarding intent remains active until one of these happens:

A. Company creation succeeds
→ clear onboarding state
→ go to Company Info Center

B. User explicitly signs out
→ session ends
→ onboarding can be resumed on next appropriate login according to existing short-lived state model

Do not permanently classify the Account as COMPANY.

Do not add a permanent account-type field.

Do not create Company on login automatically.

==================================================
EXISTING PERSON MODEL
==================================================

Keep:

Account
→ Person

for every human identity.

A Company-onboarding user still has a Person underneath.

But while Company onboarding is incomplete:

do not present /person as successful completion of that onboarding journey.

==================================================
FOCUSED VALIDATION ONLY
==================================================

Use proportional checks.

Test only:

1. Company onboarding with valid name:
   Soundtrek
   → PASS

2. Result:
   - one Company
   - one ACTIVE CompanyMember
   - one OWNER grant
   - no Governance
   - no implicit functional roles

3. Repeat submit:
   - no duplicate company
   - no duplicate membership
   - no duplicate OWNER grant

4. Forced failure:
   - stays on /onboarding/company
   - no partial state

5. "Set up later":
   - no longer present

6. Person onboarding:
   - unchanged

7. Existing Phil account:
   - unchanged unless he explicitly completes Company onboarding

Run:

- targeted onboarding/company tests
- typecheck affected workspace
- lint affected files
- production build if needed for deployment

Do NOT rerun unrelated 60+ auth/storage/legal suites.

==================================================
DEPLOYMENT
==================================================

Commit fix on dev or a tiny experiment branch according to current branch policy.

Preferred:

experiment/fix-company-onboarding-completion
→ validate
→ merge to dev
→ deploy dev.samma.co.za

Do not touch main.

==================================================
DEV ACCEPTANCE
==================================================

After deployment verify manually:

https://dev.samma.co.za

Company journey:

Company
→ real login
→ /onboarding/company
→ enter Soundtrek
→ Create company workspace
→ Company Info Center

Confirm no "Set up later" link.

STOP after DEV pass for Phil.

==================================================
FINAL REPORT
==================================================

STATUS: PASS / BLOCKED

ROOT CAUSE
- exact failure reason

FIX 1
- company creation result
- transaction result
- duplicate protection

FIX 2
- Set up later removed
- incomplete Company onboarding no longer falls to /person

SECURITY
- OWNER only
- Governance: NO
- HR/Payroll/Legal/Clerk/Billing: NO

VALIDATION
- targeted checks only
- full suite rerun: NO

DEV
- commit/SHA
- deployed SHA
- dev.samma.co.za result

MAIN
- unchanged: YES