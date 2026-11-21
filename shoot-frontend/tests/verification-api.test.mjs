import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {handleVerificationApi} from '../src/verification-api.mjs';
import {createFrontendServer} from '../server.mjs';

const request=(url,{method='GET',body,origin='http://localhost:4173',type='application/json'}={})=>{
  const stream=Readable.from(body===undefined?[]:[Buffer.from(typeof body==='string'?body:JSON.stringify(body))]);
  Object.assign(stream,{url,method,headers:{origin,'content-type':type}});return stream;
};
const response=()=>({headers:{},setHeader(name,value){this.headers[name.toLowerCase()]=value;},writeHead(status,headers){this.status=status;for(const [name,value]of Object.entries(headers))this.setHeader(name,value);},end(body){this.body=JSON.parse(body);}});

test('public config proxy exposes only the public contract, with no upstream credential fields',async()=>{
  const res=response();
  await handleVerificationApi(request('/api/recaptcha/config'),res,{target:'http://localhost:4000',fetchImpl:async()=>Response.json({siteKey:'public-unit-fixture',configured:true,secretKey:'not-a-real-secret',other:'internal'})});
  assert.equal(res.status,200);
  assert.deepEqual(res.body,{siteKey:'public-unit-fixture',configured:true});
  assert.equal(res.headers['cache-control'],'no-store');
});

test('token proxy preserves Origin but never forwards cookies, authentication or client IP assertions',async()=>{
  const req=request('/api/privacy-requests/verify',{method:'POST',body:{recaptchaToken:'opaque-unit-token-value'}});
  Object.assign(req.headers,{cookie:'session=unit-fixture',authorization:'unit-auth','x-forwarded-for':'untrusted'});
  const res=response();let sent;
  await handleVerificationApi(req,res,{target:'http://localhost:4000',fetchImpl:async(url,options)=>{sent={url:String(url),options};return Response.json({verified:true,secretKey:'not-a-real-secret'});}});
  assert.equal(sent.url,'http://localhost:4000/api/privacy-requests/verify');
  assert.deepEqual(sent.options.headers,{Accept:'application/json','Content-Type':'application/json',Origin:'http://localhost:4173'});
  assert.deepEqual(JSON.parse(sent.options.body),{recaptchaToken:'opaque-unit-token-value'});
  assert.equal(sent.options.redirect,'error');assert.deepEqual(res.body,{verified:true});
});

test('upstream errors fail closed and expose retry status, never a verified result',async()=>{
  const res=response();
  await handleVerificationApi(request('/api/privacy-requests/verify',{method:'POST',body:{recaptchaToken:'opaque-unit-token-value'}}),res,{fetchImpl:async()=>Response.json({code:'RATE_LIMITED',message:'Try later.',verified:true},{status:429,headers:{'Retry-After':'60'}})});
  assert.equal(res.status,429);assert.equal(res.headers['retry-after'],'60');assert.deepEqual(res.body,{code:'RATE_LIMITED',message:'Try later.'});
});

test('unreachable verifier fails closed with a recoverable alternative and no exception details',async()=>{
  const res=response();
  await handleVerificationApi(request('/api/recaptcha/config'),res,{fetchImpl:async()=>{throw Error('internal-unit-fixture');}});
  assert.equal(res.status,503);assert.equal(res.body.code,'VERIFICATION_UNAVAILABLE');assert.doesNotMatch(JSON.stringify(res.body),/internal-unit-fixture/);
});

test('proxy rejects unsupported methods, non-JSON bodies and oversized requests before forwarding',async()=>{
  const cases=[
    [request('/api/recaptcha/config',{method:'POST'}),405],
    [request('/api/privacy-requests/verify',{method:'GET'}),405],
    [request('/api/privacy-requests/verify',{method:'POST',body:'value',type:'text/plain'}),415],
    [request('/api/privacy-requests/verify',{method:'POST',body:'a'.repeat(16385)}),413],
  ];
  for(const [req,status]of cases){const res=response();await handleVerificationApi(req,res,{fetchImpl:async()=>{assert.fail('Should not forward');}});assert.equal(res.status,status);}
});

test('proxy never consumes unrelated application routes or accepts a client-controlled upstream URL',async()=>{
  assert.equal(await handleVerificationApi(request('/api/reference-page?path=/'),response()),false);
  for(const target of ['file:///private','https://user:password@example.invalid','http://localhost:4000/private']){
    const res=response();await handleVerificationApi(request('/api/recaptcha/config'),res,{target,fetchImpl:async()=>assert.fail('Invalid upstream')});assert.equal(res.status,503);
  }
});

test('frontend server never serves runtime .env files or repository metadata',async()=>{
  const server=createFrontendServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    for(const path of ['/.env','/.env.local','/.env.example','/.git/config','/%2eenv']){
      const response=await fetch(`http://127.0.0.1:${server.address().port}${path}`);assert.equal(response.status,403,path);
    }
  }finally{await new Promise(resolve=>server.close(resolve));}
});
