import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const folder='shoot-frontend/data/pages';await mkdir(folder,{recursive:true});
const read=async p=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,''));
const manifest=await read('shoot-frontend/data/routes.json').catch(()=>({routes:{},failures:[],sitemaps:[]}));
let browser;
if(process.argv.includes('--browser')){
 const {connectBrowser}=await import('./browser.mjs');browser=await connectBrowser();
 await browser.send('Page.navigate',{url:'https://imgmodels.com/'});
 await new Promise(resolve=>setTimeout(resolve,1800));
}
const known={'/':'home','/directory/':'directory','/search/':'search','/from-the-archive/':'from-the-archive','/contact/':'contact','/about-us/':'about-us','/recruitmentwarning/':'recruitmentwarning','/under-18-faq/':'under-18-faq','/new-york-state-fashion-workers-act/':'new-york-state-fashion-workers-act'};
for(let n=2;n<=29;n++)known[`/from-the-archive/page/${n}/`]=`archive-${n}`;
Object.assign(manifest.routes,known);
const pending=new Set(),seenMaps=new Set();
async function get(url){await new Promise(r=>setTimeout(r,1000));const r=browser?await browser.eval(`fetch(${JSON.stringify(url)},{credentials:'omit',signal:AbortSignal.timeout(45000)}).then(async r=>({status:r.status,ok:r.ok,body:await r.text()}))`):await fetch(url,{signal:AbortSignal.timeout(45000)});if(r.status===429){const e=new Error('HTTP 429: capture stopped; retry after the reference rate limit clears');e.rateLimited=true;throw e;}if(!r.ok)throw new Error(`HTTP ${r.status}`);return browser?r.body:await r.text();}
const normalize=url=>{const u=new URL(url,'https://imgmodels.com');return u.pathname.replace(/\/+$/,'')+'/'};
async function sitemap(url){if(seenMaps.has(url))return;seenMaps.add(url);const cache='reference/'+new URL(url).pathname.split('/').pop();const xml=await readFile(cache,'utf8').catch(async()=>{const data=await get(url);await writeFile(cache,data);return data});const locs=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&'));if(xml.includes('<sitemapindex'))for(const loc of locs)await sitemap(loc);else for(const loc of locs)if(new URL(loc).origin==='https://imgmodels.com')pending.add(normalize(loc));}
await sitemap('https://imgmodels.com/wp-sitemap.xml');
const talent=(await read('shoot-frontend/data/talent.json')).entries;
for(const t of talent)for(const url of[t.permalink,...Object.values(t.territoryUrls||{})])if(url)pending.add(normalize(url));
manifest.sitemaps=[...seenMaps];manifest.discoveredRoutes=[...pending];manifest.discoveredAt=new Date().toISOString();
const clean=h=>h.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,'');
const queue=[...pending].filter(p=>!manifest.routes[p]);let cursor=0,done=0;manifest.failures=[];
async function save(){await writeFile('shoot-frontend/data/routes.json',JSON.stringify(manifest,null,2));}
await save();console.log(JSON.stringify({discovered:pending.size,remaining:queue.length,sitemaps:seenMaps.size}));
async function worker(){while(cursor<queue.length){const path=queue[cursor++];try{
 const raw=await get('https://imgmodels.com'+path),body=raw.match(/<body\b[^>]*class=["']([^"']*)["'][^>]*>([\s\S]*?)<\/body>/i);
 if(!body)throw new Error('No public HTML body');
 const slug='route-'+createHash('sha256').update(path).digest('hex').slice(0,20);
 const title=raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].replaceAll('&amp;','&').replaceAll('&#8211;','–').replaceAll('&#039;',"'");
 await writeFile(`${folder}/${slug}.json`,JSON.stringify({title,bodyClass:body[1],html:clean(body[2]),source:'https://imgmodels.com'+path}));manifest.routes[path]=slug;
 }catch(e){manifest.failures.push({path,error:e.message});if(e.rateLimited){manifest.pendingRoutes=queue.slice(cursor-1);await save();console.log(e.message);return;}}done++;manifest.pendingRoutes=queue.slice(cursor);if(done%25===0){await save();console.log(`${done}/${queue.length} captured; ${manifest.failures.length} failures`);}}}
try{await worker();await save();console.log(JSON.stringify({routes:Object.keys(manifest.routes).length,failures:manifest.failures}));}
finally{if(browser){await browser.send('Page.close');browser.close();}}
