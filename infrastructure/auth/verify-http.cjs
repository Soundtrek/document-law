const assert = require('node:assert/strict');
const base = process.env.SAMMA_TEST_URL || 'https://samma.co.za';
(async()=>{
  const csrfResponse = await fetch(base+'/api/auth/csrf');
  assert.equal(csrfResponse.status,200);
  const cookie = csrfResponse.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  const {csrfToken} = await csrfResponse.json();
  const response = await fetch(base+'/api/auth/signin/keycloak?redirect_uri=https://evil.example&client_id=evil&scope=evil',{
    method:'POST',redirect:'manual',headers:{Origin:'https://samma.co.za',Cookie:cookie,'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({csrfToken,callbackUrl:'https://evil.example',login_hint:'test@example.test'})
  });
  assert.equal(response.status,302);
  const target = new URL(response.headers.get('location'));
  assert.equal(target.origin,'https://auth.samma.co.za');
  assert.equal(target.searchParams.get('redirect_uri'),'https://samma.co.za/api/auth/callback/keycloak');
  assert.equal(target.searchParams.get('client_id'),'samma-web');
  assert.equal(target.searchParams.get('scope'),'openid email profile');
  assert.equal(target.searchParams.get('code_challenge_method'),'S256');
  const denied = await fetch(base+'/api/auth/signin/keycloak',{method:'POST',headers:{Origin:'https://evil.example'}});
  assert.equal(denied.status,403);
  const callback = await fetch(base+'/api/auth/callback/keycloak?state=invalid&code=invalid',{redirect:'manual'});
  assert.equal(callback.status,302);
  assert.ok(!callback.headers.getSetCookie().some(value=>value.startsWith('__Host-samma.session-token=')));
  console.log('PASS OAuth parameter override rejection, fixed client/callback, PKCE, foreign Origin rejection, invalid callback/state rejection.');
})().catch(()=>{console.error('HTTP authentication security check failed; secrets omitted.');process.exitCode=1;});
