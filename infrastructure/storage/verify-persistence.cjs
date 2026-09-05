const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root='/srv/nuc-archive/juanity/validation/storage-private';
const value=JSON.parse(fs.readFileSync(root+'/browser-result.json','utf8'));
const base=process.env.SAMMA_CANDIDATE_URL||'https://samma.co.za';
(async()=>{
 const response=await fetch(base+value.firstLink,{headers:{Cookie:value.cookie.name+'='+value.cookie.value}});
 assert.equal(response.status,200);
 assert.equal(crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),value.checksum);
 const current=await fetch(base+value.currentLink,{headers:{Cookie:value.cookie.name+'='+value.cookie.value}});assert.equal(current.status,200);await current.arrayBuffer();
 const ready=await fetch(base+'/api/ready');assert.equal(ready.status,200);const body=await ready.json();assert.equal(body.provider,'s3');assert.equal(body.database,true);assert.equal(body.storage,true);
 console.log('PASS stored session authorisation, prior/current file download, SHA-256 and DB/S3 readiness');
})().catch(error=>{console.error('Persistence verification failed',error.name);process.exitCode=1;});
