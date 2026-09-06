# Onboarding validation

Use disposable synthetic identities and a separate database named
`samma_onboarding_experiment`. Never run the mutation suites on normal DEV data.
Apply only the repository's existing three migrations; seed the active `OWNER`
definition with the already approved membership/settings capabilities.

- `npm run test:onboarding`: encrypted state, strict choice and name validation.
- `tsx infrastructure/onboarding/verify.ts`: real PostgreSQL bootstrap, identity,
  transaction rollback, concurrency, revocation and privilege-negative cases.
- `prepare-identities.py`: create disposable real Keycloak DEV identities using
  the existing operator-only administration boundary. Set
  `SAMMA_ONBOARDING_VALIDATION_DIR` to a private directory. No realm/client
  configuration changes or SAMMA identity pre-links are made. Run with `cleanup`
  after validation to delete only identities in that manifest.
- `browser-validation.cjs`: fresh Person/Company journeys, retries, tampering,
  invalid fields, logout and screenshots at 1440/768/390. Set
  `SAMMA_CANDIDATE_URL` to the loopback candidate,
  `SAMMA_ONBOARDING_VALIDATION_DIR` to the private directory and
  `PLAYWRIGHT_MODULE` to the installed Playwright module if needed.
- `tsx infrastructure/onboarding/verify-browser.ts`: assert database outcomes
  after browser validation, before adding any unrelated regression fixtures.
- `governance-browser.cjs`: real synthetic OIDC login, Governance denial, explicit
  test grant and immediate revocation. This operator test uses
  `/tmp/samma-onboarding-run` to invoke `verify-browser.ts` inside the isolated
  database environment. That runner must mount the private directory at
  `/validation`; credentials must never be printed or mounted into the web app.

The browser routes SAMMA requests to an isolated candidate while keeping the
canonical HTTPS origin, real Keycloak provider, code, state, nonce and PKCE checks.
No OIDC client redirect changes, mocked provider or public routing changes are
required. Screenshots contain synthetic UI only; manifests/session artifacts stay
outside Git with private permissions. Clean up test objects using the existing
storage fixture cleanup before dropping the disposable database.
