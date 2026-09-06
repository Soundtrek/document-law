// Operator-only, focused real DEV acceptance. Private credentials; no traces/screenshots/tokens logged.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const users = JSON.parse(fs.readFileSync(process.env.SAMMA_LOGOUT_USERS, 'utf8'));
const base = 'https://dev.samma.co.za';
const cookieName = '__Host-samma.session-token';
let stage = 'launch';
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    // This context is retained throughout A -> B -> A. No cookie clearing.
    const context = await browser.newContext();
    const page = await context.newPage();
    for (const index of [0, 1, 0]) {
      const user = users[index];
      stage = 'sign in ' + index;
      await page.goto(base + '/sign-in');
      await page.locator('#landing-email').fill(user.email);
      await page.getByRole('button', { name: 'Continue with email' }).click();
      await page.waitForURL('https://auth.samma.co.za/**');
      await page.locator('#password').waitFor({ state: 'visible' });
      const authorization = new URL(page.url());
      assert.equal(authorization.searchParams.get('prompt'), null);
      assert.equal(await page.locator('#username').inputValue(), user.email);
      await page.locator('#password').fill(user.password);
      await page.locator('#kc-login').click();
      await page.waitForURL(url => url.origin === base && ['/person', '/company'].includes(url.pathname));
      await page.goto(base + '/person');
      assert.ok((await page.locator('body').innerText()).includes(user.email));
      const session = await (await context.request.get(base + '/api/auth/session')).json();
      assert.equal(session.user.id, user.accountId);
      const cookie = (await context.cookies(base)).find(c => c.name === cookieName);
      assert.ok(cookie && cookie.secure && cookie.httpOnly && cookie.sameSite === 'Lax');
      assert.equal(cookie.domain, 'dev.samma.co.za');
      assert.equal(cookie.path, '/');
      assert.ok(!(await context.cookies('https://samma.co.za')).some(c => c.name === cookieName));
      const providerCookies = await context.cookies('https://auth.samma.co.za');
      if (index === 1) {
        await page.goto(base + '/company');
        assert.ok(!(await page.locator('body').innerText()).includes('Synthetic Logout Company'));
      }
      stage = 'CSRF ' + index;
      for (const body of ['callbackUrl=/auth/logout', 'csrfToken=forged']) {
        await context.request.post(base + '/api/auth/signout', {
          headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded' }, data: body, maxRedirects: 0,
        });
        assert.equal((await (await context.request.get(base + '/api/auth/session')).json()).user.id, user.accountId);
      }
      const crossOrigin = await context.request.post(base + '/api/auth/signout', {
        headers: { origin: 'https://samma.co.za' }, data: 'csrfToken=forged', maxRedirects: 0,
      });
      assert.equal(crossOrigin.status(), 403);
      const legacyGet = await context.request.get(base + '/auth/logout', { maxRedirects: 0 });
      if (process.env.SAMMA_LOGOUT_BASELINE !== 'true') assert.equal(legacyGet.headers().location, base + '/');
      assert.equal((await (await context.request.get(base + '/api/auth/session')).json()).user.id, user.accountId);
      await page.goto(base + '/person');
      stage = 'logout ' + index;
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      if (process.env.SAMMA_LOGOUT_BASELINE === 'true') {
        await page.locator('#kc-logout').waitFor({ state: 'visible' });
        assert.equal(new URL(page.url()).searchParams.get('id_token_hint'), null);
        assert.equal(await (await context.request.get(base + '/api/auth/session')).json(), null);
        console.log('CONFIRMED baseline: local logout reaches Keycloak confirmation without ID token hint.');
        await page.locator('#kc-logout').click();
        await page.waitForURL(base + '/');
        break;
      }
      // No provider confirmation is clicked. The next navigation must reach the DEV root.
      await page.waitForURL(base + '/', { timeout: 20000 });
      assert.ok(!(await context.cookies(base)).some(c => c.name === cookieName));
      assert.equal(await (await context.request.get(base + '/api/auth/session')).json(), null);
      stage = 'back button ' + index;
      await page.goBack();
      await page.waitForLoadState('domcontentloaded');
      assert.ok(!(await page.locator('body').innerText()).includes(user.email));
      await page.goto(base + '/person');
      await page.waitForURL(base + '/sign-in');
      stage = 'old cookie replay ' + index;
      const replay = await browser.newContext();
      await replay.addCookies([cookie, ...providerCookies]);
      assert.equal(await (await replay.request.get(base + '/api/auth/session')).json(), null);
      const protectedResponse = await replay.request.get(base + '/person', { maxRedirects: 0 });
      assert.ok(protectedResponse.headers().location?.endsWith('/sign-in'));
      authorization.searchParams.set('prompt', 'none');
      const probe = await replay.request.get(authorization.href, { maxRedirects: 0 });
      const location = new URL(probe.headers().location);
      assert.equal(location.origin, base);
      assert.equal(location.searchParams.get('error'), 'login_required', 'old provider cookie must not silently log in');
      await replay.close();
      console.log('PASS DEV account ' + index + ': login, CSRF, automatic logout, back button, local/provider cookie replay, host cookie isolation.');
    }
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error('FAIL focused logout browser stage: ' + stage + ' (' + error.name + ')'); process.exitCode = 1; });
