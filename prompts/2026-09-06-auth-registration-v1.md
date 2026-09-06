SAMMA — COMPLETE AUTH + REGISTRATION V1

GOAL

Finish SAMMA authentication/onboarding so new Person and Company users can self-register properly and we do not need another auth redesign later.

Current runtime map:

experiment/*
→ http://192.168.1.152:2022

dev
→ https://dev.samma.co.za

main
→ https://samma.co.za

Work from dev using:

experiment/auth-registration-v1

Do NOT work directly on dev or main.

==================================================
TARGET AUTH MODEL
==================================================

KEYCLOAK OWNS:

- account registration
- passwords
- password policy
- email verification
- forgot-password / recovery
- sessions
- future MFA
- future social/federated login

SAMMA OWNS:

- stable Account
- AccountIdentity
- Person
- Company
- CompanyMember
- PersonCompanyRelationship
- Governance
- Legal Access
- record/document permissions

Do not move password handling into SAMMA.

==================================================
AUTH V1 ACCEPTANCE TARGET
==================================================

A. NEW PERSON

Create account
→ choose Person
→ Keycloak registration
→ verification email
→ verify
→ callback to SAMMA
→ Account + AccountIdentity + Person
→ /person

B. NEW COMPANY

Create account
→ choose Company
→ Keycloak registration
→ verification email
→ verify
→ callback to SAMMA
→ Account + AccountIdentity + Person
→ company-name setup
→ Company + ACTIVE CompanyMember + OWNER
→ /company

C. EXISTING USER

Sign in
→ Keycloak
→ existing stable SAMMA identity
→ normal destination

D. PASSWORD RECOVERY

Forgot password
→ Keycloak email
→ reset password
→ sign in successfully

E. MFA

Supported by provider
NOT enforced yet

==================================================
1. PREFLIGHT — COMPLETE BUT FOCUSED
==================================================

Inspect:

- current Keycloak realm settings
- registration setting
- verify-email setting
- reset-password setting
- current SMTP config
- current OIDC client callbacks for:
  dev.samma.co.za
  samma.co.za
- current onboarding state preservation
- existing Account/Identity onboarding logic
- existing-email collision rules
- current auth error handling
- current rate limits
- current owner bootstrap exceptions

Identify all required auth changes up front.

Do not stop at each small gap.

Only stop for a RED blocker such as:

- no safe SMTP credentials available
- provider cannot send mail securely
- self-registration would require unsafe account merging
- callback/origin model cannot safely support dev/main separation
- secrets would need to enter Git/browser

==================================================
2. SMTP
==================================================

Configure real SMTP for Keycloak authentication mail.

Use a dedicated SAMMA auth sender.

Preferred identity:

no-reply@samma.co.za

or another owner-approved sender address.

Do not invent a third-party mail provider if existing SMTP infrastructure is already available.

Inspect existing SAMMA/NUC mail infrastructure first.

If an existing SMTP account/service is suitable, use it.

If not, stop and report the exact missing SMTP requirement rather than faking verification.

Secrets must live outside Git under:

/etc/samma-dev/

mode 0600.

Do not print credentials.

==================================================
3. KEYCLOAK REALM SETTINGS
==================================================

Enable:

- self registration
- email as username / login by email
- verify email
- forgot password

Keep:

MFA support available
MFA enforcement OFF for DEV

Registration must not automatically grant any SAMMA company or Governance role.

==================================================
4. EMAIL VERIFICATION
==================================================

New public accounts must require verified email before SAMMA onboarding completes.

Flow:

register
→ verification message sent
→ user clicks verification link
→ Keycloak marks email verified
→ SAMMA accepts provider identity
→ onboarding continues

Do not use the old owner bootstrap verification exception for normal users.

Keep that exception historical for Phil/Juanita only.

==================================================
5. PASSWORD POLICY
==================================================

Configure a sensible Keycloak password policy.

Do not overcomplicate it.

At minimum:

- reasonable minimum length
- reject obviously weak/common passwords if supported
- no plaintext storage/logging
- recovery through Keycloak only

Do not put arbitrary password rules into SAMMA code.

==================================================
6. ONBOARDING PATH PRESERVATION
==================================================

Preserve:

PERSON
or
COMPANY

across:

registration
email verification
provider redirect
SAMMA callback

This state must be:

- integrity-protected
- short-lived
- limited to PERSON / COMPANY
- cleared after onboarding
- not a permanent Account type

Do not trust a raw query parameter from the browser as final authority.

==================================================
7. NEW ACCOUNT CREATION
==================================================

After verified provider login:

issuer + provider subject
→ AccountIdentity
→ Account
→ Person

For a brand-new verified subject:

create stable Account/Identity/Person once.

Repeat callbacks must be idempotent.

Do not merge by email alone.

==================================================
8. EXISTING EMAIL COLLISION
==================================================

If a new provider subject presents an email already owned by an existing SAMMA Account:

FAIL CLOSED.

Do not auto-merge.

Show a clear generic message:

"An account already exists for this email. Sign in using the linked login method or contact support."

Do not reveal unnecessary account details.

==================================================
9. PERSON ONBOARDING
==================================================

If onboarding choice = PERSON:

after verification/login:

→ /person

Do not create:

Company
CompanyMember
OWNER
PersonCompanyRelationship

==================================================
10. COMPANY ONBOARDING
==================================================

If onboarding choice = COMPANY:

after verification/login:

→ /onboarding/company

Collect only:

Company name

On submit:

transactionally create:

Company
ACTIVE CompanyMember
OWNER grant
audit

Then:

→ /company

Do not grant:

Governance
HR
PAYROLL
LEGAL
CLERK
BILLING

==================================================
11. EXISTING USER BEHAVIOUR
==================================================

Existing users selecting "Sign in" bypass registration.

Existing Phil/Juanita accounts must remain unchanged.

Phil remains:

Person
+
Governance Owner

unless he explicitly completes Company onboarding.

Do not reset or relink existing identities.

==================================================
12. PASSWORD RECOVERY
==================================================

Enable Keycloak forgot-password flow.

Validate:

- request recovery by email
- email delivered
- reset link works
- old password no longer works
- new password works
- SAMMA Account/Person remains same stable identity

Do not build a SAMMA password-reset form.

==================================================
13. EMAIL CONTENT
==================================================

Use simple SAMMA-branded Keycloak email templates if practical.

At minimum:

- SAMMA name
- clear verification/reset action
- no employment/legal document content
- no unnecessary sensitive data

Do not spend time on elaborate email design in this mission.

==================================================
14. DEV / MAIN CALLBACKS
==================================================

Keep exact allowed callbacks:

https://dev.samma.co.za/api/auth/callback/keycloak
https://samma.co.za/api/auth/callback/keycloak

Keep exact post-logout destinations for each.

Do not add:

http://192.168.1.152:2022

to real auth callbacks.

Port 2022 stays preview-only.

No wildcard redirects.

==================================================
15. SESSION / COOKIE ISOLATION
==================================================

Verify:

dev.samma.co.za session
does not authenticate samma.co.za

and vice versa.

Host-only cookies should preserve this.

Do not introduce parent-domain cookies.

==================================================
16. RATE LIMITING / ABUSE
==================================================

Keep existing login-initiation throttling.

Add reasonable registration/recovery abuse protection at Keycloak/provider level if not already present.

Do not build elaborate custom anti-abuse middleware unless needed.

==================================================
17. MFA
==================================================

Keep:

MFA_REQUIRED=false

for current DEV.

Do not remove MFA support.

Document again:

Enable and test Governance MFA before real sensitive data.

==================================================
18. OWNER BOOTSTRAP CLEANUP
==================================================

Do not disturb Phil/Juanita accounts.

If Phil's bootstrap checklist is complete and Juanita remains pending, leave it as-is.

Do not delete the bootstrap credential worksheet unless all existing completion conditions are genuinely satisfied.

Normal public users must no longer depend on this bootstrap process.

==================================================
19. AUTH ERRORS
==================================================

Handle cleanly:

- expired verification link
- already verified link
- invalid registration attempt
- duplicate email
- suspended account
- unverified login
- abandoned Company onboarding
- recovery link expired

Use user-friendly messages.

Do not leak internal provider errors or tokens.

==================================================
20. TEST MATRIX — TARGETED AUTH ONLY
==================================================

Do NOT run unrelated storage/record suites unless touched.

Test:

NEW PERSON
- register
- receive verification
- verify
- callback
- Account/Identity/Person
- no Company

NEW COMPANY
- register
- verify
- Account/Identity/Person
- company setup
- Company/member/OWNER

EXISTING USER
- login unchanged

DUPLICATE EMAIL
- no auto-merge

RECOVERY
- reset email
- reset password
- stable Account retained

UNVERIFIED
- SAMMA access denied

SESSION
- dev/main isolation
- logout

SECURITY
- no Governance grant
- no implicit functional roles
- no password/token leakage

==================================================
21. EMAIL DELIVERY VALIDATION
==================================================

Use disposable DEV accounts.

Confirm actual mailbox delivery for:

- verification
- password reset

Do not claim SMTP success from logs alone.

Do not include real passwords in evidence.

==================================================
22. BUILD / VALIDATION
==================================================

Use proportional validation.

Run:

- targeted auth tests
- typecheck
- lint affected area
- production build
- audit gate

Run migration checks only if schema changed.

Do not rerun unrelated 60+ suites merely because auth changed.

==================================================
23. EXPERIMENT DEPLOYMENT
==================================================

Port 2022 remains visual preview only.

For real registration/auth testing, use a temporary candidate hostname only if already supported, otherwise validate on dev after approved merge.

Do NOT weaken port-2022 auth security.

==================================================
24. MERGE GATE
==================================================

When experiment passes:

report to Phil.

Do not merge automatically unless explicitly instructed.

After approval:

experiment/auth-registration-v1
→ dev

Then deploy:

https://dev.samma.co.za

and run one real Person registration + one real Company registration.

==================================================
25. DOCUMENTATION
==================================================

Update:

AUTHENTICATION-AND-GOVERNANCE
REAL-AUTHENTICATION-V1
BRANCH-WORKFLOW if needed
DECISION-LOG
README

Record:

- public self-registration enabled
- verified email required
- Keycloak SMTP/recovery active
- Person/Company onboarding choice
- no permanent account-type flag
- existing-email collision fails closed
- MFA supported but temporarily disabled

No credentials in docs.

==================================================
FINAL REPORT
==================================================

STATUS: PASS / PARTIAL / BLOCKED

REGISTRATION
- enabled
- Person path
- Company path

SMTP
- provider/server
- sender
- verification delivery
- recovery delivery

KEYCLOAK
- registration
- verify email
- forgot password
- password policy
- MFA status

SAMMA
- Account
- AccountIdentity
- Person
- Company onboarding
- no email auto-merge

SECURITY
- no Governance grant
- no implicit roles
- session isolation
- callback allow-list
- no secrets leaked

VALIDATION
- targeted auth tests
- typecheck
- lint
- build
- audit

GIT
- experiment branch
- commit
- pushed
- dev unchanged
- main unchanged

FOLLOW-UP
- only MFA enforcement before sensitive production use
