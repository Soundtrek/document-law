SAMMA — MERGE AUTH REGISTRATION V1 TO DEV + FINAL DEV ACCEPTANCE

GOAL

Promote the already validated authentication/registration experiment into dev, deploy it to:

https://dev.samma.co.za

and complete the real browser acceptance tests.

This is a promotion/integration task.

Do NOT repeat the full validation suite that already passed on the experiment.

==================================================
BRANCH MODEL — LOCKED
==================================================

experiment/*
→ http://192.168.1.152:2022
→ experiment preview

dev
→ https://dev.samma.co.za
→ integrated DEV

main
→ https://samma.co.za
→ RC

Do not alter this mapping.

==================================================
CURRENT EXPERIMENT
==================================================

Branch:

experiment/auth-registration-v1

Validated commit:

44fd91a

Already validated:

- SMTP connection/TLS
- real verification email delivery
- real password-reset delivery
- password reset
- registration configuration
- email verification
- recovery
- request throttling
- password policy
- stable SAMMA identity
- Person/Company onboarding logic
- OWNER-only company creation
- email collision handling
- targeted auth tests
- typecheck
- lint
- production build
- audit gate

DO NOT repeat all of those checks simply because we are promoting the same code.

==================================================
1. FOCUSED PRECHECK
==================================================

Check only:

- dev working tree clean
- local dev == origin/dev
- experiment branch == origin experiment
- main/origin-main unchanged
- experiment contains expected 44fd91a work
- no unexpected commits/divergence

Fetch origin.

If there is a material merge conflict affecting authentication/onboarding semantics:

STOP.

Otherwise continue.

==================================================
2. MERGE TO DEV
==================================================

Merge:

experiment/auth-registration-v1
→ dev

Use normal branch policy.

Do not squash unless existing repository policy specifically requires it.

Push dev normally.

Never force dev.

Do not touch main.

Record exact resulting dev SHA.

==================================================
3. BUILD DEV
==================================================

Build exact new dev SHA.

Inject build metadata:

SAMMA_SHOW_BUILD_OVERLAY=true
SAMMA_BUILD_CHANNEL=dev
SAMMA_BUILD_BRANCH=dev
SAMMA_BUILD_SHA=<exact dev SHA>

Overlay must display:

DEV
dev
<short SHA>

Use the already established dev build/deployment procedure.

==================================================
4. PROPORTIONAL VALIDATION
==================================================

Do NOT run the full historical 60+ test suite again.

The experiment already passed its targeted validation.

At this promotion point run only what is necessary to establish that the merged DEV build is valid:

- merge/conflict sanity
- production build
- targeted auth tests only if merge changed relevant code
- no migration work unless the experiment actually contains a migration
- no storage regression suite
- no Legal Access regression suite
- no broad Governance regression suite

If the merge is clean and resulting auth code matches the validated experiment, do not manufacture additional validation work.

==================================================
5. DEPLOY DEV ONLY
==================================================

Deploy the exact new dev SHA to:

https://dev.samma.co.za

Do NOT deploy to:

https://samma.co.za

Do NOT promote dev to main.

Do not change the experiment runtime on port 2022 unless required for housekeeping.

==================================================
6. KEYCLOAK / SMTP
==================================================

Apply the already validated Keycloak DEV configuration required by Auth Registration V1.

Expected:

- self-registration enabled
- email verification required
- forgot password enabled
- approved password policy
- request throttling/brute-force controls
- MFA available but unenforced in DEV

SMTP:

sender:
no-reply@samma.co.za

server:
wp13.host-ww.net

port:
465

TLS:
verified

Credentials remain outside Git.

Do not print SMTP credentials.

Do not expose them to the SAMMA browser application.

==================================================
7. PERSON — REAL BROWSER ACCEPTANCE
==================================================

Use a fresh disposable DEV email/account.

At:

https://dev.samma.co.za

Perform:

Create account
→ Person
→ Keycloak registration
→ receive verification email
→ click verification link
→ authenticate
→ return to dev.samma.co.za
→ Personal Info Center

Confirm:

- Account exists
- AccountIdentity exists
- Person exists
- email verified
- no Company created
- no CompanyMember created
- no OWNER grant
- no Governance capabilities
- destination is Personal Info Center

Do not use synthetic identity.

==================================================
8. COMPANY — REAL BROWSER ACCEPTANCE
==================================================

Use a separate fresh disposable DEV email/account.

Perform:

Create account
→ Company
→ Keycloak registration
→ receive verification email
→ verify
→ authenticate
→ company setup

Create clearly synthetic company:

SAMMA Auth Test Company

Confirm:

Account
→ Person
→ Company
→ ACTIVE CompanyMember
→ OWNER

Confirm explicitly:

- Company created once
- CompanyMember active
- OWNER assigned
- no HR
- no PAYROLL
- no LEGAL
- no CLERK
- no BILLING
- no SAMMA Governance capabilities

Destination:

Company Info Center

==================================================
9. PASSWORD RECOVERY — REAL BROWSER ACCEPTANCE
==================================================

Using a disposable DEV identity:

Forgot password
→ submit email
→ receive real reset email
→ open reset link
→ choose new password
→ complete reset

Confirm:

- old password rejected
- new password accepted
- same SAMMA Account ID retained
- same Person retained
- no duplicate Account/Identity created

Do not record passwords in evidence.

==================================================
10. SESSION ISOLATION
==================================================

Verify:

authentication on:

dev.samma.co.za

does NOT authenticate:

samma.co.za

and vice versa.

No parent-domain authentication cookie.

Do not modify RC/main sessions.

==================================================
11. LOGOUT
==================================================

On DEV:

logout
→ SAMMA session cleared
→ Keycloak logout completes
→ returns to dev.samma.co.za

Old DEV session must not reopen protected content.

Focused check only.

==================================================
12. ONBOARDING PATH CHECK
==================================================

Confirm the selected onboarding journey survives:

registration
→ verification
→ authentication
→ SAMMA callback

PERSON must return to Person onboarding.

COMPANY must return to Company onboarding.

Do not permanently classify the Account as PERSON or COMPANY.

The choice controls onboarding only.

==================================================
13. EXISTING ACCOUNT CHECK
==================================================

Do one focused existing-user check.

Phil:

phil@samma.co.za

must remain the same existing:

Account
Person
Governance grants

Do NOT change Phil's password.

Do NOT create a Company for Phil during this test.

A private interactive Phil login is optional if existing stable identity can be safely verified without requiring it.

==================================================
14. HEALTH / OVERLAY
==================================================

Verify:

https://dev.samma.co.za
→ HTTP 200

https://dev.samma.co.za/api/health
→ HTTP 200

https://dev.samma.co.za/api/ready
→ HTTP 200

Confirm:

database ready
storage ready
storage provider = s3

Overlay:

DEV
dev
<new short SHA>

==================================================
15. RC SAFETY
==================================================

Verify:

https://samma.co.za
→ HTTP 200

RC/main deployment remains unchanged.

Record its existing deployed SHA.

Do not:

- rebuild RC
- restart RC unnecessarily
- modify main
- apply registration configuration specifically to RC if DEV/RC Keycloak configuration can remain separated

IMPORTANT:

If the current shared Keycloak realm means enabling self-registration/SMTP for DEV automatically changes authentication behaviour for samma.co.za as well:

DO NOT hide that fact.

Report the shared-provider effect explicitly.

Do not claim RC authentication is unchanged if realm-level settings affect both hosts.

Application/main code and deployment must still remain unchanged.

==================================================
16. CLEANUP
==================================================

After validation:

remove disposable DEV test identities and synthetic Auth Test Company only if cleanup can be safely scoped.

Do not remove evidence needed to confirm successful registration/recovery.

Do not touch:

- Phil
- Juanita
- existing stable Accounts
- existing persistent documents
- Garage objects unrelated to this test

==================================================
17. DOCUMENTATION
==================================================

Update current DEV/auth documentation with final acceptance result.

Record:

- public self-registration operational
- verified email operational
- password recovery operational
- SMTP sender
- Person onboarding operational
- Company onboarding operational
- MFA still unenforced in DEV
- branch/runtime mapping

Never document SMTP credentials or passwords.

Commit documentation to dev if needed.

Push dev normally.

Do not merge to main.

==================================================
STOP CONDITION
==================================================

After DEV acceptance passes:

STOP FOR PHIL.

Do not promote dev → main.

Do not deploy to samma.co.za.

==================================================
FINAL REPORT
==================================================

STATUS: PASS / PARTIAL / BLOCKED

DEV
- merged SHA
- final dev SHA
- origin/dev
- deployed SHA
- overlay

REGISTRATION

Person:
- registration
- verification delivery
- Account/Identity/Person
- no Company

Company:
- registration
- verification delivery
- Company
- CompanyMember
- OWNER
- no implicit functional roles
- no Governance

RECOVERY
- reset delivery
- old password rejection
- new password login
- stable Account

SMTP
- sender
- server
- TLS
- actual delivery result

SESSION
- DEV isolation from RC
- logout

KEYCLOAK
- registration
- verify email
- recovery
- MFA enforcement status
- shared DEV/RC realm effect, if any

HEALTH
- root
- health
- readiness

RC
- main SHA
- deployed SHA
- application unchanged: YES/NO
- any shared Keycloak realm behaviour change: explain

VALIDATION
- proportional checks only
- full suite rerun: NO

MAIN
- unchanged: YES

STOPPED FOR PHIL APPROVAL
