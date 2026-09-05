SAMMA — DOCUMENTED PRISMA SECURITY EXCEPTION

GOAL

Record and narrowly contain the current Prisma 7.10.0 transitive dependency vulnerability situation so SAMMA development can continue without hiding security debt.

Repository:

/opt/Juanita-Labour-Law

Current main:

f7dc3b4de716fd84e35a2db2782cd0839177a38b

==================================================
DECISION
==================================================

Prisma 7.10.0 is retained.

Do NOT:

- downgrade Prisma;
- move to an unstable/RC major;
- use invalid npm overrides;
- use npm audit fix --force;
- suppress all npm audit findings;
- remove the audit step entirely.

The current transitive advisories are accepted temporarily for DEV under an explicit documented exception.

==================================================
1. DOCUMENT THE EXCEPTION
==================================================

Add a focused security/dependency note in the repository.

Record:

Prisma:
7.10.0

Affected transitive packages:

deepmerge-ts 7.1.5
mysql2 3.15.3

Known advisories:

GHSA-ggr8-5vv4-36mx
GHSA-3f6p-5ww8-9rcr
GHSA-rgwj-5xj2-c3m3

Record that:

- no supported Prisma 7.x patch/minor is currently available;
- attempted patched npm overrides produced an invalid dependency tree;
- forced Prisma downgrade was rejected;
- Prisma schema, database zero-diff, tests, typecheck, lint and production build remain clean;
- SAMMA uses PostgreSQL, not MySQL;
- the exception is DEV-only and must be reviewed before production/sensitive-data approval;
- remove the exception as soon as an official Prisma release incorporates patched dependencies.

Reference the saved security experiment report where appropriate.

==================================================
2. CI BEHAVIOUR
==================================================

Keep npm audit running.

Do NOT simply change:

npm audit --omit=dev --audit-level=high

to:

... || true

without inspection.

Instead implement a narrow known-advisory gate.

Preferred behaviour:

1. run npm audit in machine-readable JSON form;
2. inspect findings;
3. allow CI to pass ONLY when all high findings exactly match the explicitly approved Prisma transitive advisory set;
4. fail CI if:
   - any new high/critical advisory appears;
   - package/version differs from the approved exception;
   - Prisma dependency versions change unexpectedly;
   - the known exception set grows.

The approved exception set is limited to the currently documented Prisma dependency findings.

Critical vulnerabilities are never excepted.

Do not hide the audit output.

CI output should clearly state something like:

KNOWN TEMPORARY PRISMA SECURITY EXCEPTION

with the approved advisory IDs.

==================================================
3. IMPLEMENTATION
==================================================

Prefer a small repository script such as:

scripts/check-production-audit.mjs

or equivalent.

The script should:

- execute or consume npm audit JSON;
- fail on critical findings;
- fail on any unknown high finding;
- verify approved package names and versions;
- verify approved advisory IDs;
- return success only when remaining high findings exactly match the known exception.

Do not hardcode unrelated dependency policy.

Keep the exception easy to remove later.

==================================================
4. TEST THE GATE
==================================================

Validate three cases:

A. Current dependency tree
Expected:
PASS WITH KNOWN EXCEPTION

B. Simulated unknown high advisory in test fixture
Expected:
FAIL

C. Simulated critical advisory
Expected:
FAIL

Do not mutate the real lockfile just to test failure cases.

Use fixtures/unit tests for the audit parser/gate.

==================================================
5. NORMAL VALIDATION
==================================================

Run:

npm install / reproducible install
prisma generate
prisma validate
migration status
schema zero-diff
tests
typecheck
lint
production build

Then run the new production security gate.

Expected:

PASS WITH DOCUMENTED EXCEPTION

==================================================
6. CI
==================================================

Update GitHub Actions to use the narrow audit gate.

Do not remove dependency auditing.

Push only if fast-forward safe.

Verify CI passes.

The CI result must still visibly report the accepted Prisma exception.

==================================================
7. SECURITY FOLLOW-UP TRACKING
==================================================

Create a GitHub issue if one does not already exist.

Suggested title:

security: remove temporary Prisma transitive vulnerability exception

Issue should include:

- current Prisma version;
- affected packages;
- advisory IDs;
- reason overrides were rejected;
- requirement to re-test when Prisma releases a patched stable version;
- requirement to remove CI exception before production/sensitive-data approval.

Do not add a calendar date unless there is an actual release/date commitment.

==================================================
8. AUTH / DEPLOYMENT
==================================================

This task is CI/security-policy only.

Do not redeploy the SAMMA app unless repository runtime code changes require it.

Do not change:

- Keycloak
- auth behaviour
- database schema
- migrations
- owner accounts
- Caddy
- document engine

==================================================
FINAL REPORT
==================================================

STATUS: PASS / BLOCKED

EXCEPTION
- Prisma version
- packages
- advisory IDs
- scope
- production restriction

CI GATE
- implementation file
- approved exception logic
- unknown-high test
- critical test
- current-tree result

VALIDATION
- Prisma generate
- Prisma validate
- zero-diff
- tests
- typecheck
- lint
- build

GIT
- commit
- origin/main
- CI result

ISSUE
- issue number/link

DEPLOYMENT
- confirm no redeploy required/performed

UNTOUCHED
- schema
- migrations
- auth
- Keycloak
- document engine
- unrelated NUC services