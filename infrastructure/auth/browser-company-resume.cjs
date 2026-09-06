// Focused DEV acceptance. Only the manifest-bound synthetic identity is used.
// No credentials, cookies, callback URLs, screenshots or browser traces are logged.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const user = JSON.parse(fs.readFileSync(process.env.SAMMA_COMPANY_RESUME_USER, 'utf8'));
assert.match(user.email, /^company-resume-[a-f0-9]+@example\.test$/);
const base = 'https://dev.samma.co.za';
let stage = 'launch';
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    context.setDefaultTimeout(25000);
    const page = await context.newPage();
    const login = async () => {
      await page.waitForURL('https://auth.samma.co.za/**');
      assert.equal(new URL(page.url()).searchParams.get('prompt'), null);
      await page.locator('#username').fill(user.email);
      await page.locator('#password').fill(user.password);
      await page.locator('#kc-login').click();
    };
    stage = 'incomplete ordinary login';
    await page.goto(base + '/sign-in');
    await page.locator('#landing-email').fill(user.email);
    await page.getByRole('button', { name: 'Continue with email' }).click();
    await login();
    await page.waitForURL(base + '/sign-in?error=OnboardingRequired');
    await page.getByRole('link', { name: 'Already registered? Continue company setup' }).click();
    await page.waitForURL(base + '/onboarding/company/resume');
    assert.equal(new URL(page.url()).pathname, '/onboarding/company/resume');
    // Start Company recovery from the onboarding entry, in a fresh browser with no provider SSO.
    await context.close();
    const company = await browser.newContext();
    company.setDefaultTimeout(25000);
    const companyPage = await company.newPage();
    stage = 'Company recovery entry';
    await companyPage.goto(base + '/onboarding');
    await companyPage.getByRole('link', { name: 'Continue company setup', exact: true }).click();
    await companyPage.getByRole('button', { name: 'Continue Company setup', exact: true }).click();
    await companyPage.waitForURL('https://auth.samma.co.za/**');
    const authorization = new URL(companyPage.url());
    assert.equal(authorization.searchParams.get('prompt'), null);
    assert.equal(authorization.searchParams.get('redirect_uri'), base + '/api/auth/callback/keycloak');
    assert.ok(authorization.searchParams.get('state') && authorization.searchParams.get('nonce'));
    assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
    const flow = (await company.cookies(base)).find(c => c.name === '__Host-samma.onboarding-flow');
    assert.ok(flow && flow.secure && flow.httpOnly && flow.sameSite === 'Lax');
    assert.equal(flow.domain, 'dev.samma.co.za'); assert.equal(flow.path, '/');
    assert.ok(flow.expires > Date.now() / 1000 && flow.expires <= Date.now() / 1000 + 900);
    assert.ok(!(await company.cookies('https://samma.co.za')).some(c => c.name === flow.name));
    stage = 'Company login and callback';
    await companyPage.locator('#username').fill(user.email);
    await companyPage.locator('#password').fill(user.password);
    await companyPage.locator('#kc-login').click();
    await companyPage.waitForURL(base + '/onboarding/company');
    await companyPage.getByRole('heading', { name: 'Create your company workspace' }).waitFor();
    const session = await (await company.request.get(base + '/api/auth/session')).json();
    assert.ok(session.user.id);
    const cookies = await company.cookies(base);
    assert.ok(cookies.some(c => c.name === '__Host-samma.company-setup'));
    assert.ok(!cookies.some(c => c.name === '__Host-samma.onboarding-flow'));
    // Pause before explicit submission so the operator verifier can inspect zero companies/members.
    fs.writeFileSync(process.env.SAMMA_COMPANY_RESUME_RESULT, JSON.stringify({ stage: 'before-company', accountId: session.user.id }), { mode: 0o600 });
    await new Promise((resolve, reject) => {
      const deadline = Date.now() + 180000;
      const timer = setInterval(() => {
        if (fs.existsSync(process.env.SAMMA_COMPANY_RESUME_PROCEED)) { clearInterval(timer); resolve(); }
        else if (Date.now() > deadline) { clearInterval(timer); reject(new Error('Pre-company verification timed out')); }
      }, 250);
    });
    stage = 'explicit company submission';
    await companyPage.locator('input[name="name"]').fill('Synthetic Company Resume Acceptance');
    await companyPage.getByRole('button', { name: /create.*company|create.*workspace/i }).click();
    await companyPage.waitForURL(base + '/company');
    assert.ok((await companyPage.locator('body').innerText()).includes('Synthetic Company Resume Acceptance'));
    stage = 'ordinary existing owner login';
    await companyPage.getByRole('button', { name: 'Sign out', exact: true }).click();
    await companyPage.waitForURL(base + '/');
    await companyPage.goto(base + '/sign-in');
    await companyPage.locator('#landing-email').fill(user.email);
    await companyPage.getByRole('button', { name: 'Continue with email' }).click();
    await companyPage.waitForURL('https://auth.samma.co.za/**');
    assert.equal(new URL(companyPage.url()).searchParams.get('prompt'), null);
    assert.ok(!(await company.cookies(base)).some(c => c.name === '__Host-samma.onboarding-flow'));
    await companyPage.locator('#password').fill(user.password);
    await companyPage.locator('#kc-login').click();
    await companyPage.waitForURL(base + '/company');
    assert.equal((await (await company.request.get(base + '/api/auth/session')).json()).user.id, session.user.id);
    await companyPage.getByRole('button', { name: 'Sign out', exact: true }).click();
    await companyPage.waitForURL(base + '/');
    fs.writeFileSync(process.env.SAMMA_COMPANY_RESUME_RESULT, JSON.stringify({ stage: 'complete', accountId: session.user.id, passed: true }), { mode: 0o600 });
    console.log('PASS DEV: incomplete login recovery option, explicit Company login, protected intent, DEV callback/setup, explicit Company creation, existing-owner login unchanged.');
    await company.close();
  } finally { await browser.close(); }
})().catch(error => { console.error('FAIL Company resume browser stage: ' + stage + ' (' + error.name + ')'); process.exitCode = 1; });
