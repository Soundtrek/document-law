# Prisma transitive security override experiment

Historical report of the earlier override attempt. The subsequent explicitly
approved [DEV security exception](PRISMA-SECURITY-EXCEPTION.md) supersedes its
publication/CI status; it does not change the failed experiment's outcome.

2026-09-05 — **BLOCKED; overrides reverted.** Nothing was committed, pushed or
deployed. This installation failure does not establish a Prisma runtime
incompatibility or an accepted dependency policy.

## Baseline

Clean `main` and fetched `origin/main` both point to
`f7dc3b4de716fd84e35a2db2782cd0839177a38b`. Original/final lockfile SHA-256:
`958654fc8066522ac0dfa701a99c96b00c55ab8db4335455aee897d7933423e7`.
Prisma, `@prisma/client` and `@prisma/adapter-pg` remain **7.10.0**.

Checks ran in an isolated worktree with copied dependencies and separate build
output, using the pinned Node image, Node 22.23.2 / npm 10.9.8, 2 GiB memory,
0.5 CPU and a 1536 MiB heap. Live dependency/build mounts were unchanged.
Registry metadata queries used host Node 24.14.0 / npm 11.9.0.

## Proposed temporary overrides

Registry metadata confirmed these newest stable releases in the requested
major lines before editing. They meet the reported advisory version boundaries;
candidate runtime compatibility was not established.

| Package | Prisma-pinned version | Attempted override | Advisories |
| --- | --- | --- | --- |
| deepmerge-ts | 7.1.5, through @prisma/config | 8.0.2 | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), fixed in 8.0.0 |
| mysql2 | 3.15.3 | 3.24.3 | [GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), fixed in 3.22.0; [GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3), affected through 3.23.0 |

SAMMA uses the PostgreSQL datasource/adapter. No SAMMA application or integration
imports mysql2, and no SAMMA MySQL feature was found. Its dependency path is
Prisma tooling. Candidate bundle verification was not reached.
The actual `packages/database/prisma.config.ts` contains no Map-valued config;
deepmerge 8's changed Map merging still warranted configuration comparison.

## Stop condition

Only the two root overrides were added. `npm install --include=dev` exited 0
but retained the original lockfile and vulnerable versions. The following
`npm ls prisma @prisma/client @prisma/adapter-pg deepmerge-ts mysql2` exited 1
with `ELSPROBLEMS`, reporting:

```text
deepmerge-ts@7.1.5 invalid: "8.0.2" ... overridden
mysql2@3.15.3 invalid: "3.24.3" ... overridden
```

The user's explicit invalid-tree stop condition was followed: both overrides
were removed. Manifest/lockfile match the baseline byte-for-byte. The first full-tree check
after reversion exited 0 but listed two extraneous optional Sharp/WASM packages
in its JSON. A clean `npm ci --include=dev` of the original, unmodified lockfile
was therefore used to restore the isolated baseline install. This is not a
retry of the override experiment.
The clean baseline install also reports `@emnapi/runtime@1.11.3` and
`@img/sharp-wasm32@0.35.4` as extraneous in full-tree JSON despite npm ls exiting
0. These unrelated optional-package findings were preserved in evidence rather
than treating exit 0 as proof of a completely problem-free tree. Neither
Prisma transitive package remains marked invalid after removing the overrides.
No forced install, forced audit fix, manual lockfile edit, wider override,
Prisma downgrade or prerelease upgrade was attempted. The cause of npm retaining
the old resolution is unconfirmed; no fresh-install retry followed the stop.

## Validation

These are **baseline** results, not patched-candidate approval:

- Actual-config Prisma generate/validate, 14 unit tests, typecheck, lint and
  production build: pass.
- Config runtime resolution, dotenv loading, environment precedence and
  missing-DATABASE_URL rejection: pass, with sanitized fingerprints recorded.
  A post-override comparison was not reached.
- Real PostgreSQL connection, migration status and live schema zero-diff: pass.
  Account/AccountIdentity/Person and active Governance capability lookups pass;
  before/after owner fingerprints match.
- Public synthetic-user OIDC login/callback, secure cookie, normal-user
  Governance denial, logout CSRF rejection, provider/local logout, old-cookie
  replay rejection and unverified-user denial: pass.
- HTTP fixed client/callback/PKCE, hostile-Origin, OAuth parameter override and
  invalid callback/state rejection: pass.
- Owner temporary-password checks were explicitly skipped. No fresh interactive
  Phil login/Governance check is claimed; Juanita confirmation remains deferred.
- Patched create/read/update/rollback, auth and full validation were not run:
  the installation gate failed first.
- Original CI command `npm audit --omit=dev --audit-level=high`: exit 1 before
  and after reversion, with four high package findings (`deepmerge-ts`, `mysql2`,
  `@prisma/config`, `prisma`) from three underlying advisories, including the
  moderate mysql2 compression advisory. No audit gate changed.

Disposable synthetic provider/application users and their private manifests
were removed through scoped cleanup. Existing owner accounts/links/grants match
their baseline fingerprint. Normal auth checks generate activity/rate-limit
state; this is not a claim of byte-identical database contents.
Schema, config and migration checksums are unchanged; no migration was created
or applied. Keycloak configuration and all pre-existing service start times/OOM
states are unchanged. Unrelated NUC services were not modified.

## Publication and follow-up

Canonical `main` is clean at the supplied SHA, equal to `origin/main`.
Focused report, decision and prompt capture remain uncommitted in the experiment
worktree because the all-gates-pass commit condition failed. The
[existing main CI run](https://github.com/Soundtrek/document-law/actions/runs/33974971457)
remains failed; no new CI or deployment was triggered. Existing deployment
retained; public root and `/api/health` return HTTP 200. Health reports development
mode and memory storage. No new deployed SHA is claimed.

Evidence: `/srv/nuc-archive/juanity/validation/prisma-security-20260905/`.
Worktree: `/srv/nuc-archive/juanity/prisma-security-worktree`, branch
`chore/prisma-transitive-security`.

A future attempt needs to investigate npm's retained resolution and repeat
every compatibility gate. Any accepted workaround must be temporary and removed
when official stable Prisma incorporates patched dependencies. No override
remains installed from this experiment.
