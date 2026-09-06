# SAMMA ONBOARDING RC BASELINE

**STATUS: PASS.** Completed 7 September 2026 (Africa/Johannesburg), following the owner's 6 September blocker-resolution request.

## Branches and deployed revisions

| Reference/surface | Exact SHA |
| --- | --- |
| Original accepted DEV | `40befbd4687da6af9517d20c2ee8161bfa6c89a0` |
| Final DEV / origin/dev | `6619d19cddfd0767f280204b541c2f5823f23dce` |
| Deployed DEV | `6619d19cddfd0767f280204b541c2f5823f23dce` |
| Previous main / RC | `0bc1660f03b8380aedcf24a44881f4196e5eb4de` |
| Promoted main / origin/main | `6619d19cddfd0767f280204b541c2f5823f23dce` |
| Deployed RC | `6619d19cddfd0767f280204b541c2f5823f23dce` |

The complete accepted DEV state and corrections were promoted through normal fast-forwards: experiment → dev → main. No cherry-picks, force-push or history rewrite. The two previously validated stale logout-test corrections are retained. This final acceptance report is a documentation-only follow-up on the existing evidence experiment; the promoted and deployed application revisions above remain unchanged.

## Explicit NUC DEV database repair

All **3 invitation rows** matched the rejected workflow's saved private user/result manifests, associated with archive commit `536a75499976ce96712ac2ad29313f29fa8bc045`. Their two companies and all connected members, people and records also matched those archived synthetic fixtures. No nonfixture connection or accepted current user/company dependency was found. Two invitations were EMPLOYMENT and one MEMBERSHIP. Existing linked fixture entities were preserved.

Accepted runtime code and migrations have no CompanyInvitation/InvitationKind references. No table has an incoming foreign key to CompanyInvitation. Only the invitation table and its index used InvitationKind. No production or sensitive data was involved.

A fresh mode-0600 custom-format PostgreSQL backup was taken and its table of contents verified before deletion. A separate forensic export excludes token hashes and credentials, using archived fixture labels for participants.

- Evidence directory: `/srv/nuc-archive/juanity/validation/onboarding-rc-repair-20260906/`.
- Backup: `before-invitation-repair.dump` (89,199 bytes).
- Backup SHA-256: `641a999aa32c4b9bf828c04e0d13858f7134724f0466f46c9cb9f766924223fe`.
- Secret-free forensic export: `invitation-forensic-export.json`.
- Exact operator repair and result: `repair.sql`, `repair.log`.

The transaction locked the invitation table, required exactly the three classified IDs and no incoming references, deleted **3 rows**, dropped **CompanyInvitation** with RESTRICT, and dropped **InvitationKind** with RESTRICT. Complete content fingerprints of all **23 unrelated public tables** matched before/after within the transaction; any mismatch would have rolled it back. The transaction committed successfully.

This was an explicit operator NUC DEV schema repair, **not an application migration**. No Prisma model or accepted migration file changed. Historical applied-migration evidence remains intact. No ordinary accounts, people, companies, memberships, relationships, records or Garage objects were deleted.

Prisma validate: **PASS**. Migration status: **PASS**. Schema zero-diff: **PASS — No difference detected.** Unrelated data changed by the repair: **NO**.

## Mobile overlay and affected validation

At widths up to 600px, the existing badge retains channel, branch and short SHA in a compact single line. It now occupies its own space after page content, aligned to the safe left edge, and appears at the foot of the page when scrolling. It cannot cover either text or controls. Desktop/tablet retain the existing fixed lower-right stacked badge; colours, typography, truncation and pointer-event behaviour remain.

Visual inspection caught ordinary-text overlap in an initial floating compact placement before merge. The final placement passed the compiled-bundle overlay harness at **390, 768 and 1440px** across onboarding, sign-in and Company resume; checks covered top/middle/bottom scrolling, controls, overflow, long branch names and print. Final mobile/desktop screenshots were inspected.

