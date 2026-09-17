# Branch workflow

## Current runtime map — temporary NUC hosting decision

Until the client approves a different VM/hosting arrangement, the NUC is the approved host for both SAMMA production and development.

| Branch | Runtime | Purpose |
| --- | --- | --- |
| `experiment/*` | isolated preview only when explicitly created | Feature/experiment work; not a normal public runtime |
| `dev` | `https://dev.samma.co.za` | Integrated development and acceptance |
| `main` | `https://samma.co.za` | Current production |

```text
experiment/* → dev → main
```

This is a temporary hosting decision, not a permanent architecture commitment. When production/development move to dedicated VMs or another provider, update this document before changing runtime assumptions.

## Rules

1. Never develop directly on `main`.
2. New work normally starts from current `dev` on `experiment/<short-name>` when isolation is useful.
3. Accepted experiment work is integrated into `dev`.
4. `dev.samma.co.za` is the normal integration, visual and functional acceptance environment.
5. Promote only approved, validated `dev` state to `main`.
6. `main` is the stable production branch currently served at `samma.co.za`.
7. Use normal merges/fast-forwards; do not force-push shared history during normal work.
8. Failed experiments may be abandoned without touching `dev` or `main`.
9. Code promotion does not imply data, storage, Keycloak, secret or configuration promotion.
10. Production and development databases remain separate even while both run on the NUC.

## Current NUC boundaries

Production:

```text
https://samma.co.za
branch: main
database: juanity_law
```

Development:

```text
https://dev.samma.co.za
branch: dev
database: samma_dev
```

Production and development currently share some infrastructure, including the Keycloak service/realm and the current Garage object-storage configuration. Treat those shared services as explicit risk boundaries; do not assume a DEV change is isolated merely because the application database is separate.

The current direction is to move document binaries to separate external S3-compatible storage for production and development. Until that migration is completed, do not pretend the current shared Garage bucket provides full prod/dev storage isolation.

## Start new work

Typical flow:

```sh
git switch dev
git pull --ff-only
git switch -c experiment/<short-name>
```

Use the session methodology in `docs/CODEX-SESSION-METHODOLOGY.md`: establish the baseline once, use focused checks during the session, and run broad validation once at the session close/promotion gate.

## Promotion

Before `dev → main`, validate the accumulated accepted session/release once. Promotion moves repository state only. Runtime configuration, databases, Keycloak state, object storage and secrets are separate operations and require explicit scope when changed.

## Historical note

Earlier documents described `main` as RC and a future Rackzar/dedicated VM as the next production runtime. That is no longer the current operating decision. The NUC now hosts production and development temporarily pending the client hosting/VM decision. Historical deployment evidence remains historical and should not be rewritten as if it occurred under the current policy.
