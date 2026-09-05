# 2026-09-05 — Real Authentication V1

## Owner request (verbatim)

SAMMA — REAL AUTHENTICATION V1

GOAL

Replace the current synthetic public sign-in flow with real authentication for:

https://samma.co.za

Use an OIDC-compatible identity provider.

Preferred provider for this deployment:

Keycloak

SAMMA must NOT implement its own password hashing, password recovery or session cryptography.

MFA support must remain possible in the architecture, but MFA enforcement is DISABLED for this initial DEV deployment.

==================================================
BASELINE
==================================================

Repository:

/opt/Juanita-Labour-Law

Remote:

Soundtrek/document-law

Current public baseline:

1c9fce19fda9b37fc89ed6e178653d813feab4bc

Current public landing page:

https://samma.co.za

Current architecture:

Account
+
AccountIdentity
+
Person

Authentication answers who the person is.

Authorisation remains inside SAMMA.

Do not alter:

Person ↔ PersonCompanyRelationship ↔ Company

or existing document/access-control architecture.

==================================================
1. FIRST INSPECT
==================================================

Before changing anything inspect:

- current Account model
- AccountIdentity model
- Person linkage
- Prisma schema
- existing synthetic identity adapter
- sign-in route
- middleware/session handling
- Governance capability model
- Docker/Compose deployment
- Caddy networking
- current environment configuration
- existing migrations

Determine the smallest clean OIDC integration.

Do not start coding before understanding the current identity boundary.

==================================================
2. IDENTITY PROVIDER
==================================================

Use Keycloak as the real authentication provider.

Keycloak owns:

- passwords
- password validation
- password reset/recovery
- login sessions
- email verification state
- future MFA
- future social/federated identities

SAMMA owns:

- stable Account ID
- AccountIdentity linkage
- Person
- Company relationships
- Governance roles/capabilities
- Legal Access
- document permissions

Do not encode SAMMA authorisation into Keycloak roles as the primary source of truth.

==================================================
3. KEYCLOAK DEPLOYMENT
==================================================

Add Keycloak as a dedicated SAMMA authentication service.

Keep deployment conservative.

Do not add unrelated services.

Keycloak must:

- use persistent storage;
- not expose its database publicly;
- be reachable by SAMMA;
- have a public OIDC route that works through HTTPS;
- use secure production-style cookies at samma.co.za;
- have stable issuer/client configuration.

Prefer a dedicated hostname such as:

auth.samma.co.za

if DNS can be added safely.

If the current DNS/environment makes that unsuitable, stop and report rather than inventing an insecure arrangement.

Do not disturb existing NUC services.

==================================================
4. OIDC CLIENT
==================================================

Configure SAMMA as an OIDC client.

Use:

Authorization Code flow
+
PKCE where supported

Use secure server-side session handling.

Required identity claims:

- provider subject
- verified email
- email verification status

Do not trust only the email address as the permanent identity.

Map:

Keycloak subject
->
AccountIdentity.provider_subject
->
stable SAMMA Account

==================================================
5. ACCOUNT LINKING
==================================================

On first successful verified login:

1. obtain OIDC subject + verified email;
2. find existing AccountIdentity for provider + subject;
3. if found, use linked Account;
4. otherwise resolve approved onboarding/invitation/bootstrap flow;
5. create AccountIdentity link;
6. preserve stable Account ID.

Do NOT silently merge arbitrary accounts only because emails match.

Bootstrap accounts defined below are a controlled exception because their identities are explicitly created before public onboarding.

==================================================
6. INITIAL GOVERNANCE OWNERS
==================================================

Bootstrap exactly two initial SAMMA Governance owners:

phil@samma.co.za

juanita@samma.co.za

Treat these as:

Platform Owner / Governance Owner

with the approved full SAMMA Governance capability set.

Do not introduce a general-purpose SUPERADMIN bypass.

Capabilities should remain explicit and server-authorised.

