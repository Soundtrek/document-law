# Public registration and mail operations

Provider configuration is operator-only. No script here is a web route and no
SMTP/admin/test credentials may be mounted into SAMMA web. Source credentials
and private snapshots stay under `/etc/samma-dev/`, operator-owned mode 0600.

## Current NUC mail — 2026-09-06

Shared realm `samma` sends verification/recovery mail for both NUC DEV and the
current NUC RC-style surface to `samma-mailpit:1025`. Inbox:
<http://192.168.1.152:8025>. Required verification and recovery remain enabled.
Use [Mailpit operations](../../docs/DEV-MAILPIT.md) and the NUC-only
`keycloak-mailpit.py apply` script. The real SMTP instructions below are
historical setup/future reference; rerunning their SMTP step switches both NUC
surfaces back to real delivery. Preserve `/etc/samma-dev/smtp.env`; no Rackzar
configuration is included. This transport change requires only focused smoke,
not the original feature's build/full validation procedure below.

## Install / reproduce

1. Read the [report](../../docs/AUTH-REGISTRATION-V1-REPORT.md), inspect current
   provider/client/proxy settings and check disk/RAM/CPU before changing runtime.
2. Provision `/etc/samma-dev/smtp.env`: SMTP_HOST, SMTP_PORT=465, SMTP_SSL=true,
   SMTP_USERNAME, SMTP_PASSWORD and SMTP_FROM. Current verified existing hosting
   endpoint is `wp13.host-ww.net`, sender `no-reply@samma.co.za`. The parser reads
   literal values after `=`; do not source it as shell code or add shell quotes.
3. Run `python3 infrastructure/auth/keycloak-registration.py smtp`. It validates
   TLS/authentication, exact callbacks/origins/logout URLs, snapshots privately,
   then writes and reads back SMTP settings. It sends no test message.
4. Start only `auth-limit` with `infrastructure/docker/keycloak-compose.sh up -d
   --no-deps auth-limit`. It has no host-published port and accepts requests only
   from the existing Caddy address `172.28.0.4`. Recheck that address if proxy
   networking changes. Do not loosen the source check to the entire subnet.
5. Snapshot the loaded Caddy JSON and on-disk include in a private directory.
   Ensure loaded/disk agree, replace only the SAMMA auth include from
   `infrastructure/docker/samma-auth.caddy`, validate the full configuration,
   compare unrelated routes, reload, and verify loaded/disk agree again.
6. Verify provider action bursts receive 429/Retry-After despite forged
   X-Forwarded-For/X-Samma-Client headers. Verify discovery and DEV/RC health.
   The limiter is a fail-closed gate; if it is down protected actions fail.
7. Install `password-blacklists/samma-common.txt` at
   `/opt/keycloak/data/password-blacklists/samma-common.txt` inside Keycloak. The
   updated Compose file mounts it read-only for subsequent container creation.
   The initial live setup copied the file into the existing container to avoid
   recreating Keycloak. **Until the updated Compose is used, do not recreate the
   provider using the old DEV Compose: it does not contain this mount.** Ordinary
   restart of the same container preserves the copied file.
8. After verifying the gate and blacklist, run
   `SAMMA_AUTH_RATE_LIMIT_VERIFIED=true python3 infrastructure/auth/keycloak-registration.py enable`.
   The flag records the operator prerequisite; it is not a substitute for testing.
   Read back settings and test password-policy rejection with disposable data.

Registration uses standard `prompt=create` described by
[Keycloak](https://www.keycloak.org/docs/latest/server_admin/#_authentication-flows).
Password policies and default email templates remain provider-owned. The limiter
uses stock [Nginx request limits](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)
at the provider ingress; it is not a custom password or email service.

## Focused validation

- `npm run test:onboarding` and identity package tests cover local helpers.
- `infrastructure/onboarding/verify.ts` covers transactional onboarding, email
  collisions (including casing/concurrency), OWNER-only grants, denied identities,
  audit rollback and replay/revocation in a disposable PostgreSQL database.
- Run `node --conditions=react-server --import tsx infrastructure/auth/verify-registration.ts`
  with the private test environment and the separate
  `samma_auth_registration_experiment` database. This exercises real Auth.js and
  PostgreSQL with simulated OIDC network responses. It is not live email/OIDC
  acceptance. It aliases only Next's server-only marker for Node execution.
- `verify-provider-mail.py prepare` creates one unique unverified provider test
  identity and requests provider verification email. Its mode-0600 manifest is
  `/etc/samma-dev/auth-registration-validation/provider-mail.json`.
- `verify-provider-mail.py wait verification` reads only mail for that exact tag,
  including cPanel's `INBOX.auth-test-…` folder. It stores the link privately.
- `PLAYWRIGHT_MODULE=<installed module> node infrastructure/auth/verify-provider-mail.cjs`
  exercises verification, native Forgot Password, mailbox delivery, reset, old
  password rejection and new password success. Provider redirects to SAMMA are
  inspected before following them and intercepted; this does not test the live
  application callback. No traces or credential/request logs are recorded.
- `SAMMA_PROVIDER_MAIL_RESUME_PASSWORD_CHECKS=true` resumes only the last password
  checks if a previous run already completed reset; it is not evidence of skipped
  delivery/link steps. Keep their actual preceding mailbox evidence.
- `verify-provider-mail.py cleanup` deletes only the manifest-bound synthetic
  provider identity. Retain delivery evidence privately, archive that directory
  before a fresh run, and remove test passwords/expired links when no longer needed.

Before merging, run typecheck, affected lint, production build and the existing
development audit gate. No schema changed; use existing migrations only to
initialize isolated test storage. Do not run unrelated records/storage suites.
After Phil approves the merge, deploy exact DEV and run actual Person and Company
registration end to end. Port 2022 stays preview-only; do not route candidate
auth through it or through a substituted DEV origin.

## Rollback / persistence

Initial snapshots are private `/etc/samma-dev/auth-registration-before-*.json`
and `/etc/samma-dev/auth-registration-proxy-backup/`. Snapshots can contain
provider secrets or masked values; never copy them to Git or bulk-restore a
stale realm representation. Review current state and restore only fields changed
by this task. Disable registration/recovery before removing their rate-limit
gate. Keep verified-email enforcement and owner identities intact. Restore and
validate/reload only the previous auth Caddy include if needed, then stop only
`samma-auth-limit`. Restore the previous password policy only after review;
do not remove the denylist while the provider policy still references it.

After approved DEV merge, reconcile the limiter's read-only config mount and
Keycloak blacklist mount to the reviewed checkout before removing the experiment
worktree. No provider restart, proxy modification or application deployment
should be inferred merely from a Git branch switch.
