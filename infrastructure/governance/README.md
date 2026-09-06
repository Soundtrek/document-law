# Governance user directory validation

Run `apps/web/lib/governance-users.test.tsx` only against a disposable PostgreSQL
DB named `samma_directory_test`. Create its empty schema with Prisma `db push`,
then set `DATABASE_URL` and run:

```
node_modules/.bin/tsx --test apps/web/lib/governance-users.test.tsx
npm run typecheck --workspace @samma/web
```

Tests create synthetic database fixtures. Destroy the disposable database after
validation. Never use the SAMMA DEV/RC database for this harness.

Build an exact clean experiment commit with the existing bounded
`infrastructure/docker/build-candidate.sh`. After building, generate the
optional empty-state static preview:

```
node scripts/with-build-metadata.mjs node_modules/.bin/tsx infrastructure/governance/render-preview.tsx
```

This creates an ignored build artifact at `/experiment-preview/users.html`,
using the same list component and CSS, with no accounts, DB connection or auth
bypass. On port 2022 `/governance/users` and account detail remain protected.
The preview's search explains that real search requires DEV Governance login.
Do not copy this generated artifact to a DEV or RC release. Real login acceptance
on `dev.samma.co.za` requires Phil's approval to merge and deploy first.

`verify-http.cjs` verifies the production Next routes against the same disposable
fixtures. Start the candidate on loopback with that database, synthetic auth
configuration (issuer `https://identity.example.test`), Governance MFA enabled,
and `SAMMA_DEV_IDENTITY_ENABLED=false`, then run with
`SAMMA_DIRECTORY_TEST_URL=http://127.0.0.1:<port>`. The harness uses only the
synthetic test sessions, never a real user's cookie or provider credentials.
