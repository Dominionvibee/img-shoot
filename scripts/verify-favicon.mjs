import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

// Reuse an existing Playwright installation; no project dependency is added.
// Set PLAYWRIGHT_CORE_PATH to its package directory when not installed locally.
const require=createRequire(import.meta.url);
const {chromium,firefox}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const root=resolve(import.meta.dirname,'../shoot-frontend');
const origin=process.env.FRONTEND_URL||'http://localhost:4173';
const provenance=JSON.parse(await readFile(resolve(root,'docs/milestones/F01/favicon-source.json'),'utf8'));
const inventory=JSON.parse(await readFile(resolve(root,'docs/milestones/F01/qa/current-route-inventory.json'),'utf8'));
const targets=[
  ['/','home'],['/directory/','directory'],['/contact','contact'],
  ['/directory/london/vanesa-lorenzo/','profile-vanesa-lorenzo'],
  ['/from-the-archive/page/2/','archive-2'],['/get-scouted','get-scouted'],
  ['/do-not-sell-my-personal-info','do-not-sell-my-personal-info'],
  ['/term-of-use','legal-terms-of-use'],['/img-privacy-policy','corporate-privacy-policy'],
];
const pages=await Promise.all(targets.map(async([path,slug])=>({path,title:JSON.parse(await readFile(resolve(root,'data/pages',slug+'.json'),'utf8')).title||'IMG Models'})));
const expectedIcons=[
  ['icon','/favicon.ico?v=2.01',''],['icon','/favicon-32x32.png','32x32'],
  ['icon','/favicon-16x16.png','16x16'],['shortcut icon','/favicon.ico',''],
  ['apple-touch-icon','/apple-touch-icon.png','180x180'],['manifest','/site.webmanifest',''],
];
const report={checkedAt:new Date().toISOString(),origin,allRouteHttp:{checked:0,failures:[]},browsers:[],
  limits:['Mobile checks use emulated or mobile-sized desktop-engine viewports, not physical phones.','Headless browser checks verify original icon requests, decoding and route inheritance; native tab-strip screenshots are not captured.']};

async function browserCheck(name,type,options){
  const browser=await type.launch({headless:true,...options});
  const result={name,version:browser.version(),viewports:[]};
  try{
    for(const mobile of [false,true]){
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},
        deviceScaleFactor:mobile?2:1,hasTouch:mobile,isMobile:name==='Firefox'?false:mobile});
      const page=await context.newPage();
      const requested=[];
      page.on('response',response=>{if(/\/favicon(?:-\d+x\d+\.png|\.ico)/.test(response.url()))requested.push({url:response.url(),status:response.status()});});
      const rows=[];
      const ready=async expected=>{
        await page.waitForFunction(title=>document.title===title&&typeof window.F01Navigate==='function'&&document.querySelector('.reference-page')?.innerHTML.length>1000,expected,{timeout:20000});
      };
      const state=async()=>page.evaluate(()=>({title:document.title,icons:[...document.head.querySelectorAll('link[rel*="icon"],link[rel="manifest"]')].map(link=>[link.rel,new URL(link.href).pathname+new URL(link.href).search,link.getAttribute('sizes')||''])}));
      for(const target of pages){
        await page.goto(origin+target.path,{waitUntil:'domcontentloaded'});
        await ready(target.title);
        const direct=await state();assert.deepEqual(direct.icons,expectedIcons);
        await page.reload({waitUntil:'domcontentloaded'});await ready(target.title);
        const refreshed=await state();assert.deepEqual(refreshed,direct);
        rows.push({path:target.path,title:refreshed.title,direct:true,refresh:true});
      }
      await page.goto(origin,{waitUntil:'domcontentloaded'});await ready(pages[0].title);
      await page.evaluate(()=>{window.__faviconNavigationDocument='same';document.querySelector('#onetrust-reject-all-handler')?.click();[...document.querySelectorAll('footer a')].find(link=>link.getAttribute('href')==='/contact').click();});
      await ready(pages.find(target=>target.path==='/contact').title);
      assert.equal(await page.evaluate(()=>window.__faviconNavigationDocument),'same');
      assert.deepEqual((await state()).icons,expectedIcons);
      const automaticIconRequests=requested.slice();
      const decoded=[];
      for(const asset of provenance.assets){
        const response=await context.request.get(origin+'/'+asset.filename);
        assert.equal(response.status(),200);
        assert.equal(response.headers()['content-type'].split(';')[0],asset.contentType);
        const bytes=await response.body();assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
        if(asset.filename!=='site.webmanifest'){
          const dimensions=await page.evaluate(async name=>{const image=new Image();image.src='/'+name;try{await image.decode();}catch(error){throw new Error(name+': '+error.message);}return {width:image.naturalWidth,height:image.naturalHeight};},asset.filename);
          const size=Number(asset.filename.match(/(\d+)x\d+/)?.[1])||(asset.filename==='apple-touch-icon.png'?180:null);
          if(size)assert.deepEqual(dimensions,{width:size,height:size});
          else assert.ok([16,32,48].includes(dimensions.width));
          decoded.push({file:asset.filename,...dimensions});
        }
      }
      result.viewports.push({mode:mobile?'mobile viewport':'desktop',routes:rows,spaNavigation:true,decoded,automaticIconRequests});
      await context.close();
    }
  }finally{await browser.close();}
  return result;
}

let cursor=0;
async function httpWorker(){
  while(cursor<inventory.pages.length){
    const {path}=inventory.pages[cursor++];
    const response=await fetch(origin+path);const html=await response.text();
    if(response.status!==200||!expectedIcons.every(([,href])=>html.includes(`href="${href}"`)))report.allRouteHttp.failures.push({path,status:response.status});
    report.allRouteHttp.checked++;
  }
}
await Promise.all(Array.from({length:8},httpWorker));
assert.equal(report.allRouteHttp.failures.length,0);
const runs=await Promise.allSettled([
  browserCheck('Chrome',chromium,{channel:'chrome'}),
  browserCheck('Edge',chromium,{channel:'msedge'}),
  browserCheck('Firefox',firefox,process.env.FIREFOX_EXECUTABLE?{executablePath:process.env.FIREFOX_EXECUTABLE}:{}),
]);
for(let i=0;i<runs.length;i++){
  const run=runs[i];
  report.browsers.push(run.status==='fulfilled'?run.value:{name:['Chrome','Edge','Firefox'][i],error:run.reason.stack||String(run.reason)});
}
await writeFile(resolve(root,'docs/milestones/F01/qa/favicon-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({allRouteHttp:report.allRouteHttp,browsers:report.browsers.map(browser=>({name:browser.name,version:browser.version,viewports:browser.viewports?.length,error:browser.error}))},null,2));
assert.ok(report.browsers.every(browser=>!browser.error),'See favicon-verification.json for browser failures');
