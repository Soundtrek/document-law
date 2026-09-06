// Synthetic sessions in the disposable test DB only. No provider/login configuration changes.
const assert = require('node:assert/strict');
const base = process.env.SAMMA_DIRECTORY_TEST_URL;
if (!base || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('Loopback test server required');
const read = async (path, token) => {
  const response = await fetch(base + path, { redirect: 'manual', headers: token ? { cookie: `__Host-samma.session-token=${token}` } : {} });
  return { response, html: await response.text() };
};
(async () => {
  for (const path of ['/governance/users', '/governance/users/person']) {
    const anonymous = await read(path);
    assert.ok(anonymous.response.status === 307 || anonymous.html.includes('NEXT_REDIRECT'));
    for (const token of ['person-session', 'owner-session']) {
      const denied = await read(path, token);
      assert.ok(denied.response.status === 404 || denied.html.includes('NEXT_HTTP_ERROR_FALLBACK;404'));
      assert.ok(!denied.html.includes('person@directory.example.test'));
    }
  }
  for (const query of ['PERSON@DIRECTORY.EXAMPLE.TEST', 'aLeX ExAMple']) {
    const { html } = await read('/governance/users?q=' + encodeURIComponent(query), 'reviewer-session');
    assert.ok(html.includes('Alex Example'));
    assert.ok(!html.includes('unrelated@directory.example.test'));
  }
  const detail = await read('/governance/users/person', 'reviewer-session');
  assert.ok(detail.html.includes('Directory Company A'));
  assert.ok(!detail.html.includes('Unrelated Company B'));
  assert.ok(!detail.html.includes('secret-summary-canary'));
  const current = await read('/governance/users/reviewer', 'reviewer-session');
  assert.ok(current.html.includes('platform.security.review'));
  const empty = await read('/governance/users/empty', 'reviewer-session');
  assert.ok(empty.html.includes('Name not provided'));
  // Moving the shared layout guard must not open the existing Governance overview.
  const overview = await read('/governance', 'reviewer-session');
  assert.ok(overview.response.status === 404 || overview.html.includes('NEXT_HTTP_ERROR_FALLBACK;404'));
  console.log('PASS production HTTP directory routes: Governance, anonymous/person/OWNER denials, search, stable ID, scoped detail, missing contacts, overview isolation');
})().catch(error => { console.error(error); process.exitCode = 1; });
