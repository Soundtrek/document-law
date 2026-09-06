# Branch workflow

## Locked runtime map — 2026-09-06

| Branch | Runtime | Purpose |
| --- | --- | --- |
| `experiment/*` | `http://192.168.1.152:2022` | Preview only |
| `dev` | `https://dev.samma.co.za` | Full real DEV integration |
| `main` | `https://samma.co.za` | RC |

Do not deploy experiments to the DEV hostname or mix these runtimes.
See [dedicated DEV operations](DEV-RUNTIME.md). Earlier runtime descriptions
below are historical where they conflict with this map.

```text
experiment/* → dev → main
```

- `experiment/*`: isolated feature or experiment branches created from current
  `dev`; may be incomplete or disposable and never serve as the normal NUC branch.
- `dev`: integrated development branch; receives accepted experiments and is the
  normal branch for `/opt/Juanita-Labour-Law` on the NUC.
- `main`: stable, deployable RC / release-candidate branch; receives only approved,
  validated state promoted from `dev`.

## Rules

1. Never develop directly on `main`.
2. The NUC normally runs `dev`.
3. New work starts from current `dev`.
4. Use `experiment/<short-name>` for isolated work.
5. Validate an experiment before merging it into `dev`.
6. Perform NUC integration, visual and functional validation/approval on `dev`.
7. Promote only approved `dev` state to `main`.
8. Keep `main` for RC / release-candidate work only.
9. Failed experiments may be abandoned without touching `dev`.
10. Do not force-push `main` during normal workflow.
11. Prefer normal merge / fast-forward promotion.
12. Preserve rejected or historically useful work in archive branches where needed.

## Start new work

```sh
git switch dev
git pull --ff-only
git switch -c experiment/<short-name>
```

Build and test the experiment, merge accepted work into `dev`, then validate it on
the NUC. Promote `dev` to `main` only after approval. Branch switching alone does
not require a rebuild or redeployment when application code is unchanged.

This policy supersedes earlier instructions to use `main` as the normal NUC
checkout or promote experiments directly to `main` in deployment documents;
historical deployment evidence remains unchanged.

## Establishment — 2026-09-05

`dev` was created and pushed from trusted baseline
`0bc1660f03b8380aedcf24a44881f4196e5eb4de`, then the NUC checkout switched to `dev`.
The initial policy documentation commit belongs only on `dev`; `main` remains at
that baseline during this setup. Preserve
`archive/overengineered-workflow-2026-09-05` at
`536a75499976ce96712ac2ad29313f29fa8bc045`.
