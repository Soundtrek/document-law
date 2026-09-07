// Existing synthetic identities only; ordinary HTTPS OIDC login, no session fabrication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/samma-auth-browser-deps/node_modules/playwright');
const root = process.env.SAMMA_SHARING_BROWSER_DIR;
assert.ok(root);
const existing = JSON.parse(fs.readFileSync('/etc/samma-dev/employment-introductions/users.json', 'utf8'));
const users = { person: existing.new, owner: existing.owner,
  hr: JSON.parse(fs.readFileSync('/srv/nuc-archive/juanity/validation/add-team-member-v1/new-user.json', 'utf8')) };
for (const user of Object.values(users)) assert.match(user.email, /^(employment-(new|owner)|team-new)-[a-f0-9]{12}@example\.test$/);
const base = 'https://dev.samma.co.za', bytes = Buffer.from('%PDF-1.4\nSynthetic proof of address. No personal data.\n%%EOF\n');
const checksum = createHash('sha256').update(bytes).digest('hex');
let stage = 'login';
async function login(browser, label) {
  const context = await browser.newContext(), page = await context.newPage(); page.setDefaultTimeout(30000);
  await page.goto(base + '/sign-in'); await page.getByLabel('Email address').fill(users[label].email);
  await page.getByRole('button', { name: 'Continue with email' }).click(); await page.waitForURL('https://auth.samma.co.za/**');
  await page.locator('#password').fill(users[label].password); await page.locator('#kc-login').click();
  await page.waitForURL(url => url.origin === base && ['/person', '/company'].includes(url.pathname));
  return { context, page };
}
async function download(context, fileId) {
  const response = await context.request.get(base + '/api/files/' + fileId);
  assert.equal(response.status(), 200); assert.equal(response.headers()['x-samma-scan-status'], 'NOT_SCANNED_DEV');
  assert.equal(createHash('sha256').update(await response.body()).digest('hex'), checksum);
}
async function screenshot(page, label) {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: root + '/' + label + '-' + width + '.png', fullPage: true });
  }
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const person = await login(browser, 'person'); await person.page.goto(base + '/person');
    const personId = (await (await person.context.request.get(base + '/api/auth/session')).json()).user.id;
    const href = await person.page.locator('#companies').getByRole('link', { name: 'Share document', exact: true }).first().getAttribute('href');
    assert.match(href, /^\/person\/relationships\/[^/]+\/add-record$/);
    const relationshipId = href.split('/')[3];
    await screenshot(person.page, 'person-entry'); await person.page.goto(base + href);
    stage = 'selector and upload';
    const selector = person.page.getByLabel('Record type');
    assert.deepEqual(await selector.locator('option').allTextContents(), ['Synthetic proof of address']);
    const definitionId = await selector.inputValue();
    await person.page.getByLabel('Title', { exact: true }).fill('Test Proof of Address');
    await person.page.locator('input[type=file]').setInputFiles({ name: 'synthetic-proof.pdf', mimeType: 'application/pdf', buffer: bytes });
    await screenshot(person.page, 'person-form');
    const responsePromise = person.page.waitForResponse(r => r.url() === base + '/api/records/upload' && r.request().method() === 'POST');
    await person.page.getByRole('button', { name: 'Save record', exact: true }).click();
    const response = await responsePromise; assert.equal(response.status(), 201);
    const result = await response.json();
    await person.page.waitForURL(base + '/person#records');
    const row = person.page.locator('.record-row').filter({ has: person.page.locator(`a[href="/records/${result.recordId}"]`) });
    await row.waitFor(); assert.ok((await row.innerText()).includes('Test Proof of Address'));
    await download(person.context, result.fileId);
    await screenshot(person.page, 'person-records');
    await row.getByRole('link', { name: 'View', exact: true }).click();
    await person.page.getByRole('heading', { name: 'Test Proof of Address', exact: true }).waitFor();
    assert.equal(await person.page.getByRole('heading', { name: 'Replace file', exact: true }).count(), 0);
    stage = 'early denial';
    assert.equal((await person.context.request.post(base + '/api/records/upload', { headers: { Origin: base, 'X-Samma-Upload': '1',
      'X-Samma-Actor': 'INVALID', 'X-Samma-Relationship': relationshipId, 'X-Samma-Definition': definitionId, 'X-Samma-Title': 'Synthetic denial' }, data: bytes })).status(), 403);
    stage = 'HR read/download';
    const hr = await login(browser, 'hr');
    await hr.page.getByRole('link', { name: 'Company Info Center', exact: true }).click();
    const card = hr.page.locator('.company-person-card').filter({ has: hr.page.locator(`a[href="/company/relationships/${relationshipId}"]`) });
    await card.getByRole('link', { name: 'View person', exact: true }).click();
    const companyRow = hr.page.locator('#records .record-row').filter({ has: hr.page.locator(`a[href="/records/${result.recordId}"]`) });
    await companyRow.waitFor(); assert.ok((await companyRow.innerText()).includes('Test Proof of Address'));
    await download(hr.context, result.fileId); await screenshot(hr.page, 'hr-records');
    await companyRow.getByRole('link', { name: 'View', exact: true }).click();
    await hr.page.getByRole('heading', { name: 'Test Proof of Address', exact: true }).waitFor();
    stage = 'OWNER-only denial';
    const owner = await login(browser, 'owner'); await owner.page.goto(base + '/company/relationships/' + relationshipId);
    assert.equal(await owner.page.locator(`a[href="/records/${result.recordId}"]`).count(), 0);
    assert.equal((await owner.context.request.get(base + '/api/files/' + result.fileId)).status(), 404);
    await owner.page.goto(base + '/records/' + result.recordId); await owner.page.getByRole('heading', { name: '404' }).waitFor();
    stage = 'persistence and audit';
    const output = execFileSync('docker', ['exec', '-i', 'samma-dev-web', 'node_modules/.bin/tsx', 'infrastructure/records/verify-live.ts'],
      { input: JSON.stringify({ ...result, personAccountId: personId, relationshipId, checksum }), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000 });
    assert.ok(output.includes('PASS'));
    const health = await (await fetch(base + '/api/health')).json();
    fs.writeFileSync(root + '/browser-result.json', JSON.stringify({ status: 'PASS', ...result, relationshipId, checksum, health,
      checks: ['Person-route-selector', 'Person-upload-return', 'My-records', 'Person-view-download', 'HR-view-download', 'OWNER-only-denied', 'early-denial-audit', 'Garage-checksum', 'responsive-layout'],
      philCompany1Manual: 'PENDING' }), { mode: 0o600 });
    console.log('PASS synthetic HTTPS Person sharing, My records, HR reads/downloads, OWNER-only denial, Garage checksum and safe audit. Phil/Company1 manual acceptance pending.');
  } finally { await browser.close(); }
})().catch(error => { console.error('FAIL Person sharing browser stage: ' + stage + ' (' + error.name + '); sensitive details suppressed.'); process.exitCode = 1; });