These two accounts may hold all current Governance capabilities because this is the initial small operating team.

Their Governance access must still flow through the normal capability system.

==================================================
7. MFA
==================================================

MFA capability must remain supported by Keycloak and SAMMA's authentication model.

However:

MFA REQUIRED = false

for this initial deployment.

Do not remove MFA-related architecture merely because enforcement is disabled.

Document clearly:

MFA IS TEMPORARILY DISABLED FOR DEV/INITIAL SETUP.

Before real sensitive client data is introduced, Governance MFA must be enabled.

==================================================
8. EMAIL VERIFICATION
==================================================

Real accounts must support verified email.

Do not allow unverified users into sensitive SAMMA application areas.

For the two bootstrap Governance owners:

either:

A. provision them as verified administrative bootstrap identities through an explicit controlled setup;

or

B. complete a normal verification flow if SMTP is already safely available.

Do not fake email verification.

If outbound email is not yet configured, controlled bootstrap verification for these two explicitly approved addresses is acceptable for DEV.

Record that exception in audit/bootstrap documentation.

==================================================
9. TEMPORARY BOOTSTRAP CREDENTIAL FILE
==================================================

Create:

/etc/samma-dev/bootstrap-credentials.txt

This file is OUTSIDE Git.

Ownership:

philip:philip

Permissions:

0600

Never commit it.

Never copy it into an image.

Never mount it into the SAMMA web container.

Never print its contents into logs.

Never include its passwords in command history.

Template:

SAMMA INITIAL GOVERNANCE ACCOUNTS

Phil
Email: phil@samma.co.za
Temporary password:
Password manager item:
First login completed:
Password changed:
Recovery information stored:

Juanita
Email: juanita@samma.co.za
Temporary password:
Password manager item:
First login completed:
Password changed:
Recovery information stored:

IMPORTANT
Temporary bootstrap file only.
Delete after both initial accounts have changed their passwords and credentials are safely stored in the password manager.

Do NOT generate passwords automatically into terminal output.

Phil will manually add the temporary passwords.

Pause account provisioning if passwords are required and the placeholders remain empty.

==================================================
10. PASSWORD RULE
==================================================

SAMMA application code must never see, store or log plaintext passwords.

Passwords are passed only to Keycloak through its intended provisioning/login mechanisms.

Prefer temporary passwords requiring replacement at first login.

After successful first login:

- require password change;
- confirm new password is managed by Keycloak;
- update the checklist;
- delete the temporary bootstrap credentials file once both accounts are complete.

Do not store final passwords anywhere in SAMMA PostgreSQL.

==================================================
11. PUBLIC LOGIN FLOW
==================================================

Current:

/
-> email input
-> development sign-in

Replace with:

/
-> email entry
-> real authentication initiation
-> Keycloak
-> OIDC callback
-> SAMMA session
-> authorised destination

Keep the simple SAMMA landing UI.

Do not turn the homepage into a Keycloak-looking interface.

Where possible, preserve the entered email as a login hint.

==================================================
12. LOGOUT
==================================================

Implement real logout.

Logout must clear:

- SAMMA application session
- relevant OIDC session according to intended provider behaviour

After logout the user must not be able to revisit protected pages using the old SAMMA session.

==================================================
13. ROUTE PROTECTION
==================================================

Protect server-side:

