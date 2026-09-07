// Actual HTTPS DEV flows, using only the private manifest's disposable synthetic people.
// Never log passwords, cookies, verification URLs, mail payloads or request bodies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.env.SAMMA_EMPLOYMENT_BROWSER_DIR;
const users = JSON.parse(fs.readFileSync(root + '/users.json', 'utf8'));
for (const user of Object.values(users)) assert.match(user.email, /^employment-(owner|existing|new)-[a-f0-9]{12}@example\.test$/);
const base = 'https://dev.samma.co.za', mailbox = 'http://192.168.1.152:8025';
const companyName = 'Synthetic Employment Introduction ' + users.owner.email.split('@')[0].slice(-6);
let stage = 'launch';
const results = { companyName };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function mailFor(email, employment) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const list = await (await fetch(mailbox + '/api/v1/search?query=' + encodeURIComponent('to:' + email))).json();
    const item = (list.messages || []).find(m => m.To.some(to => to.Address === email) && (employment ? m.Subject.includes('Employment records invitation') : /verify/i.test(m.Subject)));
    if (item) return (await fetch(mailbox + '/api/v1/message/' + item.ID)).json();
    await pause(1000);
  }
  throw new Error('Expected synthetic email missing');
}
async function register(browser, label, choice) {
  const context = await browser.newContext(); context.setDefaultTimeout(25000);
  const page = await context.newPage(), user = users[label];
  stage = label + ' registration';
  await page.goto(base + '/onboarding');
  await page.getByRole('button', { name: choice, exact: true }).click();
  await page.waitForURL('https://auth.samma.co.za/**');
  await page.locator('#email').fill(user.email);
  await page.locator('#firstName').fill('Synthetic');
  await page.locator('#lastName').fill('Employment ' + label);
  if (await page.locator('#password').count()) {
    await page.locator('#password').fill(user.password);
    await page.locator('#password-confirm').fill(user.password);
  }
  await page.locator('input[type="submit"],button[type="submit"]').first().click();
  stage = label + ' verification';
  const message = await mailFor(user.email, false);
  const text = (message.Text || '') + '\n' + (message.HTML || '').replaceAll('&amp;', '&');
  const link = text.match(/https:\/\/auth\.samma\.co\.za\/realms\/samma\/login-actions\/action-token\?[^\s<>"']+/)?.[0];
  assert.ok(link);
  await page.goto(link);
  // Keycloak may ask for confirmation when the link opens outside its original request.
  const proceed = page.getByRole('link', { name: /click here to proceed/i });
  if (await proceed.count()) await proceed.click();
  // Email-first registration verifies before asking for the new password.
  if (new URL(page.url()).hostname === 'auth.samma.co.za') {
    const password = page.locator('#password-new');
    await password.waitFor();
    await password.fill(user.password);
    await page.locator('#password-confirm').fill(user.password);
    await page.locator('input[type="submit"],button[type="submit"]').first().click();
  }
  await page.waitForURL(url => url.origin === base && ['/person', '/onboarding/company'].includes(url.pathname));
  results[label] = { accountId: (await (await context.request.get(base + '/api/auth/session')).json()).user.id, verificationDelivered: true };
  if (choice === 'Company') {
    await page.getByLabel('Company name').fill(companyName);
    await page.getByRole('button', { name: 'Create company workspace' }).click();
    await page.waitForURL(base + '/company');
  }
  return { context, page };
}
async function login(browser, label) {
  const context = await browser.newContext(); context.setDefaultTimeout(25000);
  const page = await context.newPage(), user = users[label];
  await page.goto(base + '/sign-in');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByRole('button', { name: 'Continue with email' }).click();
  await page.waitForURL('https://auth.samma.co.za/**');
  await page.locator('#password').fill(user.password);
  await page.locator('#kc-login').click();
  await page.waitForURL(base + (label === 'owner' ? '/company' : '/person'));
  return { context, page };
}
function databaseCheck(phase) {
  // Script prints only fixed success labels; synthetic manifest stays on stdin.
  const output = execFileSync('docker', ['exec', '-i', 'samma-dev-web', 'node_modules/.bin/tsx', 'infrastructure/employment/verify-live.ts', phase],
    { input: JSON.stringify({ users, ...results }), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000 });
  assert.ok(output.includes('PASS'));
}
async function screenshot(page, label) {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: root + '/' + label + '-' + width + '.png', fullPage: true });
  }
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    if (process.argv[2] === 'prepare') {
      await (await register(browser, 'owner', 'Company')).context.close();
      await (await register(browser, 'existing', 'Person')).context.close();
      fs.writeFileSync(root + '/prepared.json', JSON.stringify(results), { mode: 0o600 });
      console.log('PASS: synthetic Company owner and existing Person registered and verified through unchanged DEV flows.');
      return;
    }
    Object.assign(results, JSON.parse(fs.readFileSync(root + '/prepared.json', 'utf8')));
    const owner = await login(browser, 'owner');
    let ownerCsrf;
    owner.page.on('request', request => { if (request.url() === base + '/api/employment-invitations') ownerCsrf = request.headers()['x-samma-csrf']; });
    async function send(email) {
      await owner.page.goto(base + '/company');
      await owner.page.getByRole('link', { name: 'Add person', exact: true }).click();
      await owner.page.waitForURL(base + '/company/people/add?companyId=*');
      results.companyId = new URL(owner.page.url()).searchParams.get('companyId');
      assert.ok(results.companyId);
      await owner.page.getByLabel('Email address').fill(email);
      const sentResponse = owner.page.waitForResponse(response => response.url() === base + '/api/employment-invitations' && response.request().method() === 'POST');
      await owner.page.getByRole('button', { name: 'Send invite', exact: true }).click();
      await owner.page.getByRole('heading', { name: 'Invitation sent', exact: true }).waitFor();
      const message = await mailFor(email, true);
      assert.equal(message.Subject, 'SAMMA — Employment records invitation from ' + companyName);
      assert.ok(message.Text.includes(base + '/person')); assert.ok(!message.Text.includes('token='));
      return (await sentResponse).json();
    }
    stage = 'existing Person invitation';
    await send(users.existing.email); await screenshot(owner.page, 'company-pending');
    const existing = await login(browser, 'existing');
    await existing.page.getByRole('heading', { name: 'Pending invitations', exact: true }).waitFor();
    await existing.page.getByRole('heading', { name: companyName, exact: true }).waitFor();
    await screenshot(existing.page, 'person-pending');
    let personCsrf;
    existing.page.on('request', request => { if (request.url() === base + '/api/employment-invitations') personCsrf = request.headers()['x-samma-csrf']; });
    await existing.page.getByRole('button', { name: 'Accept', exact: true }).click();
    await existing.page.locator('#companies').getByText(companyName + ' · ACTIVE', { exact: true }).waitFor();
    assert.equal(await existing.page.getByRole('link', { name: 'Company Info Center', exact: true }).count(), 0);
    await screenshot(existing.page, 'person-active');
    stage = 'new Person invitation before registration';
    const newInvitation = await send(users.new.email);
    for (const action of ['accept', 'decline']) assert.equal((await existing.context.request.post(base + '/api/employment-invitations', { headers: { Origin: base, 'X-SAMMA-CSRF': personCsrf }, data: { action, invitationId: newInvitation.invitationId } })).status(), 403);
    databaseCheck('before-new');
    const newcomer = await register(browser, 'new', 'Person');
    // Normal verified login also finds the inbox, independent of registration continuation.
    await newcomer.context.close();
    const fresh = await login(browser, 'new');
    await fresh.page.getByRole('heading', { name: 'Pending invitations', exact: true }).waitFor();
    await fresh.page.getByRole('button', { name: 'Accept', exact: true }).click();
    await fresh.page.locator('#companies').getByText(companyName + ' · ACTIVE', { exact: true }).waitFor();
    await owner.page.goto(base + '/company');
    assert.equal(await owner.page.getByRole('link', { name: 'View person', exact: true }).count(), 2);
    // OWNER-only membership can invite people but has no record-definition role.
    assert.equal(await owner.page.getByRole('link', { name: 'Add record', exact: true }).count(), 0);
    for (const label of ['existing', 'new']) assert.ok((await owner.page.locator('body').innerText()).includes(users[label].email));
    await screenshot(owner.page, 'company-people');
    stage = 'CSRF and company authorization';
    const requestData = { action: 'send', companyId: results.companyId, email: users.existing.email };
    for (const headers of [{}, { Origin: 'https://foreign.example.test', 'X-SAMMA-CSRF': ownerCsrf }, { Origin: base }, { Origin: base, 'X-SAMMA-CSRF': 'wrong' }]) {
      assert.equal((await owner.context.request.post(base + '/api/employment-invitations', { headers, data: requestData })).status(), 403);
    }
    assert.equal((await existing.context.request.post(base + '/api/employment-invitations', { headers: { Origin: base, 'X-SAMMA-CSRF': personCsrf }, data: requestData })).status(), 403);
    assert.equal((await owner.context.request.post(base + '/api/employment-invitations', { headers: { Origin: base, 'X-SAMMA-CSRF': ownerCsrf }, data: { ...requestData, companyId: 'wrong-company' } })).status(), 403);
    assert.equal((await owner.context.request.post(base + '/api/employment-invitations', { headers: { Origin: base, 'X-SAMMA-CSRF': ownerCsrf }, data: { ...requestData, role: 'OWNER' } })).status(), 400);
    stage = 'decline and revoke UI';
    await send(users.existing.email);
    await existing.page.reload();
    await existing.page.getByRole('button', { name: 'Decline', exact: true }).click();
    await existing.page.getByRole('button', { name: 'Decline', exact: true }).waitFor({ state: 'detached' });
    await send(users.new.email);
    await owner.page.getByRole('button', { name: 'Revoke', exact: true }).click();
    await owner.page.getByRole('button', { name: 'Revoke', exact: true }).waitFor({ state: 'detached' });
    databaseCheck('complete');
    results.completedAt = new Date().toISOString(); results.passed = true;
    fs.writeFileSync(root + '/result.json', JSON.stringify(results, null, 2), { mode: 0o600 });
    console.log('PASS DEV: existing/new verified people, Mailpit delivery, inbox acceptance, ACTIVE relationships, no memberships, Company People, decline/revoke, CSRF and tenant denials, desktop/mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error('FAIL employment browser stage: ' + stage + ' (' + error.name + '); sensitive details suppressed.'); process.exitCode = 1; });
