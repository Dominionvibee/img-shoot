import {connectBrowser} from './browser.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'../shoot-frontend');
const inventory=JSON.parse(await readFile(resolve(root,'docs/milestones/F01/qa/current-route-inventory.json'),'utf8'));
const manifest=JSON.parse(await readFile(resolve(root,'data/routes.json'),'utf8'));
const browser=await connectBrowser();
const results=[];
try{
  await browser.send('Page.navigate',{url:'https://imgmodels.com/'});
  await new Promise(resolve=>setTimeout(resolve,1500));
  for(const {target:path} of inventory.internalTargetsNotInventoried){
    if(manifest.routes[path])continue;
    await new Promise(resolve=>setTimeout(resolve,700));
    const response=await browser.eval(`fetch(${JSON.stringify('https://imgmodels.com'+path)},{credentials:'omit',signal:AbortSignal.timeout(45000)}).then(async r=>({status:r.status,url:r.url,html:await r.text()}))`);
    if(response.status===429){results.push({path,error:'Reference rate limit; stopped'});break;}
    const body=response.html.match(/<body\b([^>]*)>([\s\S]*?)<\/body>/i);
    if(!body||new URL(response.url).hostname!=='imgmodels.com'){
      results.push({path,error:'No public IMG document',status:response.status,url:response.url});continue;
    }
    const slug='route-'+createHash('sha256').update(path).digest('hex').slice(0,20);
    const html=body[2].replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
    const page={source:'https://imgmodels.com'+path,referenceUrl:response.url,referenceStatus:response.status,
      title:response.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].replaceAll('&amp;','&').replaceAll('&#8211;','–').replaceAll('&#039;',"'"),
      bodyClass:body[1].match(/\bclass=["']([^"']*)/i)?.[1]||'',html};
    await writeFile(resolve(root,'data/pages',slug+'.json'),JSON.stringify(page));
    manifest.routes[path]=slug;
    manifest.linkedRoutes=[...new Set([...(manifest.linkedRoutes||[]),path])];
    results.push({path,status:response.status,url:response.url});
    console.log(JSON.stringify(results.at(-1)));
  }
}finally{
  await writeFile(resolve(root,'data/routes.json'),JSON.stringify(manifest,null,2));
  await writeFile(resolve(root,'docs/milestones/F01/qa/linked-route-capture.json'),JSON.stringify(results,null,2));
  await browser.send('Page.close');browser.close();
}
