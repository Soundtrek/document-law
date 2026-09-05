SAMMA — PRISMA TRANSITIVE SECURITY OVERRIDES

GOAL

Resolve the current Prisma transitive dependency advisories without:

- downgrading Prisma;
- moving to Prisma 8 RC/dev;
- suppressing npm audit;
- changing the database schema;
- rewriting migration history.

Repository:

/opt/Juanita-Labour-Law

Current main:

f7dc3b4de716fd84e35a2db2782cd0839177a38b

==================================================
DECISION
==================================================

Prisma 7.10.0 is already the current stable 7.x release.

A normal Prisma patch/minor fix is not presently available.

Therefore a narrowly scoped npm `overrides` experiment is AUTHORISED.

This is an explicit, temporary compatibility workaround until Prisma ships patched transitive dependencies.

Do NOT upgrade to Prisma 8 RC/dev in this task.

Do NOT use:

npm audit fix --force

Do NOT downgrade to Prisma 6.

==================================================
1. BASELINE
==================================================

Before changing package.json:

- confirm clean main;
- fetch origin;
- record package-lock hash;
- record current Prisma package tree;
- record npm audit output;
- run current tests/typecheck/lint/build if resource-safe;
- record Prisma generate/validate result.

==================================================
2. OVERRIDES
==================================================

Add only the minimum npm overrides needed to replace the vulnerable transitive packages.

Candidate intent:

deepmerge-ts
-> patched 8.x release

mysql2
-> patched 3.x release satisfying all currently reported advisories

Use the newest stable patched releases compatible with the dependency graph at execution time.

Do not guess versions blindly.

Confirm from npm metadata/advisories before editing.

Expected shape is approximately:

"overrides": {
  "deepmerge-ts": "<patched stable 8.x>",
  "mysql2": "<patched stable 3.x>"
}

Use exact versions rather than broad ranges for this security workaround unless there is a specific reason not to.

Do not override unrelated packages.

==================================================
3. INSTALL / TREE VERIFICATION
==================================================

Regenerate the lockfile through normal npm install behaviour.

Then prove:

npm ls deepmerge-ts
npm ls mysql2
npm ls prisma
npm ls @prisma/client
npm ls @prisma/adapter-pg

Confirm:

- Prisma remains 7.10.0;
- @prisma/client remains 7.10.0;
- @prisma/adapter-pg remains 7.10.0;
- vulnerable deepmerge-ts version is gone;
- vulnerable mysql2 version is gone;
- dependency tree has no invalid/extraneous resolution.

Do not accept an npm tree marked invalid merely because audit becomes green.

==================================================
4. PRISMA COMPATIBILITY TEST
==================================================

This is the critical gate.

Run:

npx prisma generate
npx prisma validate

Then:

- migration status;
- schema/database zero-diff;
- Prisma client startup;
- real PostgreSQL connection;
- Account lookup;
- AccountIdentity lookup;
- representative create/read/update transaction in a disposable DEV fixture if safe;
- transaction rollback behaviour if tests cover it.

No migration may be created.

No schema change may occur.

==================================================
5. DEEPMERGE CONFIG TEST
==================================================

Because deepmerge-ts crosses a major version boundary, specifically validate Prisma configuration loading.

Exercise the actual repository's:

prisma.config.ts

or equivalent configuration path.

Confirm:

- config loads;
- datasource/config resolution is identical;
- Prisma generate works;
- Prisma validate works;
- migration tooling starts correctly;
- environment loading behaves identically.

If SAMMA uses no Map-valued Prisma config, note that explicitly.

If the major override causes any config behavioural difference:

STOP and revert the override.

==================================================
6. MYSQL2 RELEVANCE CHECK
==================================================

SAMMA uses PostgreSQL.

Confirm mysql2 is not:

- imported by SAMMA application code;
- used by its Prisma datasource;
- used by any runtime integration;
- bundled into a reachable MySQL feature.

Its presence should be purely transitive Prisma tooling/runtime dependency.

Still validate that the override does not break Prisma installation or tooling.

==================================================
7. FULL VALIDATION
==================================================

Run:

tests
typecheck
lint
production build

Run the exact CI gate:

npm audit --omit=dev --audit-level=high

Expected:

PASS

If audit still reports vulnerabilities, inspect precisely.

Do NOT broaden overrides unless they are directly part of this Prisma dependency problem.

==================================================
8. AUTH REGRESSION
==================================================

Because auth is now real:

verify:

- app starts;
- OIDC callback compiles/works;
- Phil login works;
- Account linkage works;
- AccountIdentity linkage works;
- /governance works;
- logout works;
- normal non-Governance denial works.

Juanita interactive confirmation remains deferred and is not a blocker.

==================================================
9. DOCUMENT THE WORKAROUND
==================================================

Add a short technical note in the appropriate dependency/security documentation.

Record:

- Prisma 7.10.0 currently pins vulnerable transitive dependencies;
- SAMMA temporarily overrides them;
- exact override versions;
- advisory IDs;
- validation performed;
- remove the overrides once an official Prisma release incorporates patched dependencies.

Do not describe this as a permanent architecture choice.

==================================================
10. COMMIT
==================================================

If every gate passes:

commit only:

- package.json
- package-lock.json
- focused dependency/security documentation if added

Suggested message:

chore: override vulnerable Prisma transitive dependencies

Do not include unrelated changes.

==================================================
11. PUSH / CI
==================================================

Push only if fast-forward safe.

Do not force push.

Wait for GitHub CI result.

CI must pass the original audit gate unchanged.

Do not weaken:

npm audit --omit=dev --audit-level=high

==================================================
12. DEPLOYMENT
==================================================

After CI passes:

deploy the exact validated SHA.

Verify:

https://samma.co.za
https://samma.co.za/api/health

and Phil authentication/Governance access.

==================================================
STOP CONDITIONS
==================================================

STOP and revert rather than forcing this if:

- npm marks the dependency tree invalid;
- Prisma config loading breaks;
- generate/validate fails;
- schema zero-diff fails;
- a migration appears;
- runtime PostgreSQL behaviour changes;
- auth regresses;
- production build fails;
- audit remains High for these same dependencies;
- mysql2 override requires unrelated MySQL package surgery.

==================================================
FINAL REPORT
==================================================

STATUS: PASS / BLOCKED

OVERRIDES
- deepmerge-ts previous -> override
- mysql2 previous -> override
- why each is safe/relevant

DEPENDENCY TREE
- Prisma versions
- npm ls validity

PRISMA
- generate
- validate
- config load
- migration status
- schema zero-diff
- PostgreSQL integration

SECURITY
- advisories before
- advisories after
- npm audit result

VALIDATION
- tests
- typecheck
- lint
- build
- auth regression

GIT
- commit
- origin/main
- clean status

CI
- result

DEPLOYMENT
- deployed SHA
- public health
- Phil login/Governance

FOLLOW-UP
- mark overrides as temporary pending official Prisma fix

UNTOUCHED
- Prisma schema
- migrations
- database data
- Juanita account
- Keycloak configuration
- unrelated NUC services