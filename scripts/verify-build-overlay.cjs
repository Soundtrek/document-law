// Public synthetic pages only. Never reads credentials or signs in.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SAMMA_CANDIDATE_URL || 'http://127.0.0.1:2031';
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const health = await (await fetch(base + '/api/health')).json();
    assert.deepEqual(Object.keys(health.build).sort(), ['branch', 'channel', 'sha']);
    assert.match(health.build.sha, /^[a-f0-9]{40}$/);
    if (process.env.SAMMA_EXPECT_BUILD_SHA) assert.equal(health.build.sha, process.env.SAMMA_EXPECT_BUILD_SHA);
    for (const width of [1440, 768, 390]) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } });
      for (const path of ['/', '/sign-in', '/onboarding/company/resume']) {
        await page.goto(base + path);
        const badge = page.getByRole('complementary', { name: 'Application build' });
        assert.ok(await badge.isVisible());
        assert.equal(await badge.locator('strong').innerText(), health.build.channel.toUpperCase());
        assert.ok((await badge.innerText()).includes(health.build.sha.slice(0, 7)));
        assert.ok((await badge.innerText()).includes(health.build.branch.replace(/^experiment\//, '')));
        const placement = await badge.evaluate(node => {
          const box = node.getBoundingClientRect();
          return { left: box.left, right: box.right, height: box.height, display: getComputedStyle(node).display };
        });
        if (width === 390) {
          assert.equal(placement.left, 12, 'mobile badge uses the safe left edge');
          assert.equal(placement.display, 'flex', 'mobile badge keeps its metadata on one line');
          assert.ok(placement.height < 30, 'mobile badge stays compact');
        } else {
          assert.equal(placement.right, width - 12, 'desktop/tablet badge retains its right edge');
          assert.equal(placement.display, 'block', 'desktop/tablet badge retains its stacked layout');
        }
        for (const position of [0, 0.5, 1]) {
          await page.evaluate(p => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p), position);
          const geometry = await page.evaluate(() => {
            const badge = document.querySelector('.build-overlay');
            const box = badge.getBoundingClientRect();
            const overlaps = [...document.querySelectorAll('button,input,select,textarea,a[href]')].filter(node => {
              const r = node.getBoundingClientRect();
              return r.width && r.height && r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top;
            }).map(node => node.tagName);
            return { overflow: document.documentElement.scrollWidth > innerWidth, overlaps, left: box.left, right: box.right, bottom: box.bottom, height: innerHeight, pointerEvents: getComputedStyle(badge).pointerEvents };
          });
          assert.equal(geometry.overflow, false, `${width} ${path} overflow`);
          assert.deepEqual(geometry.overlaps, [], `${width} ${path} control overlap`);
          assert.ok(geometry.left >= 0 && geometry.right <= width - 10 && geometry.bottom <= geometry.height - 10);
          assert.equal(geometry.pointerEvents, 'none');
        }
        await badge.locator('.build-overlay-branch').evaluate(node => { node.textContent = 'long-branch-'.repeat(18); });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.emulateMedia({ media: 'print' }); assert.equal(await badge.isVisible(), false);
        await page.emulateMedia({ media: 'screen' });
      }
      await page.goto(base);
      if (process.env.SAMMA_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SAMMA_SCREENSHOT_DIR}/overlay-${width}.png`, fullPage: true });
      await page.close();
      console.log(`PASS ${width}: public pages, badge, health, scrolling, controls, long branch, print`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
