// Operator-only synthetic browser proof. Never print passwords, cookies or invitation tokens.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'https://samma.co.za', candidate = process.env.SAMMA_CANDIDATE_URL;
const root = '/srv/nuc-archive/juanity/validation/workflow-private';
const users = JSON.parse(fs.readFileSync(root+'/users.json','utf8'));
const bytes = Buffer.from('%PDF-1.4\nSynthetic workflow validation only\n%%EOF\n');
const hash = bytes => require('node:crypto').createHash('sha256').update(bytes).digest('hex');
async function routeCandidate(context) {
 if (!candidate) return;
 await context.route(/^https:\/\/(auth\.)?samma\.co\.za\//, async route => {
  try {
   const original = new URL(route.request().url());
   const response = await route.fetch({url:original.origin===base ? candidate+original.pathname+original.search : original.href,maxRedirects:0,headers:await route.request().allHeaders()});
   const location = response.headers()['location'];
   if (location && new URL(location,original).origin===base) {
    const headers=response.headers(); for(const key of ['location','content-security-policy','content-length','content-encoding']) delete headers[key];
    await route.fulfill({status:200,headers:{...headers,'content-type':'text/html'},body:'<script>location.replace('+JSON.stringify(new URL(location,original).href).replaceAll('<','\\u003c')+')</script>'});
   } else await route.fulfill({response});
  } catch { await route.abort().catch(()=>{}); }
 });
}
async function session(browser,label) {
 const user=users.find(user=>user.label===label), context=await browser.newContext({viewport:{width:1440,height:1000}}); await routeCandidate(context);
 const page=await context.newPage(); await page.goto(base);
 await page.locator('#landing-email').fill(user.email); await page.getByRole('button',{name:'Continue with email'}).click();
 await page.waitForURL('https://auth.samma.co.za/**'); await page.locator('#password').fill(user.password); await page.locator('#kc-login').click(); await page.waitForURL(base+'/person');
 const cookie=(await context.cookies(base)).find(cookie=>cookie.name==='__Host-samma.session-token'); assert.ok(cookie);
 return {context,page,user,headers:{Cookie:cookie.name+'='+cookie.value}};
}
const api=(s,path,options={})=>s.context.request.fetch((candidate||base)+path,{...options,headers:{...s.headers,...options.headers}});
async function createCompany(s,name) {
 await s.page.goto(base+'/person'); await s.page.getByRole('link',{name:'Create company',exact:true}).click();
 await s.page.getByLabel('Company name',{exact:true}).fill(name); await s.page.getByRole('button',{name:'Create company',exact:true}).click(); await s.page.waitForURL('**/company?companyId=*');
 const companyId=new URL(s.page.url()).searchParams.get('companyId');
 await s.page.getByRole('link',{name:'Team & Access'}).click();
 const self=s.page.locator('section').filter({has:s.page.getByRole('heading',{name:'Your membership',exact:true})});
 await self.getByLabel('Add functional role').selectOption({label:'HR'}); await self.getByRole('button',{name:'Assign role',exact:true}).click(); await self.getByRole('button',{name:'Revoke HR',exact:true}).waitFor();
 return companyId;
}
async function employeeInvite(s,companyId,email) {
 await s.page.goto(base+'/company?companyId='+companyId); await s.page.getByRole('link',{name:'Add person',exact:true}).click();
 await s.page.getByLabel('Employee email').fill(email); await s.page.getByRole('button',{name:'Create invitation',exact:true}).click();
 await s.page.getByLabel('DEV invitation link',{exact:true}).waitFor();
 return s.page.getByLabel('DEV invitation link',{exact:true}).inputValue();
}
async function accept(s,link) { await s.page.goto(link); await s.page.getByRole('button',{name:'Accept invitation',exact:true}).click(); await s.page.waitForURL(/\/(person|company\?companyId=.*)$/); }
async function employeeProfile(s,companyId) {
 await s.page.goto(base+'/company?companyId='+companyId); await s.page.getByRole('link',{name:'Synthetic employee',exact:true}).click(); await s.page.waitForURL('**/company/people/*');
 return new URL(s.page.url()).pathname.split('/').pop();
}
async function upload(s,relationshipId,title,definitionLabel) {
 await s.page.goto(base+'/company/people/'+relationshipId); await s.page.getByRole('link',{name:'Add Record',exact:true}).click();
 await s.page.getByLabel('Record type').selectOption({label:definitionLabel});
 const definitionId=await s.page.getByLabel('Record type').inputValue();
 await s.page.getByLabel('Title',{exact:true}).fill(title); await s.page.locator('input[type=file]').setInputFiles({name:'synthetic-workflow.pdf',mimeType:'application/pdf',buffer:bytes});
 await s.page.getByRole('button',{name:'Save record',exact:true}).click(); await s.page.waitForURL(base+'/records/**');
 assert.ok((await s.page.locator('body').innerText()).includes('Not malware scanned'));
 const link=await s.page.getByRole('link',{name:'Download current version'}).getAttribute('href');
 const response=await api(s,link); assert.equal(response.status(),200); assert.equal(hash(await response.body()),hash(bytes));
 return {recordId:new URL(s.page.url()).pathname.split('/').pop(),link,definitionId,relationshipId};
}
async function responsive(s,path,label) {
 for(const width of [1440,768,390]) { await s.page.setViewportSize({width,height:1000}); await s.page.goto(base+path); await s.page.locator('main').waitFor();
  assert.equal(await s.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,label+' overflow at '+width);
  await s.page.screenshot({path:root+'/'+label+'-'+width+'.png',fullPage:true});
 }
 await s.page.setViewportSize({width:1440,height:1000});
}
async function logout(s) {
 await s.page.goto(base+'/person'); await s.page.getByRole('button',{name:'Sign out',exact:true}).click();
 await s.page.waitForURL('https://auth.samma.co.za/**');
 const confirm=s.page.locator('#kc-logout'); if(await confirm.count()) await confirm.click();
 else { const button=s.page.getByRole('button',{name:/log out|logout/i}); if(await button.count()) await button.click(); }
 await s.page.waitForURL(base+'/');
 await s.page.goto(base+'/person'); await s.page.waitForURL(base+'/sign-in');
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  if(process.argv.includes('--verify-existing')) {
   const f=JSON.parse(fs.readFileSync(root+'/result.json','utf8'));
   const actors=[]; for(const label of ['owner-a','owner-b','employee','billing']) actors.push(await session(browser,label));
   const [a,b,employee,billing]=actors, [visibleA,hiddenA,visibleB]=f.records;
   for(const [actor,record,expected] of [[a,visibleA,200],[b,visibleB,200],[employee,visibleA,200],[employee,visibleB,200],[employee,hiddenA,404],[billing,visibleA,404],[a,visibleB,404],[b,visibleA,404]]) {
    const response=await api(actor,record.link); assert.equal(response.status(),expected); if(expected===200) assert.equal(hash(await response.body()),f.checksum);
   }
   for(const [actor,company] of [[a,f.companyA],[b,f.companyB]]) { await actor.page.goto(base+'/company?companyId='+company); assert.ok((await actor.page.locator('body').innerText()).includes('Synthetic employee')); }
   await employee.page.goto(base+'/person'); const text=await employee.page.locator('body').innerText(); assert.ok(text.includes('Synthetic visible Company A')&&text.includes('Synthetic visible Company B')&&!text.includes('Synthetic hidden Company A'));
   assert.equal((await api(a,'/governance')).status(),404);
   const legal=await api(a,'/legal-access'); assert.equal(legal.status(),200); assert.ok(!(await legal.text()).includes('Synthetic visible Company A'));
   const anonymous=await browser.newContext(); assert.equal((await anonymous.request.get((candidate||base)+'/api/files/'+visibleA.link.split('/').pop())).status(),401); await anonymous.close();
   f.actors=actors.map(actor=>({label:actor.user.label,headers:actor.headers})); fs.writeFileSync(root+'/result.json',JSON.stringify(f),{mode:0o600});
   await logout(billing); assert.equal((await api(billing,visibleA.link)).status(),401);
   console.log('PASS fresh real OIDC logins, persisted company/person records and checksum downloads, wrong-company/hidden/Billing/anonymous denials, Governance separation, protected Legal Access and complete provider-confirmed logout');
   return;
  }
  const a=await session(browser,'owner-a');
  assert.equal((await api(a,'/governance')).status(),404);
  const companyA=await createCompany(a,'Synthetic Workflow Company A');
  const invitationA=await employeeInvite(a,companyA,users.find(user=>user.label==='employee').email);
  const b=await session(browser,'owner-b'); const companyB=await createCompany(b,'Synthetic Workflow Company B');
  const invitationB=await employeeInvite(b,companyB,users.find(user=>user.label==='employee').email);
  const employee=await session(browser,'employee');
  assert.ok((await employee.page.locator('body').innerText()).includes('Company invitations'));
  const wrong=await api(b,'/api/workflow',{method:'POST',headers:{Origin:base,'X-Samma-Workflow':'1'},data:{operation:'accept',token:new URL(invitationA).hash.slice(1)}}); assert.equal(wrong.status(),403);
  await accept(employee,invitationA); await accept(employee,invitationB);
  const relationshipA=await employeeProfile(a,companyA), relationshipB=await employeeProfile(b,companyB);
  console.log('PASS real Keycloak onboarding, browser company creation, explicit Owner-to-HR assignment, two invitations and employee acceptance; no Governance bypass');
  const visibleA=await upload(a,relationshipA,'Synthetic visible Company A','Synthetic employee document');
  const hiddenA=await upload(a,relationshipA,'Synthetic hidden Company A','Synthetic internal HR note');
  const visibleB=await upload(b,relationshipB,'Synthetic visible Company B','Synthetic employee document');
  await employee.page.goto(base+'/person');
  const text=await employee.page.locator('body').innerText(); assert.ok(text.includes('Synthetic visible Company A')); assert.ok(text.includes('Synthetic visible Company B')); assert.ok(!text.includes('Synthetic hidden Company A'));
  for(const record of [visibleA,visibleB]) { const response=await api(employee,record.link); assert.equal(response.status(),200); assert.equal(hash(await response.body()),hash(bytes)); assert.equal(response.headers()['x-samma-scan-status'],'NOT_SCANNED_DEV'); }
  for(const [actor,record] of [[employee,hiddenA],[a,visibleB],[b,visibleA]]) { assert.equal((await api(actor,record.link)).status(),404); assert.equal((await api(actor,'/records/'+record.recordId)).status(),404); }
  assert.equal((await api(b,'/company/people/'+relationshipA)).status(),404);
  assert.equal((await api(b,'/company?companyId='+companyA)).status(),404);
  assert.equal((await api(b,'/company/team?companyId='+companyA)).status(),404);
  const headers={Origin:base,'X-Samma-Upload':'1','X-Samma-Relationship':relationshipA,'X-Samma-Definition':visibleA.definitionId,'X-Samma-Title':'Synthetic denied','X-Samma-Filename':'test.pdf','Content-Type':'application/octet-stream'};
  assert.equal((await api(b,'/api/records/upload',{method:'POST',headers,data:bytes})).status(),403);
  assert.equal((await api(a,'/api/workflow',{method:'POST',headers:{Origin:'https://hostile.invalid','X-Samma-Workflow':'1'},data:{operation:'create-company',name:'Denied'}})).status(),403);
  console.log('PASS real Garage uploads, explicit DEV scan state, checksum downloads, employee visible/hidden policy and cross-company read/write/profile/team denial');
  await a.page.goto(base+'/company/team?companyId='+companyA);
  await a.page.getByLabel('Team member email').fill(users.find(user=>user.label==='billing').email); await a.page.getByLabel('Billing',{exact:true}).check();
  await a.page.getByRole('button',{name:'Create team invitation',exact:true}).click(); await a.page.getByLabel('DEV invitation link',{exact:true}).waitFor(); const billingLink=await a.page.getByLabel('DEV invitation link',{exact:true}).inputValue();
  const billing=await session(browser,'billing'); await accept(billing,billingLink);
  assert.ok(!(await billing.page.locator('body').innerText()).includes('Synthetic employee'));
  assert.equal((await api(billing,visibleA.link)).status(),404); assert.equal((await api(billing,'/api/records/upload',{method:'POST',headers,data:bytes})).status(),403);
  assert.equal((await api(billing,'/company/people/'+relationshipA)).status(),404);
  await responsive(employee,'/person','person'); await responsive(a,'/company?companyId='+companyA,'company'); await responsive(a,'/company/people/'+relationshipA,'profile'); await responsive(a,'/company/team?companyId='+companyA,'team'); await responsive(a,'/company/relationships/'+relationshipA+'/add-record','add-record');
  await a.page.goto(base+'/company/team?companyId='+companyA); const self=a.page.locator('section').filter({has:a.page.getByRole('heading',{name:'Your membership',exact:true})});
  const [revoked] = await Promise.all([a.page.waitForResponse(response=>response.url()===base+'/api/workflow' && response.request().method()==='POST'), self.getByRole('button',{name:'Revoke HR',exact:true}).click()]); assert.equal(revoked.status(),200);
  await self.getByRole('button',{name:'Revoke HR',exact:true}).waitFor({state:'detached'});
  assert.equal((await api(a,visibleA.link)).status(),404,'revoked HR download must be denied after committed mutation');
  await self.getByLabel('Add functional role').selectOption({label:'HR'}); await self.getByRole('button',{name:'Assign role',exact:true}).click(); await self.getByRole('button',{name:'Revoke HR',exact:true}).waitFor();
  console.log('PASS separate Billing membership, restricted role denial, live role revocation, and 1440/768/390 layouts without overflow');
  fs.writeFileSync(root+'/result.json',JSON.stringify({companyA,companyB,relationshipA,relationshipB,records:[visibleA,hiddenA,visibleB],checksum:hash(bytes),actors:[a,b,employee,billing].map(s=>({label:s.user.label,headers:s.headers}))}),{mode:0o600});
  await logout(billing); assert.equal((await api(billing,visibleA.link)).status(),401);
  console.log('PASS real application/provider logout revokes session; private persistence manifest saved');
 } finally {await browser.close();}
})().catch(error=>{console.error('Workflow browser validation failed:',error.name,String(error.message).replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]'));process.exitCode=1;});
