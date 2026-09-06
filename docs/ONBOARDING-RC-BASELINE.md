# SAMMA ONBOARDING RC BASELINE

Status: BLOCKED — shared-database schema zero-diff and mobile overlay validation fail.

## Requested baseline

- Accepted DEV source and fetched `origin/dev`: `40befbd4687da6af9517d20c2ee8161bfa6c89a0`.
- Previous/current local main and fetched `origin/main`: `0bc1660f03b8380aedcf24a44881f4196e5eb4de`.
- Current RC deployed revision: `0bc1660f03b8380aedcf24a44881f4196e5eb4de`.
- Current DEV deployed revision: `d9068af7896cdc24501599379d283af2012ad007`.
- DEV differs from its deployed application commit only in acceptance documentation and one browser-test navigation wait.
- Promotion would be a fast-forward of all 29 accepted DEV commits; no cherry-picks or history rewriting.
- No main merge, main push or runtime deployment occurred.

Both branch working trees were clean and both local branches matched fetched origin before validation. An isolated exact-source candidate and a separate clean main worktree were used; the running source, dependencies and build caches were not rebuilt.

## Blocking zero-diff result

Prisma generation, schema validation and live migration status pass. Live schema comparison exits **2**, proposing removal of `InvitationKind`, `CompanyInvitation` and its five foreign keys because they are absent from accepted DEV.

Read-only inspection found three existing invitation rows and an applied `0004_company_invitations` migration in addition to the four migrations tracked by accepted DEV. The invitation migration exists on `archive/overengineered-workflow-2026-09-05`. This agrees with the pre-existing drift documented in [the original onboarding report](ONBOARDING-PERSON-COMPANY-REPORT.md). The archive was inspected only; no rejected workflow code was imported.

The request requires successful promotion validation and preserving shared data. It explicitly retains the existing dependency exception, but supplies no schema-drift exception. Accordingly, the live schema was not reconciled, invitation rows were not deleted, migration history was not edited and promotion remains blocked. A migration-status success is not a zero-diff success.

## Mobile overlay finding

The exact accepted-source candidate reports compiled `RC / main / 40befbd`. The repository browser overlay harness passes at 1440px and 768px but fails at 390×844: before scrolling, the fixed badge overlaps the landing page’s `Sign in` link. The overlap is absent at the tested middle/bottom scroll positions. A focused live DEV check reproduces the same overlap with `DEV / dev / d9068af`, confirming it predates RC promotion. The badge retains `pointer-events: none`, so this is a visual overlap, not interception of clicks. No application/CSS fix was folded into the accepted promotion source. The candidate was served only on temporary loopback port 2034, without live identity, database or storage access. Its temporary runtime was removed after verification.

## Acceptance evidence

Existing accepted evidence covers Person registration, Mailpit verification and password recovery, stable Account/AccountIdentity/Person creation, Personal Info Center and no active company membership. Company acceptance covers explicit setup, Company, ACTIVE membership, OWNER only and Company Info Center. See [registration](AUTH-REGISTRATION-V1-REPORT.md), [mail](DEV-MAILPIT.md), [Company completion](COMPANY-ONBOARDING-COMPLETION-FIX.md) and [Company resume](COMPANY-REGISTRATION-RESUME-REPORT.md).

One focused live DEV sanity journey reused the existing manifest-bound synthetic Company resume acceptance identity. Actual HTTPS login reached its existing Company Info Center; anonymous and OWNER Governance access were denied; the session cookie was Secure, HttpOnly, Lax and host-only. Sign out returned directly home, and a new sign-in showed editable provider credentials, confirming the existing SSO had ended. No new users, companies, memberships or grants were created. Normal authentication/session and access-audit activity was produced. Prior real A/B/A switching evidence remains in [logout acceptance](LOGOUT-ACCOUNT-SWITCHING-REPORT.md).

The ad hoc smoke harness initially expected links where onboarding uses buttons and an explicit denial message where Governance intentionally returns 404. Those assertions were corrected to match the existing UI; the final journey passed without application changes.

Governance semantics remain: All includes every authorised directory Account; Person requires a Person and no ACTIVE membership; Company user requires at least one ACTIVE membership; Governance requires an unrevoked capability and can overlap either view. Directory permissions do not confer private-record access. No authorised live Governance reviewer session was available or manufactured; existing live-classification and isolated browser evidence are distinguished from a live reviewer login.

