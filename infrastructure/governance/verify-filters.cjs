// Use only the disposable directory DB with its synthetic sessions.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SAMMA_DIRECTORY_TEST_URL;
if (!base || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('Loopback test server required');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    await context.addCookies([{ name: '__Host-samma.session-token', value: 'reviewer-session', domain: 'directory.example.test', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }]);
    await context.route('https://directory.example.test/**', async route => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: base + url.pathname + url.search, headers: await route.request().allHeaders(), maxRedirects: 0 });
      await route.fulfill({ response });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('https://directory.example.test/governance/users');
      const filters = page.getByRole('navigation', { name: 'User filters', exact: true });
      await filters.waitFor();
      for (const [label, count] of [['All', 5], ['Person', 4], ['Company user', 2], ['Governance', 2]]) {
        await filters.getByRole('link', { name: label, exact: true }).click();
        await page.waitForFunction(expected => document.querySelectorAll('.directory-table tbody tr').length === expected, count);
        assert.equal(await filters.locator('[aria-current="page"]').innerText(), label);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
        for (const link of await filters.getByRole('link').all()) {
          const box = await link.boundingBox();
          assert.ok(box && box.x >= 0 && box.x + box.width <= width && box.height >= 40);
        }
      }
      if (process.env.SAMMA_DIRECTORY_SCREENSHOTS) await page.screenshot({ path: `${process.env.SAMMA_DIRECTORY_SCREENSHOTS}/users-${width}.png`, fullPage: true });
    }
    const filters = page.getByRole('navigation', { name: 'User filters', exact: true });
    await filters.getByRole('link', { name: 'Company user', exact: true }).click();
    for (const [query, count] of [['owner', 1], ['Alex', 0]]) {
      await page.getByLabel('Search users').fill(query);
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await page.waitForURL(`**/governance/users?view=company&q=${query}`);
      assert.equal(await page.locator('tbody tr').count(), count);
    }
    await filters.getByRole('link', { name: 'Person', exact: true }).click();
    await page.waitForURL('**/governance/users?view=person&q=Alex');
    await page.getByRole('link', { name: 'Alex Example', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Clear', exact: true }).click();
    await page.waitForURL('**/governance/users?view=person');
    assert.equal(await page.locator('tbody tr').count(), 4);
    for (const query of ['view=invalid', 'view=company&view=person']) {
      await page.goto('https://directory.example.test/governance/users?' + query);
      assert.equal(await page.locator('tbody tr').count(), 5);
      assert.equal(await filters.locator('[aria-current="page"]').innerText(), 'All');
    }
    assert.deepEqual(errors, []);
    console.log('PASS filters, search/clear, invalid/repeated URLs; 1440/768/390/320 layout; no overflow or browser errors');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
