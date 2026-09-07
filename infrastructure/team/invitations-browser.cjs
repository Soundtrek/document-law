// Real HTTPS DEV acceptance with synthetic accounts and normal registration only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomBytes } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/samma-auth-browser-deps/node_modules/playwright');
const root = process.env.SAMMA_TEAM_INVITATIONS_BROWSER_DIR;
assert.ok(root);
const users = JSON.parse(fs.readFileSync('/etc/samma-dev/employment-introductions/users.json', 'utf8'));
for (const label of ['owner', 'existing']) assert.match(users[label].email, /^employment-(owner|existing)-[a-f0-9]{12}@example\.test$/);
const newFile = root + '/new-user.json';
if (!fs.existsSync(newFile)) fs.writeFileSync(newFile, JSON.stringify({ email: 'team-new-' + randomBytes(6).toString('hex') + '@example.test', password: randomBytes(24).toString('base64url') + 'aA1!' }), { mode: 0o600 });
users.new = JSON.parse(fs.readFileSync(newFile, 'utf8'));
assert.match(users.new.email, /^team-new-[a-f0-9]{12}@example\.test$/);
const base = 'https://dev.samma.co.za', api = base + '/api/company/team-invitations', mailbox = 'http://192.168.1.152:8025';
let stage = 'launch', companyId, csrf;
const results = {};
async function mailFor(email, verify = false) {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(mailbox + '/api/v1/search?query=' + encodeURIComponent('to:' + email))).json();
    const item = (list.messages || []).find(m => m.To.some(to => to.Address === email) && (verify ? /verify/i.test(m.Subject) : m.Subject.includes('Company access invitation')));
    if (item) return (await fetch(mailbox + '/api/v1/message/' + item.ID)).json();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Expected synthetic mail missing');
}
async function login(browser, label) {
  const context = await browser.newContext(), page = await context.newPage(); page.setDefaultTimeout(30000);
  await page.goto(base + '/sign-in'); await page.getByLabel('Email address').fill(users[label].email);
  await page.getByRole('button', { name: 'Continue with email' }).click(); await page.waitForURL('https://auth.samma.co.za/**');
  await page.locator('#password').fill(users[label].password); await page.locator('#kc-login').click();
  await page.waitForURL(url => url.origin === base && ['/person', '/company'].includes(url.pathname));
  return { context, page };
}
async function register(browser) {
  const context = await browser.newContext(), page = await context.newPage(); page.setDefaultTimeout(30000);
  await page.goto(base + '/onboarding'); await page.getByRole('button', { name: 'Person', exact: true }).click();
  await page.waitForURL('https://auth.samma.co.za/**');
  await page.locator('#email').fill(users.new.email); await page.locator('#firstName').fill('Synthetic'); await page.locator('#lastName').fill('Team Operator');
  if (await page.locator('#password').count()) { await page.locator('#password').fill(users.new.password); await page.locator('#password-confirm').fill(users.new.password); }
  await page.locator('input[type="submit"],button[type="submit"]').first().click();
  const message = await mailFor(users.new.email, true);
  const text = (message.Text || '') + '\n' + (message.HTML || '').replaceAll('&amp;', '&');
  const link = text.match(/https:\/\/auth\.samma\.co\.za\/realms\/samma\/login-actions\/action-token\?[^\s<>"']+/)?.[0]; assert.ok(link);
  await page.goto(link); const proceed = page.getByRole('link', { name: /click here to proceed/i }); if (await proceed.count()) await proceed.click();
  if (new URL(page.url()).hostname === 'auth.samma.co.za') {
    await page.locator('#password-new').waitFor(); await page.locator('#password-new').fill(users.new.password); await page.locator('#password-confirm').fill(users.new.password);
    await page.locator('input[type="submit"],button[type="submit"]').first().click();
  }
  await page.waitForURL(base + '/person'); await context.close();
  results.normalRegistrationAndMailpitVerification = true;
  return login(browser, 'new');
}
function databaseCheck(phase) {
  const output = execFileSync('docker', ['exec', '-i', 'samma-dev-web', 'node_modules/.bin/tsx', 'infrastructure/team/verify-invitations-live.ts'],
    { input: JSON.stringify({ companyId, emails: [users.existing.email, users.new.email], phase }), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000 });
  assert.match(output, /PASS/);
}
async function screenshot(page, label) {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: root + '/' + label + '-' + width + '.png', fullPage: true });
  }
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const owner = await login(browser, 'owner');
    const teamHref = await owner.page.getByRole('link', { name: 'Team & Access', exact: true }).getAttribute('href');
    companyId = teamHref.split('/')[2]; const companyName = await owner.page.locator('#company-' + companyId + ' h2').innerText();
    assert.match(companyName, /^Synthetic Employment Introduction /);
    const relationshipHref = await owner.page.getByRole('link', { name: 'View person', exact: true }).first().getAttribute('href');
    owner.page.on('request', r => { if (r.url() === api) csrf = r.headers()['x-samma-csrf']; });
    async function send(email, capture = false) {
      await owner.page.goto(base + teamHref); await owner.page.getByRole('button', { name: '+ Add team member', exact: true }).click();
      await owner.page.getByLabel('Email address', { exact: true }).fill(email); await owner.page.getByRole('checkbox', { name: /^HR/ }).check();
      if (capture) await screenshot(owner.page, 'invite-form');
      const response = owner.page.waitForResponse(r => r.url() === api && r.request().method() === 'POST');
      await owner.page.getByRole('button', { name: 'Send invite', exact: true }).click(); const sent = await response;
      assert.equal(sent.status(), 200); const result = await sent.json(); assert.ok(result.created && result.mailDelivered);
      await owner.page.getByRole('status').filter({ hasText: 'Invitation sent.' }).waitFor();
      const message = await mailFor(email); assert.equal(message.Subject, 'SAMMA — Company access invitation from ' + companyName);
      assert.match(message.Text, /Assigned access:\nHR/); assert.ok(!message.Text.includes('token='));
      return result;
    }
    const post = (context, data, token = csrf, origin = base) => context.request.post(api, { data, headers: { origin, 'x-samma-csrf': token || '' } });
    stage = 'existing account and mail';
    const existing = await login(browser, 'existing'), first = await send(users.existing.email, true);
    await screenshot(owner.page, 'pending-team');
    await existing.page.goto(base + '/person'); const inbox = existing.page.locator('#company-access-invitations');
    await inbox.getByRole('heading', { name: companyName, exact: true }).waitFor(); await screenshot(existing.page, 'recipient-inbox');
    let recipientCsrf;
    existing.page.on('request', r => { if (r.url() === api) recipientCsrf = r.headers()['x-samma-csrf']; });
    let response = existing.page.waitForResponse(r => r.url() === api);
    await inbox.getByRole('button', { name: 'Accept', exact: true }).click(); assert.equal((await response).status(), 200);
    await inbox.getByText('No pending company access invitations.', { exact: true }).waitFor();
    stage = 'new registration'; const second = await send(users.new.email); databaseCheck('before-new');
    assert.equal((await post(existing.context, { action: 'accept', invitationId: second.invitationId }, recipientCsrf)).status(), 403);
    assert.equal((await post(existing.context, { action: 'send', companyId, email: users.new.email, roleIds: [] }, recipientCsrf)).status(), 403);
    const newcomer = await register(browser); await newcomer.page.goto(base + '/person');
    response = newcomer.page.waitForResponse(r => r.url() === api);
    await newcomer.page.locator('#company-access-invitations').getByRole('button', { name: 'Accept', exact: true }).click(); assert.equal((await response).status(), 200);
    await newcomer.page.locator('#company-access-invitations').getByText('No pending company access invitations.', { exact: true }).waitFor();
    stage = 'membership and employment separation'; databaseCheck('complete');
    await owner.page.goto(base + teamHref);
    for (const label of ['existing', 'new']) {
      const card = owner.page.locator('.company-team-card').filter({ hasText: users[label].email }); assert.equal(await card.count(), 1);
      assert.ok((await card.innerText()).includes('ACTIVE')); assert.equal(await card.locator('[aria-label="Functional roles"]').innerText(), 'HR');
    }
    await screenshot(owner.page, 'accepted-team');
    await owner.page.goto(base + '/company'); assert.ok(!(await owner.page.locator('.company-people-list').innerText()).includes(users.new.email));
    await newcomer.page.goto(base + relationshipHref); await newcomer.page.getByRole('link', { name: 'Add record', exact: true }).first().waitFor();
    await newcomer.page.getByRole('link', { name: 'Add record', exact: true }).first().click(); await newcomer.page.waitForURL(base + relationshipHref + '/add-record');
    await newcomer.page.getByLabel('Record type', { exact: true }).waitFor(); await screenshot(newcomer.page, 'hr-add-record');
    stage = 'decline revoke and HTTP security';
    assert.equal((await post(owner.context, { action: 'revoke', invitationId: first.invitationId })).status(), 409);
    const third = await send(users.existing.email); await existing.page.goto(base + '/person');
    response = existing.page.waitForResponse(r => r.url() === api); await existing.page.locator('#company-access-invitations').getByRole('button', { name: 'Decline', exact: true }).click(); assert.equal((await response).status(), 200);
    assert.equal((await post(existing.context, { action: 'accept', invitationId: third.invitationId }, recipientCsrf)).status(), 409);
    const fourth = await send(users.existing.email); response = owner.page.waitForResponse(r => r.url() === api);
    await owner.page.getByRole('button', { name: 'Revoke', exact: true }).click(); assert.equal((await response).status(), 200);
    assert.equal((await post(existing.context, { action: 'accept', invitationId: fourth.invitationId }, recipientCsrf)).status(), 409);
    for (const [token, origin] of [['', base], [csrf, 'https://foreign.example.test']]) assert.equal((await post(owner.context, { action: 'revoke', invitationId: fourth.invitationId }, token, origin)).status(), 403);
    assert.equal((await post(owner.context, { action: 'send', companyId: 'foreign', email: users.new.email, roleIds: [] })).status(), 403);
    databaseCheck('complete');
    Object.assign(results, { status: 'PASS', companyId, existingAndNewAccepted: true, mailDelivered: true, hrRecordAccess: true, noNewEmployment: true, declineRevoke: true, recipientAndCsrfDenials: true });
    fs.writeFileSync(root + '/browser-result.json', JSON.stringify(results), { mode: 0o600 });
    console.log('PASS: existing/new team invitations, normal registration and Mailpit verification, membership/HR access, employment separation, decline/revoke, HTTP denial and responsive UI.');
  } finally { await browser.close(); }
})().catch(error => { fs.writeFileSync(root + '/browser-error.txt', error.stack || String(error), { mode: 0o600 }); console.error('FAIL team invitations browser stage: ' + stage + ' (' + error.name + '); private details suppressed.'); process.exitCode = 1; });
