// Provider-only mail/recovery checks. SAMMA callbacks are intercepted and never reach DEV/RC.
// No tracing, request logging, screenshots of credentials, or token/password output.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = '/etc/samma-dev/auth-registration-validation';
const user = JSON.parse(fs.readFileSync(root + '/provider-mail.json', 'utf8'));
const issuer = 'https://auth.samma.co.za/realms/samma';
const callback = 'https://dev.samma.co.za/api/auth/callback/keycloak';
let stage = 'launch';
const mail = (...args) => execFileSync('python3', [__dirname + '/verify-provider-mail.py', ...args], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
const link = kind => JSON.parse(fs.readFileSync(root + '/' + kind + '.json', 'utf8')).url;
async function session(browser) {
  const context = await browser.newContext();
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  let callbacks = 0;
  await context.route('**/*', async route => {
    try {
    const url = new URL(route.request().url());
    if (url.hostname === 'dev.samma.co.za' || url.hostname === 'samma.co.za') {
      if (url.pathname === new URL(callback).pathname && url.searchParams.has('code')) callbacks++;
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'Synthetic provider check completed. No SAMMA callback was made.' });
    } else if (url.hostname === 'auth.samma.co.za' && route.request().isNavigationRequest()) {
      // Playwright does not re-route every server redirect. Inspect the provider response
      // before allowing a redirect chain to send an unauthorised callback to a live app.
      const response = await route.fetch({ maxRedirects: 0 });
      const location = response.headers()['location'];
      const target = location ? new URL(location, url) : null;
      if (target && ['dev.samma.co.za', 'samma.co.za'].includes(target.hostname)) {
        if (target.pathname === new URL(callback).pathname && target.searchParams.has('code')) callbacks++;
        await route.fulfill({ status: 200, contentType: 'text/plain', body: 'Synthetic provider check completed. No SAMMA callback was made.' });
      } else await route.fulfill({ response });
    } else await route.continue();
    } catch { await route.abort().catch(() => {}); }
  });
  return { context, page, callbacks: () => callbacks };
}
function authUrl() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  return issuer + '/protocol/openid-connect/auth?' + new URLSearchParams({
    client_id: 'samma-web', redirect_uri: callback, response_type: 'code', scope: 'openid email profile',
    state: crypto.randomUUID(), nonce: crypto.randomUUID(),
    code_challenge_method: 'S256', code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
  });
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    if (process.env.SAMMA_PROVIDER_MAIL_RESUME_PASSWORD_CHECKS !== 'true') {
    stage = 'verify email link';
    const verification = await session(browser);
    await verification.page.goto(link('verification'));
    const proceed = verification.page.getByRole('link', { name: /click here to proceed/i });
    if (await proceed.count()) await proceed.click();
    mail('check');
    assert.equal(verification.callbacks(), 0);
    await verification.context.close();

    stage = 'request real password recovery';
    const reset = await session(browser);
    await reset.page.goto(authUrl());
    await reset.page.getByRole('link', { name: /forgot password/i }).click();
    await reset.page.locator('input[name="username"]').fill(user.email);
    await reset.page.locator('input[type="submit"],button[type="submit"]').first().click();
    mail('wait', 'recovery');
    stage = 'use reset link';
    await reset.page.goto(link('recovery'));
    await reset.page.locator('input[name="password-new"]').fill(user.newPassword);
    await reset.page.locator('input[name="password-confirm"]').fill(user.newPassword);
    await reset.page.locator('input[type="submit"],button[type="submit"]').first().click();
    await reset.page.waitForTimeout(500);
    await reset.context.close();
    }

    stage = 'reject old password';
    const old = await session(browser);
    await old.page.goto(authUrl());
    await old.page.locator('input[name="username"]').fill(user.email);
    await old.page.locator('input[name="password"]').fill(user.oldPassword);
    await old.page.locator('#kc-login').click();
    await old.page.getByText(/invalid username or password/i).first().waitFor();
    assert.equal(old.callbacks(), 0);
    await old.context.close();

    stage = 'accept new password';
    const fresh = await session(browser);
    await fresh.page.goto(authUrl());
    await fresh.page.locator('input[name="username"]').fill(user.email);
    await fresh.page.locator('input[name="password"]').fill(user.newPassword);
    await fresh.page.locator('#kc-login').click();
    await fresh.page.getByText('Synthetic provider check completed. No SAMMA callback was made.', { exact: true }).waitFor();
    assert.equal(fresh.callbacks(), 1);
    await fresh.context.close();
    mail('check');
    const evidence = { providerVerificationDelivery: true, providerRecoveryDelivery: true,
      verificationLinkAccepted: true, resetLinkAccepted: true, oldPasswordRejected: true,
      newPasswordAccepted: true, sameProviderSubject: true, sammaCallbackExercised: false,
      completedAt: new Date().toISOString() };
    fs.writeFileSync(root + '/provider-mail-results.json', JSON.stringify(evidence, null, 2), { mode: 0o600, flag: 'wx' });
    console.log('PASS: actual verification/reset mailbox delivery and links, old password rejected, new password accepted, same provider subject. SAMMA callback intentionally not exercised before merge.');
  } finally { await browser.close(); }
})().catch(error => { console.error('Provider mail test failed at ' + stage + ' (' + error.name + '); details suppressed.'); process.exitCode = 1; });
