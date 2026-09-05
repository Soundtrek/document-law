const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root='/srv/nuc-archive/juanity/validation/storage-private';
const value=JSON.parse(fs.readFileSync(root+'/browser-result.json','utf8')), f=JSON.parse(fs.readFileSync(root+'/storage-fixture.json','utf8'));
const base=process.env.SAMMA_CANDIDATE_URL;
if(!base)throw new Error('Outage probe requires an isolated candidate');
(async()=>{
 execFileSync('docker',['stop','--time','30','juanity-storage'],{stdio:'pipe'});
 try {
  await new Promise(resolve=>setTimeout(resolve,5500));
  let response=await fetch(base+'/api/ready');assert.equal(response.status,503);assert.equal((await response.json()).provider,'s3');
  response=await fetch(base+value.firstLink,{headers:{Cookie:value.cookie.name+'='+value.cookie.value}});assert.equal(response.status,503);
  const headers={Cookie:value.cookie.name+'='+value.cookie.value,Origin:'https://samma.co.za','X-Samma-Upload':'1','X-Samma-Relationship':f.relationshipId,'X-Samma-Definition':f.versionId,'X-Samma-Title':'Synthetic outage','X-Samma-Filename':'synthetic.pdf','Content-Type':'application/octet-stream'};
  response=await fetch(base+'/api/records/upload',{method:'POST',headers,body:Buffer.from('%PDF-1.4 Synthetic outage\n%%EOF\n')});assert.equal(response.status,503);
  console.log('PASS Garage outage: readiness/upload/download fail closed with s3; no memory fallback');
 } finally {execFileSync('docker',['start','juanity-storage'],{stdio:'pipe'});}
})().catch(error=>{console.error('Outage verification failed',error.name);process.exitCode=1;});
