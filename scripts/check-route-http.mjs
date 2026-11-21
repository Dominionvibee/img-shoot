import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../shoot-frontend');
const inventory=JSON.parse(await readFile(resolve(root,'docs/milestones/F01/qa/current-route-inventory.json'),'utf8'));
const origin=process.env.FRONTEND_URL||'http://localhost:4173';
const failures=[];
let cursor=0,checked=0;
async function worker(){
  while(cursor<inventory.pages.length){
    const page=inventory.pages[cursor++];
    try{
      const response=await fetch(origin+page.path,{signal:AbortSignal.timeout(10000)});
      const html=await response.text();
      if(response.status!==200||!response.headers.get('content-type')?.startsWith('text/html')||!html.includes('/src/app.mjs'))
        failures.push({path:page.path,status:response.status,contentType:response.headers.get('content-type')});
    }catch(error){failures.push({path:page.path,error:error.message});}
    checked++;
  }
}
await Promise.all(Array.from({length:8},worker));
await writeFile(resolve(root,'docs/milestones/F01/qa/current-route-http.json'),JSON.stringify({checkedAt:new Date().toISOString(),origin,checked,failures},null,2));
assert.equal(failures.length,0,JSON.stringify(failures));
console.log(JSON.stringify({checked,failures:failures.length}));
