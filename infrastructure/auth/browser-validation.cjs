// Operator-only browser check. No screenshots/traces or credential values are written.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const users = JSON.parse(fs.readFileSync('/etc/samma-dev/validation-users.json','utf8'));
const credentialText = fs.readFileSync('/etc/samma-dev/bootstrap-credentials.txt','utf8');
const base = 'https://samma.co.za';
const candidate = process.env.SAMMA_CANDIDATE_URL;
async function contextFor(browser) {
  const context = await browser.newContext();
  if (candidate) await context.route(/^https:\/\/(auth\.)?samma\.co\.za\//, async route => {
    try {
      const original = new URL(route.request().url());
      const response = await route.fetch({url:original.origin === base ? candidate+original.pathname+original.search : original.href,maxRedirects:0,headers:await route.request().allHeaders()});
      const location = response.headers()['location'];
      // Browser redirect chains bypass Playwright routing. Start a fresh navigation
      // only for the provider -> candidate callback; the real code/state/PKCE checks remain intact.
      if (location && new URL(location,original).origin === base) {
        const bridgeHeaders = response.headers();
        for (const name of ['location','content-security-policy','content-length','content-encoding']) delete bridgeHeaders[name];
        await route.fulfill({status:200,headers:{...bridgeHeaders,'content-type':'text/html'},body:'<script>location.replace('+JSON.stringify(new URL(location,original).href).replaceAll('<','\\u003c')+')</script>'});
      } else await route.fulfill({response});
    } catch { await route.abort(); }
  });
  return context;
}
async function login(page, email, password) {
  await page.goto(base);
  await page.locator('#landing-email').fill(email);
  await page.getByRole('button',{name:'Continue with email'}).click();
  await page.waitForTimeout(1500);
  await page.waitForURL('https://auth.samma.co.za/**');
  assert.equal(await page.locator('#username').inputValue(),email);
  const url = new URL(page.url());
  assert.equal(url.searchParams.get('redirect_uri'),base+'/api/auth/callback/keycloak');
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.ok(url.searchParams.get('state'));
  assert.ok(url.searchParams.get('nonce'));
  await page.locator('#password').fill(password);
  await page.locator('#kc-login').click();
}
(async()=>{
 const browser = await chromium.launch({headless:true});
 try {
  const context = await contextFor(browser), page = await context.newPage();
  for (const path of ['/person','/company','/company/people/alex','/company/team/invite','/legal-access','/governance','/records/unknown']) {
   await page.goto(base+path);
   assert.equal(new URL(page.url()).pathname,'/sign-in');
  }
  console.log('PASS unauthenticated protected-route redirects');
  const normal = users.find(user=>user.verified);
  await login(page,normal.email,normal.password);
  await page.waitForURL(base+'/person');
  assert.ok((await page.locator('body').innerText()).includes('Synthetic Validation'));
  const cookie = (await context.cookies(base)).find(cookie=>cookie.name==='__Host-samma.session-token');
  assert.ok(cookie && cookie.secure && cookie.httpOnly && cookie.sameSite==='Lax');
  assert.equal(cookie.path,'/');
  assert.equal(cookie.domain,'samma.co.za');
  await page.goto(base+'/governance');
  assert.ok((await page.locator('body').innerText()).includes('404'));
  console.log('PASS real OIDC login, PKCE/state/nonce, secure cookie, non-Governance denial');
  // Missing CSRF must not revoke an authenticated session.
  await page.evaluate(async () => { await fetch('/api/auth/signout', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'callbackUrl=/auth/logout' }); });
  await page.goto(base+'/person');
  assert.ok((await page.locator('body').innerText()).includes('Synthetic Validation'));
  if (candidate) {
    const { execFileSync } = require('node:child_process');
    execFileSync('/tmp/samma-auth-run',['node_modules/.bin/tsx','infrastructure/auth/validation-governance.ts','grant'],{stdio:'ignore'});
    try {
      await page.goto(base+'/governance');
      assert.ok((await page.locator('body').innerText()).includes('Record policy and platform controls'));
    } finally {execFileSync('/tmp/samma-auth-run',['node_modules/.bin/tsx','infrastructure/auth/validation-governance.ts','revoke'],{stdio:'ignore'});}
    await page.goto(base+'/governance');
    assert.ok((await page.locator('body').innerText()).includes('404'));
    console.log('PASS Governance capability grant and immediate revocation on existing session');
  }
  console.log('PASS missing logout CSRF leaves session intact');
  await page.goto(base+'/person');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.waitForURL('https://auth.samma.co.za/**');
  const confirm = page.locator('#kc-logout');
  if (await confirm.count()) await confirm.click();
  else {
    const button = page.getByRole('button',{name:/log out|logout/i});
    if (await button.count()) await button.click();
  }
  await page.waitForURL(base+'/');
  await context.addCookies([cookie]);
  await page.goto(base+'/person');
  assert.equal(new URL(page.url()).pathname,'/sign-in');
  console.log('PASS local/provider logout and old-session replay rejection');
  await context.close();
  const unverified = users.find(user=>!user.verified);
  const unverifiedContext = await contextFor(browser), unverifiedPage = await unverifiedContext.newPage();
  await login(unverifiedPage,unverified.email,unverified.password);
  await unverifiedPage.waitForTimeout(1500);
  assert.equal(new URL(unverifiedPage.url()).origin,'https://auth.samma.co.za');
  assert.ok(!(await unverifiedContext.cookies()).some(cookie=>cookie.name==='__Host-samma.session-token'));
  await unverifiedPage.goto(base+'/person');
  assert.equal(new URL(unverifiedPage.url()).pathname,'/sign-in');
  console.log('PASS unverified account cannot enter SAMMA');
  await unverifiedContext.close();
  for (const email of ['phil@samma.co.za','juanita@samma.co.za']) {
   const block = credentialText.split('Email: '+email)[1].split('Password manager item:')[0];
   const password = block.split('Temporary password:')[1].trim();
   const ownerContext = await contextFor(browser), ownerPage = await ownerContext.newPage();
   await login(ownerPage,email,password);
   await ownerPage.locator('#password-new').waitFor({state:'visible'});
   assert.ok(!(await ownerContext.cookies()).some(cookie=>cookie.name==='__Host-samma.session-token'));
   console.log('PASS approved owner temporary credential accepted; password replacement is mandatory ('+email+')');
   await ownerContext.close();
  }
 } finally {await browser.close();}
})().catch(error=>{console.error('Browser authentication validation failed at', error.stack?.match(/browser-validation\.cjs:\d+:\d+/)?.[0] || error.name);process.exitCode=1;});
