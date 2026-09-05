# Real Authentication V1 — preflight

2026-09-05: **BLOCKED before implementation/deployment.**

## Blocker

Both authoritative servers (`ns1.host-ww.net`, `ns2.host-ww.net`) return
`NXDOMAIN` for `auth.samma.co.za`; HTTPS fails at DNS resolution. No connected
DNS management tool is available. Add an A record pointing to `105.233.36.146`
(the existing SAMMA public address), then validate DNS and HTTPS. No alternate
issuer or insecure workaround was introduced, following the owner's stop condition.

## Completed inspection

- Baseline: `1c9fce19fda9b37fc89ed6e178653d813feab4bc`; initially clean checkout.
- Account has a stable ID, unique primary email, verification flag and status.
  AccountIdentity uniquely binds `(provider, providerSubject)` to Account;
  Person has a unique Account link. These existing models can be retained.
- The identity package exposes principal/provider interfaces and email/MFA
  guards. Its in-memory link registry rejects email-only resolution.
- Sign-in is a non-authenticating preview. No OIDC callback, logout,
  middleware/proxy or persistent application sessions exist.
- Person/company/record/Legal Access pages render synthetic fixtures and fixed
  actors. Real authentication must include Account-bound server projections;
  adding a login gate alone would not establish resource authorisation.
- GovernanceCapabilityGrant already supports explicit capabilities/revocation.
  The current page uses a synthetic principal with three capabilities instead.
- Compose runs `next dev` from this writable checkout. Live runtime confirms
  `SAMMA_DEV_IDENTITY_ENABLED=true`. Use an isolated checkout for implementation
  so incomplete changes cannot be published by the live development server.
- PostgreSQL has no host port, uses the internal `juanity-dev` network and binds
  data to `/srv/nuc-archive/juanity/postgres`. The wrapper checks archive UUID.
- Web joins `caddy-net` and binds host port `127.0.0.1:2020`. The existing SAMMA
  Caddy include only proxies `samma.co.za` to `juanity-app:3000`.
- `.env.nuc` is mode 0600, containing database password and pinned Node image
  keys. Values were not printed. No SAMMA OIDC configuration exists.
- Database history confirms applied `0001_initial_schema`. No migration was
  generated/applied. A backup/checkpoint is still required before migration.
- Resource snapshot: 7.4 GiB available RAM; 28 GiB root and 191 GiB archive disk
  free; load about 1; swap usage about 2.5 GiB. Recheck before starting services.

## Accepted direction, not yet implemented

Use Keycloak with Authorization Code + PKCE and a maintained OIDC/session
library. Do not implement password hashing, recovery or session cryptography.
Retain stable Accounts and issuer/provider-subject links, with no email-only
merges. Persist revocable server sessions; enforce verified email, server-side
resource/capability checks, CSRF protection, safe redirects and audit.

Keycloak version, realm/issuer and client are not yet selected/provisioned.
Intended hostname: `auth.samma.co.za`. Persistence must use a private database
separate from SAMMA domain tables, with conservative limits and tested backups
and restart behaviour. Consult official Keycloak guidance for
[hostname](https://www.keycloak.org/server/hostname),
[reverse proxy](https://www.keycloak.org/server/reverseproxy) and
[containers](https://www.keycloak.org/server/containers).

Exactly `phil@samma.co.za` and `juanita@samma.co.za` are approved initial
Governance Owners using explicit current capabilities, without a universal
bypass. Pre-provisioned subjects must be linked through controlled bootstrap.
Administrative email verification is approved only for these two DEV bootstrap
identities and must be audited when performed. No accounts/grants were created.

**MFA IS TEMPORARILY DISABLED FOR DEV/INITIAL SETUP** is the approved target
policy, not a claim that a realm is configured. Preserve MFA support and enable
Governance MFA before real sensitive client data.

## Credential checklist

Created `/etc/samma-dev/bootstrap-credentials.txt`, owned by `philip:philip`,
mode `0600`, outside Git. All temporary-password fields are blank; no passwords
were generated, read, logged or committed. The file is not mounted into web or
copied into an image. Phil must fill passwords locally, not in chat. Provisioning
must pause while blank. Pass credentials only to Keycloak's intended provisioning
mechanism and require replacement at first login. Update the checklist only when
confirmed; delete once both accounts have safely stored their credentials.

## Validation/deployment status

DNS, migration-history read, live identity flag and file metadata checks completed.
Landing HTTPS still returns 200. No application changes: Prisma validation,
tests, typecheck, lint and production build were not rerun. Login, logout,
verification, Governance positive/negative and restart tests remain pending.

No deployment commit, image replacement, migration, Caddy reload or DNS change.
Two temporary network-disabled containers using the existing Node image created
and set ownership of the host checklist, then were removed. No long-running
services changed. Document engine, relationship model, Legal Access, landing
and unrelated NUC workloads remain unchanged. **Public synthetic identity is
still enabled on the baseline; Real Authentication V1 is not deployed.**
