// Uses existing synthetic DEV identities; no provider configuration or document uploads.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/samma-auth-browser-deps/node_modules/playwright');
const root = process.env.SAMMA_TEAM_BROWSER_DIR;
assert.ok(root);
const users = JSON.parse(fs.readFileSync('/etc/samma-dev/employment-introductions/users.json', 'utf8'));
for (const label of ['owner', 'existing']) assert.match(users[label].email, /^employment-(owner|existing)-[a-f0-9]{12}@example\.test$/);
const base = 'https://dev.samma.co.za';
async function login(browser, label) {
  const context = await browser.newContext(), page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(base + '/sign-in');
  await page.getByLabel('Email address').fill(users[label].email);
  await page.getByRole('button', { name: 'Continue with email' }).click();
  await page.waitForURL('https://auth.samma.co.za/**');
  await page.locator('#password').fill(users[label].password);
  await page.locator('#kc-login').click();
  await page.waitForURL(base + (label === 'owner' ? '/company' : '/person'));
  return { context, page };
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await login(browser, 'owner');
    const teamHref = await page.getByRole('link', { name: 'Team & Access', exact: true }).getAttribute('href');
    const relationshipHref = await page.getByRole('link', { name: 'View person', exact: true }).first().getAttribute('href');
    assert.match(teamHref, /^\/company\/[^/]+\/team$/);
    await page.goto(base + relationshipHref);
    assert.equal(await page.getByRole('link', { name: 'Add record', exact: true }).count(), 0);
    await page.goto(base + teamHref);
    const card = page.locator('.company-team-card').filter({ hasText: users.owner.email });
    assert.equal(await card.count(), 1);
    assert.equal(await card.locator('[aria-label="Functional roles"]').innerText(), 'OWNER');
    await card.getByRole('button', { name: 'Manage access' }).click();
    let lastRequest;
    page.on('request', request => { if (request.url() === base + '/api/company/team') lastRequest = { data: request.postDataJSON(), csrf: request.headers()['x-samma-csrf'] }; });
    await card.getByRole('checkbox', { name: /^OWNER/ }).uncheck();
    let pending = page.waitForResponse(r => r.url() === base + '/api/company/team');
    await card.getByRole('button', { name: 'Save', exact: true }).click();
    assert.equal((await pending).status(), 409);
    await card.getByRole('status').filter({ hasText: 'At least one active Company Owner is required.' }).waitFor();
    await card.getByRole('checkbox', { name: /^OWNER/ }).check();
    await card.getByRole('checkbox', { name: /^HR/ }).check();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.ok(await card.evaluate(node => node.scrollWidth <= node.clientWidth));
      await card.getByRole('button', { name: 'Save', exact: true }).scrollIntoViewIfNeeded();
      const button = await card.getByRole('button', { name: 'Save', exact: true }).boundingBox(), overlay = await page.getByLabel('Application build').boundingBox();
      assert.ok(!overlay || button.y + button.height <= overlay.y || overlay.y + overlay.height <= button.y || button.x + button.width <= overlay.x);
      await page.screenshot({ path: root + '/manage-' + width + '.png', fullPage: true });
    }
    pending = page.waitForResponse(r => r.url() === base + '/api/company/team');
    await card.getByRole('button', { name: 'Save', exact: true }).click();
    assert.equal((await pending).status(), 200);
    await card.locator('[aria-label="Functional roles"]').getByText('HR', { exact: true }).waitFor();
    await page.reload();
    await card.locator('[aria-label="Functional roles"]').getByText('HR', { exact: true }).waitFor();
    await page.goto(base + relationshipHref);
    await page.getByRole('link', { name: 'Add record', exact: true }).waitFor();
    await page.screenshot({ path: root + '/hr-record-action-390.png', fullPage: true });
    // Protected POST rejects hostile origins, missing CSRF and foreign member IDs.
    const post = (data, headers) => context.request.post(base + '/api/company/team', { data, headers });
    assert.equal((await post(lastRequest.data, { origin: base })).status(), 403);
    assert.equal((await post(lastRequest.data, { origin: 'https://foreign.example.test', 'x-samma-csrf': lastRequest.csrf })).status(), 403);
    assert.equal((await post({ ...lastRequest.data, memberId: 'outside-company' }, { origin: base, 'x-samma-csrf': lastRequest.csrf })).status(), 403);
    await page.goto(base + teamHref);
    await card.getByRole('button', { name: 'Manage access' }).click();
    await card.getByRole('checkbox', { name: /^HR/ }).uncheck();
    pending = page.waitForResponse(r => r.url() === base + '/api/company/team');
    await card.getByRole('button', { name: 'Save', exact: true }).click();
    assert.equal((await pending).status(), 200);
    await card.getByRole('status').filter({ hasText: 'Access saved.' }).waitFor();
    await page.goto(base + relationshipHref);
    assert.equal(await page.getByRole('link', { name: 'Add record', exact: true }).count(), 0);
    const personal = await login(browser, 'existing');
    await personal.page.goto(base + teamHref);
    assert.equal(await personal.page.getByRole('heading', { name: '404', exact: true }).count(), 1);
    const anonymous = await browser.newContext();
    assert.ok((await anonymous.request.get(base + teamHref)).url().includes('/sign-in'));
    fs.writeFileSync(root + '/browser-result.json', JSON.stringify({ status: 'PASS', companyId: lastRequest.data.companyId, memberId: lastRequest.data.memberId, teamHref, relationshipHref, restoredOwnerOnly: true }), { mode: 0o600 });
    console.log('PASS: live synthetic OWNER team UI, self HR grant/persistence/record action/revoke, last OWNER, employee/anonymous/cross-company/CSRF denial, desktop and 390px layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
