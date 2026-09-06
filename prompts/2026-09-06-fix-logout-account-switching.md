# Fix logout and account switching

SAMMA — FIX LOGOUT + ACCOUNT SWITCHING

GOAL

Make SAMMA logout fully terminate both:

1. the SAMMA application session
2. the Keycloak SSO session

so Phil can switch between test accounts in the same browser without clearing cookies or using Incognito.

Current problem:

After signing out of SAMMA, Keycloak still considers a previous user authenticated and can show:

"You are already authenticated as different user ... in this session. Please sign out first."

This blocks normal account switching during onboarding tests.

==================================================
SCOPE
==================================================

Fix only:

- SAMMA logout
- Keycloak logout completion
- account switching behaviour

Do NOT redesign authentication.
Do NOT change registration.
Do NOT change onboarding logic.
Do NOT touch main.
Do NOT run the full suite.

==================================================
EXPECTED FLOW
==================================================

Sign out from dev.samma.co.za
        ↓
SAMMA session deleted
        ↓
Keycloak SSO session terminated
        ↓
return to dev.samma.co.za
        ↓
next Sign in shows fresh login choice
        ↓
user may sign in with a different account

Example:

company1@samma.co.za
→ Sign out
→ person1@samma.co.za

must work in the same Chrome profile.

==================================================
FIRST — FIND ROOT CAUSE
==================================================

Inspect:

- current Auth.js signOut flow
- local session deletion
- Keycloak end-session endpoint
- post_logout_redirect_uri
- whether id_token_hint is available/required
- whether SAMMA stores or discards ID token
- Keycloak logout confirmation behaviour
- current callback/client config
- current dev/main host-specific logout redirects
- current cookie deletion

Determine why Keycloak SSO survives SAMMA logout.

Do not guess.

==================================================
FIX
==================================================

Use Keycloak's intended OIDC logout behaviour.

Preferred outcome:

- local SAMMA session revoked
- Keycloak session terminated
- no confirmation page if safe/configurably avoidable
- redirect back to the correct SAMMA host

For DEV:

https://dev.samma.co.za/

For current NUC RC:

https://samma.co.za/

Do not use wildcard redirects.

Do not weaken CSRF protection.

==================================================
LOGIN ACCOUNT SWITCHING
==================================================

If Keycloak may still reuse an existing SSO session when a user explicitly chooses to sign in as another account, add the minimum safe login parameter such as an appropriate prompt/login hint behaviour if supported.

Preferred UX:

Sign in
→ fresh credential screen when the previous SAMMA+Keycloak logout completed

Do not force reauthentication on every normal navigation.

Do not break SSO unnecessarily.

==================================================
SESSION SECURITY
==================================================

Confirm:

- old SAMMA session cookie cannot reopen protected pages
- old Keycloak SSO session is gone after logout
- account A cannot leak into account B session
- dev and samma.co.za host-only SAMMA cookies remain isolated

Do not introduce parent-domain cookies.

==================================================
FOCUSED TESTS ONLY
==================================================

Test:

1. Login as company1@samma.co.za
2. Sign out
3. Confirm local SAMMA session gone
4. Confirm Keycloak SSO session gone
5. Sign in as person1@samma.co.za in same browser
6. Confirm success
7. Sign out
8. Sign back in as company1@samma.co.za
9. Confirm success

Also test:

- back button after logout does not reopen protected content
- old SAMMA cookie replay denied
- logout CSRF remains enforced

No full auth suite.
No storage tests.
No Legal Access tests.
No unrelated Governance tests.

==================================================
BRANCH
==================================================

Create:

experiment/fix-logout-account-switching

from current dev.

After focused validation:

merge to dev
deploy dev.samma.co.za

Do not touch main.

==================================================
VALIDATION
==================================================

Run only:

- targeted logout/session tests
- affected typecheck/lint if needed
- production build if application code changes

Full suite rerun:
NO

==================================================
LIVE ACCEPTANCE
==================================================

On dev.samma.co.za, Phil must be able to switch between two real DEV accounts in the same Chrome browser using only:

Sign out
→ Sign in

No cookie clearing.
No incognito.
No browser restart.

==================================================
FINAL REPORT
==================================================

STATUS: PASS / BLOCKED

ROOT CAUSE
- why Keycloak SSO survived logout

FIX
- local session handling
- Keycloak logout handling
- redirect behaviour

ACCOUNT SWITCHING
- account A → logout → account B
- account B → logout → account A

SECURITY
- old SAMMA session denied
- old Keycloak session gone
- CSRF preserved
- dev/RC cookie isolation preserved

VALIDATION
- targeted only
- full suite rerun: NO

DEV
- commit
- deployed SHA
- overlay

MAIN
- unchanged