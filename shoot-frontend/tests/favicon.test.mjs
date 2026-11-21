import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createFrontendServer} from '../server.mjs';

const server=createFrontendServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
after(()=>new Promise(resolve=>server.close(resolve)));

test('original favicon public files retain their source bytes and media types',async()=>{
  const provenance=JSON.parse(await readFile(new URL('../docs/milestones/F01/favicon-source.json',import.meta.url),'utf8'));
  for(const asset of provenance.assets){
    const response=await fetch(`${origin}/${asset.filename}${asset.filename==='favicon.ico'?'?v=2.01':''}`);
    assert.equal(response.status,200,asset.filename);
    assert.equal(response.headers.get('content-type').split(';')[0],asset.contentType);
    const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.filename);
  }
});

test('nested and partner routes inherit origin-root icon links without changing titles',async()=>{
  const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
  for(const path of ['/','/directory/london/vanesa-lorenzo/','/from-the-archive/page/2/','/do-not-sell-my-personal-info','/term-of-use']){
    const response=await fetch(origin+path);
    assert.equal(response.status,200);
    const html=await response.text();
    assert.equal(html,index);
    assert.match(html,/<link rel="icon" href="\/favicon\.ico\?v=2\.01">/);
    assert.match(html,/<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png">/);
    assert.match(html,/<link rel="manifest" href="\/site\.webmanifest">/);
    assert.doesNotMatch(html,/favicon\.svg|vite\.svg|react\.svg/);
    assert.match(html,/<title>IMG Models<\/title>/);
  }
});
