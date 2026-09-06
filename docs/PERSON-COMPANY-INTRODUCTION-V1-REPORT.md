# Person ↔ Company introduction V1 — DEV acceptance

2026-09-07. **STATUS: PASS. Stopped for Phil approval; no main promotion.**

| Area | Result |
| --- | --- |
| Migration | `0005_employment_invitations` adds only EmploymentInvitation. Reviewed SQL, validated DEV pg_dump archive, applied migration, migration status PASS, live schema zero-diff PASS. No PersonCompanyRelationship columns changed. |
| Company | Current `company.members.manage` capability, active membership and active company required. OWNER path, People → Add person → Send invite, pending state and Revoke PASS. |
| Person | Verified recipient inbox, Accept and Decline PASS. Unknown email creates no Account/Person; normal later registration makes its invitation visible. |
| Mail | Provider-neutral MailProvider/SMTP implementation; app delivery into Mailpit PASS. SMTP remains unpublished. DEV web joins the existing Mailpit inbox network. |
| Relationships | ACTIVE reused, PENDING activated, FORMER/ENDED preserved with new ACTIVE rehire; atomic audit and idempotent/concurrent acceptance PASS. No CompanyMember or role creation during invitation/acceptance. |
| Security | Stable Account binding plus verified normalized email, expiry and resolution checks, current inviter capability, tenant isolation, role/membership revocation, wrong-user denial, hash-only storage and session-bound CSRF PASS. |
| Auth | Application authentication/onboarding and Keycloak configuration changed: NO. Synthetic test people used normal registration, Mailpit verification and sign-in. |
| Validation | 17/17 focused PostgreSQL tests; Prisma generate/validate; affected typecheck/lint; exact-SHA production build PASS. Dependency audit gate PASS with the existing documented DEV-only Prisma exception; no new findings. Full suite rerun: NO. |
| DEV | Application commits `1d8958e` and `4e138dd`; deployed SHA `4e138dd5509e5f0631e2f157ac70933f9c6b67fb`. Public/loopback health and public readiness PASS; compiled overlay DEV / dev / 4e138dd. |
| Main | Local/remote main remains `6619d19cddfd0767f280204b541c2f5823f23dce`. RC and experiment container IDs/start times unchanged; their health/readiness PASS. |

Actual HTTPS Chromium acceptance completed using only manifest-bound synthetic
people. The existing Person accepted first; the unknown address was confirmed to
have no Account before its normal Person registration, Mailpit verification,
ordinary sign-in and acceptance. Database checks confirmed exactly one ACTIVE
EMPLOYMENT relationship per person and zero CompanyMember rows for each. The
company retained only its original owner membership. Decline/revoke preserved
history and did not affect accepted relationships. Live wrong-recipient
Accept/Decline, missing/invalid CSRF, foreign/missing Origin, forged company and
extra role-field requests were denied. Screenshots at 1440 and 390 pixels were
inspected; People, pending invitations and active company views fit correctly.

The browser helper initially captured companyId before client navigation settled;
its URL wait is corrected in the follow-up validation commit. Acceptance resumed
from existing synthetic state without altering application/auth code or rewriting
completed invitations. This is browser-driven live acceptance, not a claim of
Phil's personal approval. The follow-up changes validation/documentation only;
the deployed application artifact remains the exact application commit above.

Private evidence:

- `/srv/nuc-archive/juanity/backups/employment-introductions-20260907/`:
  `dev-pre-migration.dump` and its inspected archive list, earlier checkpoint,
  migration/zero-diff log, 17-test log, final lint/typecheck log, production build
  log, original runtime config/container identities and post-deploy health.
- `/etc/samma-dev/employment-introductions/`: protected synthetic manifest,
  acceptance result, browser screenshots and staged acceptance diagnostics.

The NUC database is shared: it received one additive metadata table. RC/preview
source and runtimes were unchanged. The on-host dump is a focused DEV checkpoint,
not a production/off-host backup. The isolated disposable test database has its
own guarded name and contains only synthetic fixtures.

Mail failure intentionally leaves an inbox invitation with a delivery warning;
this small V1 has no durable email retry queue. The email uses `/person`, with no
optional bearer-token URL. Raw random bytes are immediately SHA-256 hashed and
discarded. No raw token, email payload or session details enter invitation audit.
