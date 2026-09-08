// Actual HTTPS OIDC sessions with existing synthetic credentials; never impersonates Phil.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/samma-auth-browser-deps/node_modules/playwright');
const root = process.env.SAMMA_DEFINITIONS_BROWSER_DIR; assert.ok(root);
const base = 'https://dev.samma.co.za';
const existing = JSON.parse(fs.readFileSync('/etc/samma-dev/employment-introductions/users.json', 'utf8'));
const users = { owner: existing.owner, person: existing.new, governance: existing.existing, hr: JSON.parse(fs.readFileSync('/srv/nuc-archive/juanity/validation/add-team-member-v1/new-user.json', 'utf8')) };
const mutate = input => execFileSync('docker', ['exec', '-i', 'samma-dev-web', 'node_modules/.bin/tsx', 'infrastructure/definitions/browser-fixture.ts'], { input: JSON.stringify(input), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const bytes = Buffer.from('%PDF-1.4\nSynthetic document policy acceptance.\n%%EOF\n');
let stage = 'prepare';
async function login(browser, label) {
  const context = await browser.newContext(), page = await context.newPage(); page.setDefaultTimeout(30000);
  await page.goto(base + '/sign-in'); await page.getByLabel('Email address').fill(users[label].email);
  await page.getByRole('button', { name: 'Continue with email' }).click(); await page.waitForURL('https://auth.samma.co.za/**');
  await page.locator('#password').fill(users[label].password); await page.locator('#kc-login').click();
  await page.waitForURL(url => url.origin === base && ['/person', '/company'].includes(url.pathname));
  return { context, page };
}
async function screenshots(page, label) {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ' fits ' + width);
    await page.screenshot({ path: `${root}/${label}-${width}.png`, fullPage: true });
  }
}
async function save(page, label) {
  const pending = page.waitForResponse(r => r.url() === base + '/api/record-definitions' && r.request().method() === 'POST');
  await page.getByRole('button', { name: label, exact: true }).click(); const response = await pending;
  assert.equal(response.status(), 200); const result = await response.json();
  await page.waitForURL(url => url.pathname.endsWith('/' + result.definitionId));
  await page.getByText('Current version ' + result.version, { exact: false }).waitFor();
  return result;
}
async function create(page, path, name, code, direction) {
  await page.goto(base + path + '/new');
  await page.getByLabel('Name', { exact: true }).fill(name); await page.getByLabel('Stable code', { exact: false }).fill(code);
  await page.getByLabel('Category', { exact: true }).fill('Synthetic acceptance');
  await page.getByLabel(/^Direction/).selectOption(direction);
  await page.getByLabel('Person visible', { exact: true }).check();
  await page.locator('.definition-roles label').filter({ hasText: /^HR\s+HR$/ }).locator('input').check();
  return save(page, 'Create definition');
}
(async () => {
  const fixture = JSON.parse(mutate({ action: 'prepare', ownerEmail: users.owner.email, personEmail: users.person.email, governanceEmail: users.governance.email }));
  fs.writeFileSync(root + '/fixture.json', JSON.stringify(fixture), { mode: 0o600 });
  const browser = await chromium.launch({ headless: true });
  try {
    const initialHealth = await (await fetch(base + '/api/health')).json();
    const suffix = Date.now().toString();
    stage = 'Governance definition create/edit';
    const gov = await login(browser, 'governance');
    const system = await create(gov.page, '/governance/definitions', 'Synthetic configured Person form ' + suffix, 'SYNTHETIC_PERSON_' + suffix, 'PERSON_TO_COMPANY');
    await gov.page.getByLabel('Description', { exact: true }).fill('Version two synthetic policy.');
    await save(gov.page, 'Save as new version');
    assert.equal(await gov.page.locator('.definition-version').count(), 2);
    await screenshots(gov.page, 'governance-detail');
    await gov.page.goto(base + '/governance/definitions'); await screenshots(gov.page, 'governance-definitions');
    await gov.page.goto(base + '/governance/definitions?view=matrix'); await screenshots(gov.page, 'governance-matrix');
    const systemRow = gov.page.getByRole('row').filter({ hasText: 'Synthetic configured Person form ' + suffix });
    assert.ok((await systemRow.innerText()).includes('Person → Company'));
    const headers = await gov.page.getByRole('columnheader').allTextContents();
    const cells = await systemRow.locator('th, td').allTextContents();
    assert.equal(cells[2], 'Yes');
    for (let index = 3; index < headers.length; index++) assert.equal(cells[index], headers[index] === 'HR' ? 'Yes' : 'No');
    stage = 'Company definition create';
    const owner = await login(browser, 'owner'); const companyPath = `/company/${fixture.companyId}/document-settings`;
    const custom = await create(owner.page, companyPath, 'Safety Induction Form', 'SAFETY_INDUCTION_' + suffix, 'COMPANY_TO_PERSON');
    await screenshots(owner.page, 'company-definition');
    await owner.page.goto(base + companyPath); await screenshots(owner.page, 'company-settings');
    await owner.page.goto(base + companyPath + '?view=matrix'); await screenshots(owner.page, 'company-matrix');
    stage = 'Cross-company and non-manager denial';
    await gov.page.goto(base + `/company/${fixture.companyB}/document-settings`);
    assert.equal(await gov.page.locator(`a[href$="/${custom.definitionId}"]`).count(), 0);
    assert.equal((await gov.context.request.get(base + `/company/${fixture.companyB}/document-settings/${custom.definitionId}`)).status(), 404);
    const hr = await login(browser, 'hr');
    assert.equal((await hr.context.request.get(base + companyPath)).status(), 404);
    stage = 'Dynamic HR selector and upload';
    await hr.page.goto(base + `/company/relationships/${fixture.relationshipId}/add-record`);
    const options = hr.page.getByLabel('Record type');
    const option = options.locator('option').filter({ hasText: /^Safety Induction Form$/ }).last();
    const versionId = await option.getAttribute('value'); assert.ok(versionId); await options.selectOption(versionId);
    await hr.page.getByLabel('Title', { exact: true }).fill('Synthetic Safety Induction acceptance ' + suffix);
    await hr.page.locator('input[type=file]').setInputFiles({ name: 'synthetic.pdf', mimeType: 'application/pdf', buffer: bytes });
    const uploadResponse = hr.page.waitForResponse(r => r.url() === base + '/api/records/upload' && r.request().method() === 'POST');
    await hr.page.getByRole('button', { name: 'Save record', exact: true }).click();
    const upload = await uploadResponse; assert.equal(upload.status(), 201); const record = await upload.json();
    assert.equal((await hr.context.request.get(base + '/api/files/' + record.fileId)).status(), 200);
    stage = 'OWNER denial and Person visibility';
    assert.equal((await owner.context.request.get(base + '/api/files/' + record.fileId)).status(), 404);
    const person = await login(browser, 'person');
    assert.equal((await person.context.request.get(base + '/api/files/' + record.fileId)).status(), 200);
    await person.page.goto(base + `/person/relationships/${fixture.relationshipId}/add-record`);
    assert.ok((await person.page.getByLabel('Record type').locator('option').allTextContents()).includes('Synthetic configured Person form ' + suffix));
    stage = 'Version pinning and deactivate';
    await owner.page.goto(base + companyPath + '/' + custom.definitionId);
    await owner.page.getByLabel('Person visible', { exact: true }).uncheck(); await save(owner.page, 'Save as new version');
    assert.equal((await person.context.request.get(base + '/api/files/' + record.fileId)).status(), 200);
    await save(owner.page, 'Deactivate');
    await hr.page.goto(base + `/company/relationships/${fixture.relationshipId}/add-record`);
    assert.equal(await hr.page.locator(`option[value="${versionId}"]`).count(), 0);
    assert.equal((await hr.context.request.get(base + '/api/files/' + record.fileId)).status(), 200);
    assert.ok(mutate({ action: 'verify', ...fixture, ...record, definitionId: custom.definitionId }).includes('PASS'));
    stage = 'HTTP CSRF and origin denial';
    assert.equal((await owner.context.request.post(base + '/api/record-definitions', { headers: { Origin: base }, data: {} })).status(), 403);
    assert.equal((await owner.context.request.post(base + '/api/record-definitions', { headers: { Origin: 'https://other.invalid' }, data: {} })).status(), 403);
    await gov.page.goto(base + '/governance/definitions/' + system.definitionId); await save(gov.page, 'Deactivate');
    const finalHealth = await (await fetch(base + '/api/health')).json(); assert.deepEqual(finalHealth, initialHealth);
    fs.writeFileSync(root + '/browser-result.json', JSON.stringify({ status: 'PASS', system, custom, record, health: finalHealth,
      checks: ['Governance-create-version', 'Company-local-create', 'dynamic-HR-selector-upload', 'dynamic-Person-selector', 'company-isolation', 'OWNER-denial', 'historical-pinning', 'deactivation', 'live-file-access', 'CSRF-origin', '1440-768-390'], philManual: 'PENDING' }), { mode: 0o600 });
    console.log('PASS live HTTPS definition creation without rebuild/redeploy, policy/version/isolation/file checks and responsive layouts.');
  } finally { await browser.close(); mutate({ action: 'cleanup', ...fixture }); }
})().catch(error => { console.error('FAIL definition browser stage: ' + stage + ' (' + error.name + '); sensitive details suppressed.'); process.exitCode = 1; });
