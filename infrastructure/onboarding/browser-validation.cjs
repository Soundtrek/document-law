// Real Keycloak DEV browser journeys. All identities/screenshots are synthetic; secrets stay outside Git.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.env.SAMMA_ONBOARDING_VALIDATION_DIR;
const users = JSON.parse(fs.readFileSync(root + '/users.json', 'utf8'));
const base = 'https://samma.co.za', candidate = process.env.SAMMA_CANDIDATE_URL;
if (!candidate || !root) throw new Error('Isolated candidate and private validation directory required');
let stage = 'start';
async function contextFor(browser, width = 1440) {
 const context = await browser.newContext({ viewport: { width, height: 1000 } });
 context.setDefaultTimeout(20000); context.setDefaultNavigationTimeout(25000);
 await context.route(/^https:\/\/(auth\.)?samma\.co\.za\//, async route => {
  try {
   const original = new URL(route.request().url());
   const response = await route.fetch({ url: original.origin === base ? candidate + original.pathname + original.search : original.href, maxRedirects: 0, headers: await route.request().allHeaders() });
   const location = response.headers()['location'];
   if (location && new URL(location, original).origin === base) {
    const headers = response.headers();
    for (const name of ['location', 'content-security-policy', 'content-length', 'content-encoding']) delete headers[name];
    await route.fulfill({ status: 200, headers: { ...headers, 'content-type': 'text/html' }, body: '<script>location.replace(' + JSON.stringify(new URL(location, original).href).replaceAll('<', '\\u003c') + ')</script>' });
   } else await route.fulfill({ response });
  } catch { await route.abort().catch(() => {}); }
 });
 return context;
}
async function fits(page) { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow'); }
async function shots(page, label) {
 for (const width of [1440, 768, 390]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  await fits(page);
  await page.screenshot({ path: root + '/' + label + '-' + width + '.png', fullPage: true });
 }
}
async function begin(page, choice) {
 await page.goto(base + '/');
 await page.getByRole('button', { name: choice, exact: true }).click();
 await page.waitForURL('https://auth.samma.co.za/**');
 const url = new URL(page.url());
 assert.equal(url.searchParams.get('redirect_uri'), base + '/api/auth/callback/keycloak');
 assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
 assert.ok(url.searchParams.get('state') && url.searchParams.get('nonce'));
 assert.equal(url.searchParams.has('onboardingChoice'), false);
 await fits(page);
}
async function credentials(page, user) {
 await page.locator('#username').fill(user.email);
 await page.locator('#password').fill(user.password);
 await page.locator('#kc-login').click();
}
async function post(page, data, origin) {
 return page.evaluate(async ({ data, origin }) => {
  const response = await fetch('/api/onboarding/company', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(origin ? { Origin: origin } : {}) }, body: new URLSearchParams(data) });
  return response.status;
 }, { data, origin });
}
(async () => {
 const browser = await chromium.launch({ headless: true });
 try {
  const personUser = users.find(u => u.label === 'person'), companyUser = users.find(u => u.label === 'company');
  const personContext = await contextFor(browser), personPage = await personContext.newPage();
  stage = 'public and route protection';
  await personPage.goto(base); await shots(personPage, 'entry');
  for (const path of ['/person', '/company', '/onboarding/company', '/governance', '/legal-access']) {
   await personPage.goto(base + path); assert.equal(new URL(personPage.url()).pathname, '/sign-in');
  }
  assert.equal((await personContext.request.get(candidate + '/api/health')).status(), 200);
  const ready = await personContext.request.get(candidate + '/api/ready'); assert.equal(ready.status(), 200); assert.equal((await ready.json()).storage, true);
  const invalid = await personContext.request.post(candidate + '/api/auth/signin/keycloak', { headers: { Origin: base }, form: { onboardingChoice: 'GOVERNANCE' } });
  assert.equal(invalid.status(), 400);
  stage = 'Person first login';
  await begin(personPage, 'Person'); await credentials(personPage, personUser);
  await personPage.waitForURL(base + '/person');
  await personPage.getByText('No company relationships yet.').waitFor();
  assert.equal(await personPage.getByRole('link', { name: /create company|company info center|governance/i }).count(), 0);
  const text = await personPage.locator('body').innerText(); assert.ok(text.includes('No records'));
  await shots(personPage, 'person');
  const personCookie = (await personContext.cookies(base)).find(c => c.name === '__Host-samma.session-token');
  assert.ok(personCookie?.secure && personCookie.httpOnly && personCookie.sameSite === 'Lax');
  assert.equal((await personContext.cookies(base)).some(c => c.name.includes('onboarding') || c.name.includes('company-setup')), false);
  assert.equal(await post(personPage, { name: 'Forged Company', role: 'OWNER' }), 403);
  for (const path of ['/governance', '/company/people/alex', '/records/unknown']) {
   await personPage.goto(base + path); assert.ok((await personPage.locator('body').innerText()).includes('404'));
  }
  console.log('PASS Person real Keycloak bootstrap, empty state, no company/create action, consumed state, protected resources; 1440/768/390');
  const companyContext = await contextFor(browser), companyPage = await companyContext.newPage();
  stage = 'Company first login';
  await begin(companyPage, 'Company'); await credentials(companyPage, companyUser);
  await companyPage.waitForURL(base + '/onboarding/company');
  await companyPage.getByLabel('Company name').waitFor();
  await shots(companyPage, 'company-setup');
  const setupCookies = await companyContext.cookies(base);
  const setup = setupCookies.find(c => c.name === '__Host-samma.company-setup');
  assert.ok(setup?.secure && setup.httpOnly && setup.sameSite === 'Lax');
  // Another authenticated Account cannot reuse this company's setup cookie.
  await personContext.addCookies([setup]);
  await personPage.goto(base + '/person');
  assert.equal(await post(personPage, { name: 'Cross Account Company' }), 400);
  await personContext.clearCookies({ name: '__Host-samma.company-setup' });
  stage = 'Company abandonment and invalid fields';
  await companyPage.getByRole('link', { name: 'Set up later' }).click(); await companyPage.waitForURL(base + '/person');
  assert.equal(await companyPage.getByRole('link', { name: 'Company Info Center' }).count(), 0);
  await companyPage.goto(base + '/onboarding/company');
  for (const extra of [{ role: 'HR' }, { role: 'OWNER' }, { companyId: 'forged' }, { accountType: 'COMPANY' }, { capability: 'platform.roles.manage' }]) {
   assert.equal(await post(companyPage, { name: 'Synthetic Company', ...extra }), 400);
  }
  assert.equal(await post(companyPage, { name: ' ' }), 400);
  const cookieHeader = setupCookies.map(c => c.name + '=' + c.value).join('; ');
  assert.equal((await companyContext.request.post(candidate + '/api/onboarding/company', { headers: { Origin: 'https://foreign.example.test', Cookie: cookieHeader }, form: { name: 'Synthetic CSRF' } })).status(), 403);
  stage = 'Company submit';
  await companyPage.getByLabel('Company name').fill('Synthetic Onboarding Workspace');
  await companyPage.getByRole('button', { name: 'Create company workspace' }).click();
  await companyPage.waitForURL(base + '/company');
  await companyPage.getByRole('heading', { name: 'Synthetic Onboarding Workspace' }).waitFor();
  assert.ok((await companyPage.locator('body').innerText()).includes('Company Owner'));
  assert.equal(await companyPage.getByRole('link', { name: 'Governance', exact: true }).count(), 0);
  assert.equal((await companyContext.cookies(base)).some(c => c.name === '__Host-samma.company-setup'), false);
  await shots(companyPage, 'company');
  stage = 'Company repeated submit';
  await companyContext.addCookies([setup]);
  assert.equal(await post(companyPage, { name: 'A duplicate must not be created' }), 200);
  await companyPage.goto(base + '/company');
  assert.equal(await companyPage.getByRole('heading', { name: 'Synthetic Onboarding Workspace' }).count(), 1);
  const companyCookie = (await companyContext.cookies(base)).find(c => c.name === '__Host-samma.session-token');
  fs.writeFileSync(root + '/onboarding-browser-result.json', JSON.stringify({ personCookie, companyCookie }), { mode: 0o600 });
  console.log('PASS Company real Keycloak setup, abandon, explicit name, OWNER only, dual navigation, replay and cross-account/field/Origin rejection; 1440/768/390');
  stage = 'Person logout';
  await personPage.goto(base + '/person');
  await personPage.getByRole('button', { name: 'Sign out', exact: true }).click();
  await personPage.waitForURL('https://auth.samma.co.za/**');
  if (await personPage.locator('#kc-logout').count()) await personPage.locator('#kc-logout').click();
  await personPage.waitForURL(base + '/');
  await personContext.addCookies([personCookie]);
  await personPage.goto(base + '/person'); assert.equal(new URL(personPage.url()).pathname, '/sign-in');
  await personContext.close();
  console.log('PASS real logout and revoked-session replay rejection');
  for (const width of [768, 390]) {
   stage = 'repeat Person login ' + width;
   const context = await contextFor(browser, width), page = await context.newPage();
   // Normal login retains Person destination without another onboarding selection.
   await page.goto(base + '/sign-in'); await page.getByLabel('Email address').fill(personUser.email);
   await page.getByRole('button', { name: 'Continue with email' }).click();
   await page.waitForURL('https://auth.samma.co.za/**'); await credentials(page, personUser);
   await page.waitForURL(base + '/person'); await fits(page);
   assert.equal(await page.getByRole('link', { name: 'Company Info Center' }).count(), 0);
   await context.close();
  }
  stage = 'repeat Company login';
  const repeatContext = await contextFor(browser, 390), repeatPage = await repeatContext.newPage();
  await begin(repeatPage, 'Company'); await credentials(repeatPage, companyUser);
  await repeatPage.waitForURL(base + '/company'); await fits(repeatPage);
  assert.equal((await repeatContext.cookies(base)).some(c => c.name === '__Host-samma.company-setup'), false);
  await repeatContext.close();
  stage = 'tampered flow';
  const tamperContext = await contextFor(browser), tamperPage = await tamperContext.newPage();
  await begin(tamperPage, 'Person');
  const flowCookie = (await tamperContext.cookies(base)).find(c => c.name === '__Host-samma.onboarding-flow');
  assert.ok(flowCookie);
  await tamperContext.addCookies([{ ...flowCookie, value: 'invalid-state' }]);
  await credentials(tamperPage, personUser);
  await tamperPage.waitForURL(base + '/sign-in**');
  assert.equal((await tamperContext.cookies(base)).some(c => c.name === '__Host-samma.session-token'), false);
  await tamperContext.close();
  stage = 'unverified identity';
  const unverifiedContext = await contextFor(browser), unverifiedPage = await unverifiedContext.newPage();
  await begin(unverifiedPage, 'Person'); await credentials(unverifiedPage, users.find(u => u.label === 'unverified'));
  await unverifiedPage.waitForTimeout(1000);
  assert.equal(new URL(unverifiedPage.url()).origin, 'https://auth.samma.co.za');
  assert.equal((await unverifiedContext.cookies(base)).some(c => c.name === '__Host-samma.session-token'), false);
  await unverifiedContext.close(); await companyContext.close();
  console.log('PASS normal Person repeat login, Company repeat login, tampered flow and unverified identity denial');
 } finally { await browser.close(); }
})().catch(error => { console.error('FAIL onboarding browser stage:', stage, error.name, error.message?.split('\n')[0]); process.exitCode = 1; });
