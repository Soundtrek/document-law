# 2026-09-05 — Establish branch structure

## Goal

Owner request: establish `experiment/* → dev → main` in
`Soundtrek/document-law`, with `/opt/Juanita-Labour-Law` normally on `dev` and
`main` reserved for approved, validated RC promotions.

## Owner constraints

- Fetch and verify a clean `main` checkout, with local/remote `main` at exactly
  `0bc1660f03b8380aedcf24a44881f4196e5eb4de`.
- Stop for unexpected `main` movement, a dirty tree, missing archive, conflicting
  existing `dev`, an unsafe switch, or accidental runtime-code changes.
- Preserve `archive/overengineered-workflow-2026-09-05` at
  `536a75499976ce96712ac2ad29313f29fa8bc045`.
- Create/push `dev` at the baseline, then switch the canonical NUC checkout.
- Add concise policy and AGENTS guidance; commit/push only branch-policy
  documentation on `dev`. Do not promote it to `main` during this task.
- Leave application code, PostgreSQL, Keycloak, Garage, Caddy, secrets and
  unrelated services untouched. No unnecessary reset, rebuild or redeploy.

## Accepted decision and scope

Experiments start from current `dev` and are validated before merging into it.
NUC integration, visual and functional approval happens on `dev`; only approved
state is promoted to stable, deployable `main`. Prefer normal merges /
fast-forwards, avoid normal force-pushes to `main`, and preserve useful archives.
The initial documentation commit directly on `dev` is explicitly authorised.

Files: `docs/BRANCH-WORKFLOW.md`, `AGENTS.md`, `docs/DECISION-LOG.md`, and this
prompt record. Runtime and CI configuration changes are outside this task.

## Validation

Prechecks passed after fetching origin. `dev` was created/pushed at the trusted
baseline and the clean NUC checkout switched to it. Homepage, `/api/health` and
`/api/ready` returned HTTP 200 before and after the switch; readiness reported
database and S3 storage available. The app container remained healthy.

Final verification must confirm a documentation-only commit, a clean checkout,
matching local/remote `dev`, unchanged local/remote `main` and remote archive,
and continued public endpoint health. Report the final commit SHA in the task
completion report. Promotion to `main` is deferred.