Actual deployed DEV Company and Person pages passed at **390 and 1440px**, with no Sign out, navigation or form-control overlap at the tested positions. An existing manifest-bound synthetic Company acceptance account was reused and signed out. No new user or full onboarding replay was needed. Live RC and DEV mobile landing/sign-in overlays also passed.

Affected web typecheck and lint, harness syntax, focused overlay tests, final DEV production build and exact-main RC production build: **PASS**. The visual refinement required its updated build. No auth, onboarding, record, storage, permission or identity logic changed.

**Full 79-test rerun: NO.** The prior complete promotion suite remains valid, including npm ci, 79/79 tests, Prisma checks, typecheck/lint/build, the exact documented Prisma DEV audit exception, onboarding, Governance and auth/access checks. Dependency declarations and lockfile are unchanged. Builds used copied validated dependencies in isolated release trees, without shared writable dependency/build paths.

## Final runtime smoke and preservation

| Check | DEV | RC |
| --- | --- | --- |
| URL | https://dev.samma.co.za | https://samma.co.za |
| Visible compiled badge | DEV / dev / 6619d19 | RC / main / 6619d19 |
| Landing | 200 | 200 |
| /api/health | 200, exact SHA | 200, exact SHA |
| /api/ready | 200; database/storage ready | 200; database/storage ready |
| /sign-in | 200 | 200 |
| Anonymous /governance/users | redirects to /sign-in | redirects to /sign-in |

Only DEV and RC web containers were recreated. DEV's new container ID/start time/configuration remained unchanged during RC cutover. All **8** captured experiment/shared-infrastructure containers retained their IDs, start times, configuration and mounts. Port `192.168.1.152:2022` remains exclusively owned by the Governance experiment preview; no main/dev runtime owns it.

Users/data copied during promotion: **NO**. Shared NUC data preserved: **YES**, except for the specifically authorised invitation residue deletion above. Ordinary login/session/audit activity was produced by the focused smoke. No ordinary test accounts were deleted, Keycloak was not reset and Garage objects were not touched.

A final read-only realm check confirms `samma` still uses **samma-mailpit:1025**, with registration, verification and recovery enabled. Mailpit was unchanged; real SMTP was not restored. Both current NUC surfaces continue sharing Keycloak/PostgreSQL/Garage/Mailpit. **NUC = DEV; Rackzar = future RC/main with a separate clean environment. Rackzar untouched.**

## Current RC operation and evidence

DEV release: `/srv/nuc-archive/juanity/dev-releases/6619d19cddfd0767f280204b541c2f5823f23dce`.
RC release: `/srv/nuc-archive/juanity/rc-releases/6619d19cddfd0767f280204b541c2f5823f23dce`.

Each release has its own source, dependencies and build output, mounted read-only at runtime. RC compilation used `SAMMA_SHOW_BUILD_OVERLAY=true`, channel `rc`, branch `main` and the exact promoted SHA. Only public build identity is compiled; runtime identity/storage configuration was preserved.

RC uses the operator-owned `/etc/samma-dev/rc-runtime.override.yml` to select the exact release tree. Include this override when operating RC:

```sh
infrastructure/docker/nuc-compose.sh -f /etc/samma-dev/rc-runtime.override.yml up -d --no-deps --no-build web
```

The prepared/expanded configuration comparison confirmed only RC web source/artifact mounts and revision changed; its environment, ports, networks and infrastructure services stayed identical. The original RC artifacts and private runtime configuration backups remain available. Do not use the old canonical-checkout/cache mounting configuration for this RC release.

Requests: `prompts/2026-09-06-onboarding-rc-promotion.txt` and `prompts/2026-09-06-clear-rc-blockers-and-promote.txt`.
Original full-gate evidence: `/srv/nuc-archive/juanity/validation/onboarding-rc-20260906/`.
Repair/build/deployment evidence: `/srv/nuc-archive/juanity/validation/onboarding-rc-repair-20260906/`, including `promotion.json`, `dev-public-smoke.json`, `rc-public-smoke.json`, `final-safety.json` and `overlay-final/`.
