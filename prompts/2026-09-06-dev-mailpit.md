# SAMMA — Switch NUC DEV auth mail to Mailpit

Phil requested one lightweight NUC-only `samma-mailpit` container, private
Keycloak SMTP at port 1025, and a LAN-only inbox at
`http://192.168.1.152:8025`. Switch realm `samma` from real SMTP to Mailpit with
sender `SAMMA <no-reply@samma.co.za>`, retaining registration, required email
verification and recovery. Preserve the password-free real SMTP reference
(`wp13.host-ww.net:465`, implicit TLS, `no-reply@samma.co.za`) for future RC.

Do not work on Rackzar, touch main/RC deployment, redesign auth, modify Caddy or
change Garage/PostgreSQL networking. Run only disposable registration verification,
forgot-password/reset, and DEV root/health/ready smoke checks; remove only the
disposable account. No full suite. Use `experiment/dev-mailpit` from current dev,
merge to dev only after successful smoke, and report PASS/BLOCKED accurately.

Read-only preflight found that live DEV and RC share the same realm and client.
The SMTP switch would affect RC delivery, conflicting with the DEV-only scope.
Prepare Mailpit independently; do not change realm SMTP without resolving that
scope conflict. See `docs/DEV-MAILPIT.md` for status and the preserved reference.

## Accepted scope clarification

Phil explicitly resolved the shared-realm conflict:

- SAMMA on the NUC: `dev.samma.co.za` → DEV → Mailpit.
- `samma.co.za` → current NUC RC-style surface → Mailpit.
- Keycloak realm `samma` remains one shared NUC realm; **all verification and
  recovery mail goes to Mailpit**.
- Inbox remains `http://192.168.1.152:8025`.

Proceed with the shared realm SMTP switch and original focused smoke/cleanup and
experiment → dev merge. Main/RC application deployment and Rackzar remain outside
scope; the NUC RC-style auth mail behavior changes intentionally.