/person
/company
/company/*
/legal-access
/governance
/records/*

Unauthenticated access redirects to the authentication entry.

Authentication alone is NOT enough for Governance.

Every Governance request must check the SAMMA Governance capability model.

Do not rely on hidden navigation.

==================================================
14. DEVELOPMENT IDENTITY
==================================================

Do not delete synthetic identity support if it remains useful for tests.

But it must no longer be reachable accidentally through the public deployment.

Public runtime must have development identity disabled.

Tests may retain explicit synthetic adapters/fixtures.

==================================================
15. DATABASE
==================================================

Create migrations only where needed for real authentication/session/account linkage.

Do not redesign unrelated tables.

Preserve existing data.

Review generated migration SQL before applying.

Back up/checkpoint the DEV database before migration.

==================================================
16. SECURITY
==================================================

Add reasonable initial controls:

- secure HttpOnly session cookies
- SameSite protection
- HTTPS-only cookies publicly
- CSRF protection appropriate to the chosen framework
- safe redirect allow-list
- no open redirects
- login rate limiting where appropriate
- generic authentication errors
- session expiration
- session revocation capability
- audit login/logout/bootstrap Governance events

Do not expose provider secrets to browser JavaScript.

==================================================
17. DOCUMENTATION
==================================================

Update:

AUTHENTICATION-AND-GOVERNANCE.md
deployment documentation
environment example
decision log

Document:

- Keycloak selected as current OIDC provider;
- SAMMA remains identity/domain authority through Account + AccountIdentity;
- MFA capability retained;
- MFA enforcement temporarily disabled;
- two initial Governance Owners;
- bootstrap credential procedure;
- requirement to enable MFA before real sensitive data.

Do not put actual credentials in documentation.

==================================================
18. VALIDATION
==================================================

Before deployment verify:

- migrations
- Prisma validation
- tests
- typecheck
- lint
- production build

Then test:

Unauthenticated:
- /
- protected-route redirects

Phil:
- login succeeds
- Account exists
- AccountIdentity exists
- Person/account projection works
- Governance accessible

Juanita:
- same checks
- Governance accessible

Normal non-Governance test user:
- authenticates
- Governance denied

Logout:
- old session rejected

Unverified account:
- sensitive access denied

Restart:
- Keycloak identities survive
- SAMMA account linkage survives
- sessions behave as designed

MFA:
- confirm support exists
- confirm enforcement currently disabled

==================================================
19. DEPLOYMENT SAFETY
==================================================

Do not interfere with unrelated NUC containers.

Do not expose PostgreSQL.

Do not destroy the current SAMMA database.

Do not remove the current public landing page.

Do not use real employment/legal documents during validation.

==================================================
20. STOP CONDITIONS
==================================================

Stop rather than improvise if:

- juanita@samma.co.za is not the intended second address;
- Keycloak persistence cannot be made safe;
- OIDC issuer cannot be securely exposed;
- migration changes unrelated domain data;
- Governance requires a universal bypass;
- credentials would need to be committed/logged;
- public runtime would still permit synthetic identity access.

==================================================
FINAL REPORT
==================================================

STATUS: PASS / PARTIAL / BLOCKED

AUTH PROVIDER
- Keycloak version
- hostname
- issuer
- client
- persistence

SAMMA
- Account linkage
- AccountIdentity linkage
- session mechanism
- protected routes

BOOTSTRAP OWNERS
- phil@samma.co.za status
- juanita@samma.co.za status
- Governance role/capabilities
- temporary password-change requirement

MFA
- capability
- enforcement status

DATABASE
- migration
- backup/checkpoint
- apply result

SECURITY
- cookie settings
- logout
- verification checks
- public synthetic identity disabled

VALIDATION
- tests
- typecheck
- lint
- build
- login tests
- Governance positive/negative tests

DEPLOYMENT
- commit
- image/container changes
- public URLs

SECRETS
- confirm no passwords/secrets committed
- bootstrap file path/permissions
- whether it is still present or has been deleted

UNTOUCHED
- document engine
- company relationship model
- legal-access model
- unrelated NUC services

## Inspection result

BLOCKED before implementation: both authoritative DNS servers return NXDOMAIN for auth.samma.co.za. No connected DNS management tool is available. Follow the owner’s explicit secure-issuer/DNS stop condition. See docs/REAL-AUTHENTICATION-V1-PREFLIGHT.md.

The requested credential checklist was created outside Git at /etc/samma-dev/bootstrap-credentials.txt, owned by philip:philip with mode 0600. Password fields remain empty; no accounts were provisioned.
