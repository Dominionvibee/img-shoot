import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {connectBrowser} from './browser.mjs';
import {canonicalPath} from '../shoot-frontend/src/navigation.mjs';
const root=resolve(import.meta.dirname,'../shoot-frontend');
const inventory=JSON.parse(await readFile(resolve(root,'docs/milestones/F01/qa/current-route-inventory.json'),'utf8'));
const canonicalPages=new Map(inventory.pages.filter(page=>page.kind!=='img'||canonicalPath(page.path).replace(/\/+$/,'')===page.path.replace(/\/+$/,'')).map(page=>[canonicalPath(page.path).replace(/\/+$/,''),page]));
const retry=process.argv.includes('--retry');
const initial=retry?JSON.parse(await readFile(resolve(root,'docs/milestones/F01/qa/all-route-renders.json'),'utf8')):null;
const targets=retry?new Set([...initial.failures.map(f=>f.target),...initial.exceptions.map(f=>f.path)]):null;
const pages=retry?inventory.pages.filter(page=>targets.has(page.path)):inventory.pages;
const result={startedAt:new Date().toISOString(),mode:'All captured routes rendered at 1440px; image/video requests blocked and Cache-Control:only-if-cached for structural audit only',checked:0,failures:[],exceptions:[],blockedMediaRejections:[],listenerSamples:[]};
if(retry)result.targets=[...targets];
const out=resolve(root,'docs/milestones/F01/qa',retry?'route-render-retest.json':'all-route-renders.json');
let cursor=0;
async function worker(index){
const browser=await connectBrowser();
try{
  await browser.send('Network.enable');
  await browser.send('Network.setExtraHTTPHeaders',{headers:{'Cache-Control':'only-if-cached'}});
  await browser.send('Network.setBlockedURLs',{urls:['*.jpg*','*.jpeg*','*.png*','*.webp*','*.gif*','*.mp4*','*.webm*']});
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await browser.send('Page.navigate',{url:'http://localhost:4173/'});
  for(let n=0;n<200;n++){if(await browser.eval(`typeof F01Navigate==='function'&&!!document.querySelector('.reference-page')?.innerHTML`))break;await new Promise(resolve=>setTimeout(resolve,100));}
  await browser.eval(`window.__allRouteAudit='persistent';localStorage.setItem('f01-cookie-consent',JSON.stringify({value:'essential'}));localStorage.setItem('f01-cookie-consent-wme',JSON.stringify({value:'essential'}));document.querySelector('#onetrust-reject-all-handler')?.click()`);
  let visits=0;
  while(cursor<pages.length){
    const page=pages[cursor++];
    const path=canonicalPath(page.path);
    const expectedTitle=(canonicalPages.get(path.replace(/\/+$/,''))||page).title;
    const start=browser.events.length;
    const state=await browser.eval(`new Promise(resolve=>{
      window.F01Navigate(${JSON.stringify(path)});
      const started=Date.now();
      const check=()=>{
        const markup=document.querySelector('.reference-page')?.innerHTML;
        const ready=location.pathname===${JSON.stringify(path)}&&markup&&${expectedTitle?'document.title==='+JSON.stringify(expectedTitle.replace(/\s+/g,' ').trim()):'true'};
        if(!ready&&Date.now()-started<8000){setTimeout(check,30);return;}
        setTimeout(()=>resolve({ready:!!ready,path:location.pathname,title:document.title,
          origin:location.origin,document:window.__allRouteAudit,markup:markup?.length||0,
          error:document.body.innerText.startsWith('Page capture unavailable')}),80);
      };setTimeout(check,20);
    })`);
    if(!state.ready||state.error||state.origin!=='http://localhost:4173'||state.document!=='persistent')result.failures.push({target:page.path,...state});
    const thrown=browser.events.slice(start).filter(e=>e.method==='Runtime.exceptionThrown');
    const blockedMedia=thrown.filter(event=>event.params.exceptionDetails.exception?.description?.startsWith('NotSupportedError:'));
    if(blockedMedia.length)result.blockedMediaRejections.push({path:page.path,errors:blockedMedia});
    const errors=thrown.filter(event=>!blockedMedia.includes(event));
    if(errors.length)result.exceptions.push({path:page.path,errors});
    result.checked++;
    visits++;
    if(visits%100===0){
      const metrics=await browser.send('Runtime.evaluate',{expression:`({heap:performance.memory?.usedJSHeapSize,windowListeners:Object.fromEntries(Object.entries(getEventListeners(window)).map(([key,value])=>[key,value.length])),documentListeners:Object.fromEntries(Object.entries(getEventListeners(document)).map(([key,value])=>[key,value.length]))})`,includeCommandLineAPI:true,returnByValue:true});
      result.listenerSamples.push({worker:index,visits,...metrics.result.value});
    }
    if(result.checked%100===0){await writeFile(out,JSON.stringify(result,null,2));console.log(JSON.stringify({checked:result.checked,total:pages.length,failures:result.failures.length,exceptions:result.exceptions.length}));}
  }
}finally{
  await browser.send('Page.close');browser.close();
}
}
await Promise.all(Array.from({length:4},(_,index)=>worker(index)));
result.finishedAt=new Date().toISOString();await writeFile(out,JSON.stringify(result,null,2));
console.log(JSON.stringify({checked:result.checked,failures:result.failures.length,exceptions:result.exceptions.length}));
