# Temporary Prisma security exception — DEV only

Approved explicitly by the repository owner on 2026-09-05. This exception allows
SAMMA development to continue with visible security debt. It is **not approval
for production or sensitive data**. Remove it before production/sensitive-data
approval and as soon as an official stable Prisma release incorporates patched
dependencies. Track removal in [security issue #5](https://github.com/Soundtrek/document-law/issues/5).
No upstream release date or remediation deadline has been committed.

## Exact approved scope

Retain Prisma, `@prisma/client`, `@prisma/adapter-pg` and `@prisma/config` at
**7.10.0**. The accepted transitive dependency graph is:

```text
prisma@7.10.0
├── @prisma/config@7.10.0
│   └── deepmerge-ts@7.1.5
└── mysql2@3.15.3
```

| Package/version | Advisory | Reported severity |
| --- | --- | --- |
| deepmerge-ts 7.1.5 | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) — recursive graph stack exhaustion | High |
| mysql2 3.15.3 | [GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr) — authentication downgrade/credential disclosure | High |
| mysql2 3.15.3 | [GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3) — compressed-protocol decompression exhaustion | Moderate |

npm reports **four high package findings**, including inherited findings on
`@prisma/config` and `prisma`, from these three underlying advisories. Critical
vulnerabilities are never excepted. This scope must not grow automatically.

On the approval date, npm metadata lists **7.10.0** as the newest stable Prisma
7.x release; no newer supported patch/minor was available. The attempted
`deepmerge-ts@8.0.2` / `mysql2@3.24.3` overrides produced an invalid npm tree and
were reverted under the user's stop condition. No invalid override remains.
The proposed forced Prisma downgrade was rejected, and no unstable/RC major is
approved. See the [saved experiment report](PRISMA-TRANSITIVE-SECURITY-EXPERIMENT.md).

SAMMA's datasource and runtime adapter use **PostgreSQL**. No SAMMA application
or integration imports mysql2 or exposes a MySQL feature; mysql2 is supplied by
Prisma tooling. The actual Prisma configuration contains no Map-valued settings.
These observations explain the limited DEV acceptance; they do not remove the
advisories or establish that every Prisma tooling path is safe.

## CI enforcement

Run the gate in explicitly declared DEV context:

```sh
SAMMA_ENV=development npm run audit:production
```

`scripts/check-production-audit.mjs` runs the original production-dependency
audit with machine-readable output:

```sh
npm audit --omit=dev --audit-level=high --json
```

The complete JSON report and stderr remain visible in CI. The gate fails on
audit execution/parse errors, inconsistent report counts/status, invalid Prisma
tree resolution, unknown high findings or any critical finding. It checks exact
locked and installed names/versions for all six packages above, their approved
installation paths, database package declarations and the Prisma dependency
edges. It also verifies advisory URLs/IDs, severity, attribution, affected node
paths and inherited finding relationships. No name-only allowlist is used.

The exception succeeds only with the complete approved set, no additional high
findings, and `SAMMA_ENV=development`. Missing, changed or additional known
advisories require review. A fully clean audit can pass without an exception,
but package version changes still require removal/update of this temporary
policy. Unrelated low/moderate findings remain visible and retain the original
high audit threshold; new advisories within an excepted package are rejected.

Accepted CI output includes:

```text
KNOWN TEMPORARY PRISMA SECURITY EXCEPTION — DEV ONLY
- GHSA-ggr8-5vv4-36mx
- GHSA-3f6p-5ww8-9rcr
- GHSA-rgwj-5xj2-c3m3
PASS WITH DOCUMENTED EXCEPTION. Not production/sensitive-data approval.
```

The workflow sets DEV mode only for this audit step. Outside DEV mode, the
known findings fail. There is no `|| true`, ignored audit result, force-fix or
removal of dependency auditing.

The first CI run with this gate passed the audit and subsequent checks until
the build exposed missing authentication environment inputs. The build step
now supplies clearly synthetic values and reserved `.invalid` HTTPS origins,
with synthetic identity activation still disabled. These values only satisfy
build-time configuration validation; they are not runtime credentials or a
working identity provider. CI does not deploy the resulting build. Auth code,
Keycloak and deployed configuration are unchanged.
The production build passed with only these synthetic CI inputs in a
network-disabled container, without database or identity-provider access.

## Validation and removal

Gate tests use captured audit JSON and cloned in-memory fixtures; they never
mutate the real lockfile. `npm test` includes the gate tests alongside the
workspace security/domain tests. Coverage includes the current approved report,
unknown high, critical, expanded/changed advisories, version/path/graph drift,
DEV restriction, clean reports and malformed/failed audit execution.

Revalidation after `npm ci --include=dev` passed actual-config Prisma
generate/validate, live PostgreSQL migration status/zero-diff, all **50 tests**
(36 audit-gate tests and 14 workspace tests), typecheck, lint and production
build. The new gate passed against the live audit with the documented exception
under Node 22.23.2 / npm 10.9.8 and host Node 24.14.0 / npm 11.9.0. The lockfile
and all dependency versions are unchanged. Sanitized validation logs are at
`/srv/nuc-archive/juanity/validation/prisma-exception-20260905/`.
This policy change modifies no runtime code and requires no deployment.

Removal must include a supported stable Prisma dependency update, valid tree,
unexcepted audit, real configuration/generate/validate checks, zero schema drift,
PostgreSQL and auth regression checks, tests, typecheck, lint and production
build. Restore the unexcepted CI audit command, remove this temporary gate and
its fixture/tests/npm scripts, and update this note and issue #5 with evidence.
Do not close the issue merely because DEV CI passes with this exception.
