// Synthetic-only browser/API regression. Credentials and session tokens remain outside Git.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'https://samma.co.za', candidate = process.env.SAMMA_CANDIDATE_URL;
const privateRoot = '/srv/nuc-archive/juanity/validation/storage-private';
const f = JSON.parse(fs.readFileSync(privateRoot+'/storage-fixture.json','utf8'));
const users = JSON.parse(fs.readFileSync('/etc/samma-dev/validation-users.json','utf8'));
const bytes = Buffer.from('%PDF-1.4\nSynthetic storage validation only\n%%EOF\n');
const hash = value => require('node:crypto').createHash('sha256').update(value).digest('hex');
const mutate = action => execFileSync('/tmp/samma-storage-run',['node_modules/.bin/tsx','infrastructure/storage/fixture.ts',action],{stdio:'pipe'});
async function routeCandidate(context) {
 if (!candidate) return;
 await context.route(/^https:\/\/(auth\.)?samma\.co\.za\//, async route => {
  try {
   const original = new URL(route.request().url());
   const response = await route.fetch({url:original.origin===base ? candidate+original.pathname+original.search : original.href,maxRedirects:0,headers:await route.request().allHeaders()});
   const location=response.headers()['location'];
   if(location && new URL(location,original).origin===base) {
    const headers=response.headers(); for(const key of ['location','content-security-policy','content-length','content-encoding']) delete headers[key];
    await route.fulfill({status:200,headers:{...headers,'content-type':'text/html'},body:'<script>location.replace('+JSON.stringify(new URL(location,original).href).replaceAll('<','\\u003c')+')</script>'});
   } else await route.fulfill({response});
  } catch { await route.abort().catch(() => {}); }
 });
}
async function api(context, path, options={}) {
 // API requests do not use page routing; explicit candidate URL retains canonical Origin.
 return context.request.fetch((candidate||base)+path,options);
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext({viewport:{width:1280,height:900}}); await routeCandidate(context);
  const page=await context.newPage(), user=users.find(row=>row.verified);
  await page.goto(base); await page.locator('#landing-email').fill(user.email);
  await page.getByRole('button',{name:'Continue with email'}).click();
  await page.waitForURL('https://auth.samma.co.za/**');
  await page.locator('#password').fill(user.password); await page.locator('#kc-login').click(); await page.waitForURL(base+'/person');
  const cookie=(await context.cookies(base)).find(item=>item.name==='__Host-samma.session-token'); assert.ok(cookie);
  const authHeaders={Cookie:cookie.name+'='+cookie.value};
  await page.goto(base+'/company'); await page.getByRole('link',{name:'Add record'}).click();
  await page.getByLabel('Title',{exact:true}).fill('Synthetic persistence check');
  await page.locator('input[type=file]').setInputFiles({name:'synthetic-storage.pdf',mimeType:'application/pdf',buffer:bytes});
  await page.getByRole('button',{name:'Save record',exact:true}).click(); await page.waitForURL(base+'/records/**');
  assert.ok((await page.locator('body').innerText()).includes('Not malware scanned'));
  const recordId=new URL(page.url()).pathname.split('/').pop();
  let link=await page.getByRole('link',{name:'Download current version'}).getAttribute('href');
  let response=await api(context,link,{headers:authHeaders}); assert.equal(response.status(),200); assert.equal(hash(await response.body()),hash(bytes));
  assert.equal(response.headers()['x-samma-scan-status'],'NOT_SCANNED_DEV');
  assert.ok(response.headers()['content-disposition'].startsWith('attachment;'));
  const firstLink=link;
  console.log('PASS real OIDC login, live UI upload, explicit DEV scan label and authorised checksum download');
  assert.equal((await api(context,link,{headers:{Cookie:''}})).status(),401);
  const outsider=f.identities.find(row=>row.label==='outsider'), lawyer=f.identities.find(row=>row.label==='lawyer');
  assert.equal((await api(context,link,{headers:{Cookie:cookie.name+'='+outsider.token}})).status(),404);
  assert.equal((await api(context,link,{headers:{Cookie:cookie.name+'='+lawyer.token}})).status(),404);
  mutate('legal-download');
  try {assert.equal((await api(context,link,{headers:{Cookie:cookie.name+'='+lawyer.token}})).status(),200);} finally {mutate('legal-deny');}
  const headers={...authHeaders,Origin:base,'X-Samma-Upload':'1','X-Samma-Relationship':f.relationshipId,'X-Samma-Definition':f.versionId,'X-Samma-Title':'Synthetic','X-Samma-Filename':'test.pdf','Content-Type':'application/octet-stream'};
  assert.equal((await api(context,'/api/records/upload',{method:'POST',headers:{...headers,Origin:'https://hostile.invalid'},data:bytes})).status(),403);
  assert.equal((await api(context,'/api/records/upload',{method:'POST',headers:{...headers,Cookie:cookie.name+'='+outsider.token},data:bytes})).status(),403);
  mutate('revoke-role');
  try {assert.equal((await api(context,'/api/records/upload',{method:'POST',headers,data:bytes})).status(),403);} finally {mutate('restore-role');}
  console.log('PASS unauthenticated/outsider read denial, legal view-only download denial, explicit scoped download grant, hostile Origin and revoked-role upload denial');
  await page.locator('input[type=file]').setInputFiles({name:'synthetic-replacement.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nSynthetic replacement\n%%EOF\n')});
  await page.getByRole('button',{name:'Save new version',exact:true}).click();
  await page.waitForFunction(previous => [...document.querySelectorAll('a')].some(a => a.textContent === 'Download current version' && a.getAttribute('href') !== previous), firstLink);
  link=await page.getByRole('link',{name:'Download current version'}).getAttribute('href'); assert.notEqual(link,firstLink);
  response=await api(context,firstLink,{headers:authHeaders}); assert.equal(hash(await response.body()),hash(bytes));
  mutate('verify');
  fs.writeFileSync(privateRoot+'/browser-result.json',JSON.stringify({recordId,firstLink,currentLink:link,checksum:hash(bytes),cookie}),{mode:0o600});
  console.log('PASS replacement uses new immutable file, previous version remains downloadable; PostgreSQL/S3 metadata verified');
  await context.close();
 } finally {await browser.close();}
})().catch(error=>{console.error('Storage browser validation failed:',error.name,error.message?.replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]'));process.exitCode=1;});
