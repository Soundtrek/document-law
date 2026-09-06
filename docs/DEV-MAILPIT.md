# Shared NUC auth mail — Mailpit, 2026-09-06

STATUS: PASS. The shared NUC Keycloak realm `samma` sends all verification and
recovery mail to Mailpit. Phil explicitly approved both current NUC surfaces:

| Surface | Auth mail |
| --- | --- |
| `https://dev.samma.co.za` — DEV | Mailpit |
| `https://samma.co.za` — current NUC RC-style surface | Mailpit |
| Future main/RC on Rackzar | Real SMTP; not configured by this change |

Both NUC surfaces retain issuer `https://auth.samma.co.za/realms/samma` and client
`samma-web`. No auth redesign, client/callback change or application deployment
was needed. The earlier DEV-only scope conflict was resolved by Phil's explicit
shared-NUC clarification.

## Service and startup

```sh
docker compose -f infrastructure/docker/compose.mailpit.yml config --quiet
docker compose -f infrastructure/docker/compose.mailpit.yml up -d
python3 infrastructure/auth/keycloak-mailpit.py apply
```

- Container: `samma-mailpit`; SMTP: `samma-mailpit:1025` (`mailpit` alias).
- LAN inbox: <http://192.168.1.152:8025>; specific LAN bind, no Caddy route.
- SMTP uses existing internal `samma-auth-private`; no published SMTP host port.
- A dedicated `samma-mailpit-inbox` bridge contains Mailpit alone and permits
  LAN UI publication. Docker did not publish ports with only an internal network.
  Its subnet `10.254.152.0/28` was checked against all NUC Docker networks and
  host routes because the automatic Docker address pools were exhausted.
  Mailpit is never attached to `caddy-net`.
- No SMTP encryption/authentication on the private network; no relay/forwarding.
- Pinned image, 128 MiB RAM, 0.25 CPU, bounded logs and 64 MiB temporary storage.
- Up to 100 messages; inbox is disposable and cleared by container restart.
- Manual startup follows the existing NUC resource-controlled runtime convention.
- Only this standalone Compose project is started; existing services/networks
  are not recreated or reconfigured.

The operator script is restricted to this NUC and verifies the shared issuer,
Mailpit readiness/network bindings and existing registration/verification/recovery
flags before changing only `smtpServer`. It saves a mode-0600 private realm
snapshot under `/etc/samma-dev/mailpit-before-*.json` and compares all non-SMTP
realm fields after applying the update. Never mount/run it inside SAMMA web.
Ordinary application deployment does not need to rerun the SMTP switch.

The image and unpublished SMTP configuration follow the
[official Mailpit Docker documentation](https://mailpit.axllent.org/docs/install/docker/).

## Active Keycloak settings

Realm `samma`: host `samma-mailpit`, port `1025`, SSL/STARTTLS/authentication
disabled, sender `SAMMA <no-reply@samma.co.za>`. Registration, required email
verification and forgot-password/recovery remain enabled. All non-SMTP realm
settings matched the pre-change snapshot; provider subjects and client settings
were not changed.

## Preserved real SMTP reference

Future main/RC on Rackzar is intended to use real SMTP: `wp13.host-ww.net`,
port `465`, implicit TLS, sender/login `no-reply@samma.co.za`, display name `SAMMA`.
This is a future reference, not a Rackzar configuration action. Existing
credentials remain untouched in operator-owned `/etc/samma-dev/smtp.env`, mode
0600; no passwords belong in Git or documentation. Snapshot passwords may be
masked; preserve the original credential file for any deliberate restoration.
Do not bulk-restore a historical realm snapshot. A rollback changes only SMTP
and would affect both NUC surfaces. Do not stop Mailpit while the realm uses it.

## Focused smoke and cleanup

- Compose validation and container readiness passed; approximately 6.5 MiB RAM.
- Synthetic SMTP message from inside Keycloak to `samma-mailpit:1025` was accepted
  and found in the Mailpit inbox API.
- Real browser self-registration created one unique `example.invalid` identity.
  Verification email arrived in Mailpit; its actual link succeeded and Keycloak
  confirmed `emailVerified=true` for that same subject.
- Browser Forgot password generated a captured recovery message; its actual link
  accepted a password and a fresh provider login accepted it. Because registration
  is email-first, a second reset then replaced this known working password:
  fresh login rejected the old password and accepted the new one, with the same
  verified provider subject.
- Provider authorization redirects were intercepted before the SAMMA callback;
  this is provider mail/link smoke, not an application onboarding regression.
  No SAMMA database account/company fixture was created.
- The unique identity was deleted only after matching its private manifest,
  exact random username/email, subject ID and synthetic names. Exact lookup then
  confirmed absence. No real user was modified/deleted. Temporary test passwords
  were removed; private smoke evidence remains under
  `/home/philip/.local/state/samma-dev-mailpit/smoke/`.
- Inbox `/`, DEV `/`, `/api/health` and `/api/ready` returned 200.
- Only `192.168.1.152:8025` is published. Host SMTP, loopback inbox and the other
  LAN interface's inbox port were closed; no public route/Caddy attachment added.
- Existing web/RC, Keycloak, auth limiter, database, storage and Caddy container
  IDs, start times and network attachments matched the private preflight baseline.
- Main revision and private real SMTP file hash remained unchanged. Rackzar was
  untouched. Current NUC RC-style **mail behavior changed as approved**; its
  application deployment did not change.
- Validation: smoke only. Full suite rerun: **NO**. No application build required.

Changes were prepared on `experiment/dev-mailpit` from current `dev` and merged
to `dev` after successful smoke. Main receives no promotion.
