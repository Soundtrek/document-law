# NUC DEV Mailpit — 2026-09-06

STATUS: BLOCKED on the realm switch. Mailpit is running and healthy independently.

The live NUC DEV and RC applications both use
`https://auth.samma.co.za/realms/samma`, client `samma-web`. Realm SMTP is shared;
switching it also changes RC verification/recovery delivery. The requested
DEV-only switch cannot preserve RC mail behavior with this shared realm.
No realm setting has been changed. An explicit scope decision is needed before
switching shared mail or separating the provider; no auth redesign is included.

## Prepared DEV service

```sh
docker compose -f infrastructure/docker/compose.mailpit.yml config --quiet
docker compose -f infrastructure/docker/compose.mailpit.yml up -d
```

- Container: `samma-mailpit`; SMTP: `samma-mailpit:1025` (`mailpit` alias).
- SMTP uses existing internal `samma-auth-private`; no SMTP host port.
- A dedicated `samma-mailpit-inbox` bridge contains Mailpit alone and permits
  LAN UI publication (Docker did not publish ports with only an internal network).
  Mailpit is never attached to `caddy-net`.
  Its subnet `10.254.152.0/28` was checked against all NUC Docker networks and
  host routes; the automatic Docker address pools were exhausted.
- LAN inbox: <http://192.168.1.152:8025>; specific LAN bind, no Caddy route.
- No SMTP encryption/authentication on this private network; no relay/forwarding.
- Pinned image, 128 MiB RAM, 0.25 CPU, bounded logs and 64 MiB temporary storage.
- Up to 100 messages; inbox is disposable and cleared by container restart.
- Manual startup follows the existing NUC resource-controlled runtime convention.
- Only this standalone Compose project is started; existing services/networks
  are not recreated or reconfigured.

The image and unpublished SMTP configuration follow the
[official Mailpit Docker documentation](https://mailpit.axllent.org/docs/install/docker/).

## Pending Keycloak change

After resolving the shared RC dependency, the requested realm SMTP values are
host `samma-mailpit`, port `1025`, SSL/STARTTLS/authentication disabled, sender
`SAMMA <no-reply@samma.co.za>`. Registration, required verification and password
recovery must remain enabled. Registration verification and forgot-password
link smoke tests remain pending; do not label the switch accepted beforehand.

## Preserved real SMTP reference

Future main/RC on Rackzar is intended to use real SMTP: `wp13.host-ww.net`,
port `465`, implicit TLS, sender/login `no-reply@samma.co.za`, display name `SAMMA`.
This is a future reference, not a Rackzar configuration action. The current realm
still uses these settings. Existing credentials remain untouched in operator-owned
`/etc/samma-dev/smtp.env`, mode 0600; no passwords belong in Git or documentation.

Main/RC deployment, Rackzar, Caddy and Garage/PostgreSQL networking are untouched.
Full suite rerun: NO. Keep this work on `experiment/dev-mailpit` until the
requested auth smoke succeeds; only then merge to `dev`.

## Focused preparation smoke

- Compose validation and container readiness passed; approximately 6.5 MiB RAM.
- Synthetic SMTP message sent from inside the Keycloak container to
  `samma-mailpit:1025` was accepted and found in the Mailpit inbox API.
- LAN inbox `/` returned 200. Docker publishes only `192.168.1.152:8025`;
  host SMTP, loopback inbox and the other LAN interface's inbox port were closed.
  No public route or Caddy attachment was added.
- DEV `/`, `/api/health` and `/api/ready` each returned 200.
- Existing web/RC, Keycloak, auth limiter, database, storage and Caddy container
  IDs, start times and network attachments matched the private preflight baseline.
- Main revision and the private real SMTP file hash were unchanged.
- Realm read-only check: registration, verification and recovery all enabled;
  SMTP remains `wp13.host-ww.net:465` with implicit TLS and authentication.
- Verification mail/link and reset mail/link: **NOT RUN**, blocked by shared realm
  scope. No disposable account was created and no user was deleted. The synthetic
  connectivity message may remain; it contains no credentials or action links.
