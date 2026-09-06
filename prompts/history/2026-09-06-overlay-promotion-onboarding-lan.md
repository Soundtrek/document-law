# Overlay promotion and onboarding LAN inspection

Owner request, 2026-09-06:

- The overlay experiment at `deed84bcc48a99446891db6c2f16ec556436b49b`
  is visually approved. Fetch and verify clean expected branches, fast-forward
  it into dev from `67c2a8973a6ec0dfb437944176f8da4878fb4a58`, then push dev.
- Rebase `experiment/onboarding-person-company` from
  `42f640590a296bdee571ef4a86589da47635ae04` onto updated dev. Resolve only
  straightforward related conflicts. Preserve feature behavior; push with an
  explicit force-with-lease on this experiment only.
- Build the exact resulting experiment SHA with the build overlay explicitly
  enabled, channel experiment, and full branch/SHA injected at build time.
  Use proportional conflict/build/type checks only; no full suite or CI rerun,
  migration, or broad authentication/storage regression.
- Port `192.168.1.152:2022` is reserved exclusively for experiment builds.
  Phil inspects only `http://192.168.1.152:2022`. Do not put dev or main there
  and do not create more experiment ports.
- Replace only the existing overlay experiment runtime on that port. Keep
  samma.co.za, its deployed artifact, main, other runtimes, Caddy, Keycloak,
  PostgreSQL and Garage unchanged.
- Smoke-check HTTP 200 for the experiment homepage and health, the visible
  EXPERIMENT / onboarding-person-company / short-SHA badge, and onboarding UI.
- Stop for Phil's visual/functional approval. Do not merge onboarding into dev
  or deploy it to samma.co.za.

Conflict resolution preserves both CSS additions and test commands and retains
both decision-log entries with distinct IDs. No feature changes are authorised.
