SAMMA — DEV RUNTIME AT dev.samma.co.za

GOAL

Create a dedicated DEV runtime for the current dev branch at:

https://dev.samma.co.za

Locked runtime map:

experiment/*
→ http://192.168.1.152:2022
→ preview only

dev
→ https://dev.samma.co.za
→ full real DEV integration

main
→ https://samma.co.za
→ RC

Do not mix these.

==================================================
CURRENT STATE
==================================================

Repository:

/opt/Juanita-Labour-Law

Current dev branch should be the integrated dev branch after the overlay merge.

Main remains RC and must stay untouched.

Port 2022 remains experiment-only.

==================================================
1. PREFLIGHT — FOCUSED ONLY
==================================================

Verify:

- current dev branch SHA
- origin/dev matches
- working tree clean
- dev.samma.co.za DNS resolves to the NUC public IP
- chosen internal dev web port is free
- current Keycloak client/callback config
- current Caddy network
- current samma.co.za remains healthy

Do not run broad regression suites.

==================================================
2. DEV WEB RUNTIME
==================================================

Run a separate web container/service for dev.

Suggested:

samma-dev-web

Bind internally/host as needed, but keep it separate from the RC web container.

Suggested host bind:

127.0.0.1:2023

Do not reuse 2020.
Do not reuse 2022.

The dev runtime may reuse the existing DEV PostgreSQL, Garage and Keycloak because this whole host is still synthetic DEV, but it must run the exact dev branch build.

Inject build metadata:

SAMMA_SHOW_BUILD_OVERLAY=true
SAMMA_BUILD_CHANNEL=dev
SAMMA_BUILD_BRANCH=dev
SAMMA_BUILD_SHA=<exact dev SHA>

Overlay must show:

DEV
dev
<short SHA>

==================================================
3. DEV BASE URL
==================================================

Set the dev runtime canonical URL to:

https://dev.samma.co.za

Do not use samma.co.za for dev session/callback state.

==================================================
4. KEYCLOAK CALLBACK
==================================================

Add an explicit DEV callback for the existing SAMMA client:

https://dev.samma.co.za/api/auth/callback/keycloak

Also allow the correct DEV post-logout redirect:

https://dev.samma.co.za/

Do not use wildcards.

Keep existing RC callback intact:

https://samma.co.za/api/auth/callback/keycloak

Do not weaken issuer/client security.

==================================================
5. CADDY
==================================================

Add a dedicated Caddy route:

dev.samma.co.za
→ samma-dev-web:3000

Use the existing proxy network.

Do not point dev.samma.co.za at the RC web container.

Back up and validate the Caddy config before reload.

Do not modify unrelated site routes.

==================================================
6. SESSION ISOLATION
==================================================

Ensure DEV cookies/sessions are safe for dev.samma.co.za and do not accidentally collide with samma.co.za.

Because current session cookie is host-only, this should naturally isolate by hostname, but verify.

Do not introduce cross-subdomain session sharing.

==================================================
7. BUILD / START
==================================================

Build exact dev SHA.

Use proportional validation only:

- typecheck if required
- production build
- startup smoke

Do not rerun the full 60+ test suite unless the build fails or auth config changes require a focused check.

Start only the dev web runtime.

Do not restart RC web unless absolutely necessary.

==================================================
8. SMOKE TEST
==================================================

Verify:

https://dev.samma.co.za
→ 200

https://dev.samma.co.za/api/health
→ 200

https://dev.samma.co.za/api/ready
→ 200

Overlay shows:

DEV
dev
<short SHA>

Then perform one real DEV login:

dev.samma.co.za
→ Keycloak
→ callback to dev.samma.co.za
→ authenticated Person page

Logout should return to dev.samma.co.za.

==================================================
9. RC / EXPERIMENT SAFETY
==================================================

Confirm:

https://samma.co.za
→ unchanged
→ RC/main build still running

http://192.168.1.152:2022
→ unchanged
→ experiment-only

No experiment branch should be deployed to dev.samma.co.za.

==================================================
10. DOCUMENT RUNTIME MAP
==================================================

Update branch/runtime docs:

experiment/*
→ 192.168.1.152:2022

dev
→ dev.samma.co.za

main
→ samma.co.za

Keep this rule concise and explicit.

Commit docs/runtime scaffold on dev only.

Do not merge dev to main.

==================================================
FINAL REPORT
==================================================

STATUS: PASS / BLOCKED

DEV
- branch
- SHA
- container
- internal port
- public URL
- overlay text

AUTH
- callback
- login
- logout
- session isolation

RC
- samma.co.za SHA
- unchanged: YES/NO

EXPERIMENT
- port 2022 unchanged: YES/NO

CADDY
- route
- validation
- reload result

VALIDATION
- focused only
- full suite rerun: NO

GIT
- dev commit
- origin/dev
- main untouched