## Validation results

- `npm ci`: PASS, pinned Node 22.23.2 / npm 10.9.8, unchanged lockfile and dependency graph.
- Production dependency audit: PASS only with the exact approved Prisma DEV exception; no new high/critical findings and no expanded exception.
- Prisma generate / validate: PASS.
- Live migration status: PASS; four tracked migrations applied, plus the historical invitation migration in the database.
- Live schema zero-diff: FAIL, exit 2, as detailed above.
- Workspace typecheck: PASS.
- Workspace lint: PASS, no warnings.
- Exact accepted-source production build: PASS; candidate health reports compiled `rc / main / 40befbd4687da6af9517d20c2ee8161bfa6c89a0`. This is an isolated candidate, not a promoted or deployed main release.
- Full `npm test`: PASS, 79 tests, zero failures; run once against a fresh, separate `samma_directory_test` database.
- Onboarding bootstrap and identity/access integration: PASS, including person/tenant isolation, stable identity, no email linking, membership/role revocation, Legal Access scope and Governance not bypassing record access.
- Company completion service: PASS, including atomic creation, OWNER-only policy, rollback, expiry, cross-identity denial and concurrent/repeated submissions.
- Current Company resume and logout integration harnesses: PASS, including protected fresh Company intent, Person regression, no automatic company creation, state/CSRF/origin negatives, session-bound ID hints, revocation/replay and legacy logout fallback.
- Supplemental registration and Company-intent harnesses initially failed because they still expected the superseded local `/auth/logout` redirect. Two assertion-only corrections on the evidence branch now check the accepted provider logout endpoint, client ID, canonical post-logout destination and ID-token hint. Both corrected harnesses PASS. Their application imports and dependencies came from the exact accepted candidate; only the corrected harness files were mounted read-only over their originals. The candidate source remains clean. These fixes are not yet merged into dev/main.
- Shared application data was never used for fixture mutation. Temporary PostgreSQL databases used a bounded, unpublished separate container with ephemeral storage. The runner required the documented synthetic OWNER policy for registration. Initial network/readiness/fixture setup errors were corrected without changing application code or live infrastructure; the full npm suite was not repeated.

## NUC boundaries

Both public NUC surfaces share Keycloak realm `samma`, PostgreSQL application data, Garage and Mailpit. Promotion copies application code, not users or data. Read-only realm inspection confirmed `samma-mailpit:1025` and registration, verification and password recovery enabled. Real SMTP was not restored.

Current RC remains `https://samma.co.za`; DEV remains `https://dev.samma.co.za`. Port `192.168.1.152:2022` remains the experiment-only Governance preview. Its liveness is 200; its pre-existing readiness is 503 because storage is intentionally unconfigured. No main/dev runtime owns 2022.

NUC = DEV. Rackzar = future RC/main, with a separate clean environment. Rackzar is untouched.

## Evidence and prepared deployment

Private operational evidence is under `/srv/nuc-archive/juanity/validation/onboarding-rc-20260906/`. It includes preflight container identities, original private runtime configuration, audit output, schema drift and validation logs. Credentials, session cookies and sensitive account contents are excluded from this report.

The isolated candidate is `/srv/nuc-archive/juanity/rc-releases/40befbd4687da6af9517d20c2ee8161bfa6c89a0`. A prepared, unapplied Compose override mounts its complete source/dependency/build tree read-only for RC and retains existing upload staging. Configuration comparison confirms only RC web mounts and revision would change; ports, environment, networks and infrastructure services match the baseline. No live configuration file has been replaced.

To unblock, obtain an explicit NUC-only decision covering the retained schema drift and mobile overlay overlap, or separately review a data-preserving schema reconciliation and a small overlay fix through the experiment → dev workflow. Neither a destructive diff nor silent import of the archived workflow is an acceptable automatic fix.

## Final safety checks

RC and DEV landing, health and database/storage readiness return 200. DEV still shows `DEV / dev / d9068af`; RC remains on the earlier revision without an overlay. All ten captured RC/DEV/experiment/shared-infrastructure container IDs, start times, configuration and mounts match preflight; private runtime environment files are byte-for-byte unchanged. Port 2022 still belongs exclusively to the experiment. No main promotion/deployment smoke is claimed. No user/account data was copied, reset or deleted; existing NUC shared infrastructure and Mailpit are retained. Rackzar is untouched.
