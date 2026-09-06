SAMMA — DEV BRANCH / VERSION OVERLAY

GOAL

Add a small non-intrusive development overlay showing exactly what code is running.

Repository:

/opt/Juanita-Labour-Law

Branch workflow:

experiment/*
    ↓
dev
    ↓
main

Do this work on a new experiment branch from dev:

experiment/dev-version-overlay

Do NOT work directly on dev or main.

==================================================
DISPLAY
==================================================

Add a compact fixed badge in the bottom-right corner.

Example:

DEV
dev
67c2a89

For an experiment candidate:

EXPERIMENT
onboarding-person-company
42f6405

For main/RC:

RC
main
0bc1660

The overlay should display the ACTUAL BUILT/DEPLOYED revision, not simply whatever Git checkout happens to exist on the host.

==================================================
SOURCE OF TRUTH
==================================================

Inject build metadata at build/deploy time.

Preferred values:

SAMMA_BUILD_BRANCH
SAMMA_BUILD_SHA
SAMMA_BUILD_CHANNEL

Examples:

SAMMA_BUILD_CHANNEL=dev
SAMMA_BUILD_BRANCH=dev
SAMMA_BUILD_SHA=67c2a8973a6ec0dfb437944176f8da4878fb4a58

or:

SAMMA_BUILD_CHANNEL=experiment
SAMMA_BUILD_BRANCH=experiment/onboarding-person-company
SAMMA_BUILD_SHA=42f640590a296bdee571ef4a86589da47635ae04

Do NOT derive the displayed SHA at runtime from the mounted Git checkout.

The overlay must represent the deployed application build.

==================================================
CHANNEL RULES
==================================================

Map:

experiment/*
→ EXPERIMENT

dev
→ DEV

main
→ RC

Future production releases may hide the overlay entirely.

==================================================
VISIBILITY
==================================================

Show overlay only when explicitly enabled, e.g.:

SAMMA_SHOW_BUILD_OVERLAY=true

DEV and isolated experiment deployments:
enabled

Future production:
disabled

Do not rely only on NODE_ENV because our NUC runs a production Next build while still being SAMMA DEV.

==================================================
DESIGN
==================================================

Small, restrained badge.

Bottom-right.

Do not interfere with buttons/forms.

Desktop:
compact fixed pill/card.

Mobile:
smaller text, safe margin, no horizontal overflow.

Suggested contents:

DEV
dev · 67c2a89

or two compact lines.

Use SAMMA design tokens.

No bright debugging colours or large banners.

==================================================
OPTIONAL DETAILS
==================================================

On hover/focus or click, it may reveal:

Branch: dev
SHA: 67c2a897...
Channel: DEV

Do not expose:

- secrets
- internal IPs
- database names
- container names
- storage credentials

==================================================
HEALTH METADATA
==================================================

Also add the non-sensitive build metadata to /api/health if appropriate:

build: {
  channel,
  branch,
  sha
}

Only expose values already intended for the overlay.

Do not expose Git remote URLs or filesystem paths.

==================================================
DEPLOYMENT INTEGRATION
==================================================

Update the NUC/candidate build process so the exact branch and SHA being built are injected.

Important:

The current canonical checkout may be dev while the deployed application is still an older SHA.

The badge must therefore continue to show:

0bc1660

until a new build is actually deployed.

This is the entire reason for the feature.

==================================================
TESTS
==================================================

Verify:

- overlay disabled when flag false
- DEV displays correctly
- EXPERIMENT displays correctly
- RC displays correctly
- SHA shortened correctly in UI
- full SHA available only if useful
- no secret/environment leakage
- desktop 1440
- tablet 768
- mobile 390
- no overlap with important controls

==================================================
VALIDATION
==================================================

Run:

tests
typecheck
lint
production build

No database migration.

No auth/storage changes.

==================================================
GIT
==================================================

Commit only on:

experiment/dev-version-overlay

Suggested commit:

feat: add build version overlay

Push experiment branch.

Do NOT merge to dev yet.

==================================================
FINAL REPORT
==================================================

STATUS: PASS / BLOCKED

BRANCH
- experiment branch
- SHA

OVERLAY
- channel
- branch
- SHA source
- visibility flag

HEALTH
- build metadata present: YES/NO

UI
- desktop
- tablet
- mobile

VALIDATION
- tests
- typecheck
- lint
- build

UNCHANGED
- database
- auth
- storage
- dev
- main
