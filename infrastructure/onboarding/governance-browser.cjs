// Explicit synthetic capability fixture; no real user's password/session is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.env.SAMMA_ONBOARDING_VALIDATION_DIR, candidate = process.env.SAMMA_CANDIDATE_URL;
const user = JSON.parse(fs.readFileSync(root + '/users.json', 'utf8')).find(u => u.label === 'company');
const mutate = action => execFileSync('/tmp/samma-onboarding-run', ['node_modules/.bin/tsx', 'infrastructure/onboarding/verify-browser.ts', action], { stdio: 'pipe' });
(async () => {
 const browser = await chromium.launch({ headless: true });
 try {
  const context = await browser.newContext();
  context.setDefaultTimeout(20000); context.setDefaultNavigationTimeout(25000);
  await context.route(/^https:\/\/(auth\.)?samma\.co\.za\//, async route => {
   const original = new URL(route.request().url());
   const response = await route.fetch({ url: original.origin === 'https://samma.co.za' ? candidate + original.pathname + original.search : original.href, maxRedirects: 0, headers: await route.request().allHeaders() });
   const location = response.headers()['location'];
   if (location && new URL(location, original).origin === 'https://samma.co.za') {
    const headers = response.headers();
    for (const name of ['location', 'content-security-policy', 'content-length', 'content-encoding']) delete headers[name];
    await route.fulfill({ status: 200, headers: { ...headers, 'content-type': 'text/html' }, body: '<script>location.replace(' + JSON.stringify(new URL(location, original).href).replaceAll('<', '\\u003c') + ')</script>' });
   } else await route.fulfill({ response });
  });
  const page = await context.newPage();
  await page.goto('https://samma.co.za/sign-in');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByRole('button', { name: 'Continue with email' }).click();
  await page.waitForURL('https://auth.samma.co.za/**');
  await page.locator('#password').fill(user.password); await page.locator('#kc-login').click();
  await page.waitForURL('https://samma.co.za/person');
  await page.goto('https://samma.co.za/governance'); assert.ok((await page.locator('body').innerText()).includes('404'));
  mutate('governance-grant');
  try {
   await page.reload(); assert.ok((await page.locator('body').innerText()).includes('Record policy and platform controls'));
  } finally { mutate('governance-revoke'); }
  await page.reload(); assert.ok((await page.locator('body').innerText()).includes('404'));
  console.log('PASS Governance denial, explicit synthetic capability access, immediate revocation on same real OIDC session');
 } finally { for (const context of browser.contexts()) await context.unrouteAll({ behavior: "ignoreErrors" }); await browser.close(); }
})().catch(error => { console.error('Governance browser regression failed', error.name); process.exitCode = 1; });
