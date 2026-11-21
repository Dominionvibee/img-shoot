import{connectBrowser}from'./browser.mjs';import{readFile,writeFile}from'node:fs/promises';
const b=await connectBrowser(),manifest=JSON.parse(await readFile('shoot-frontend/data/routes.json','utf8')),paths=['/','/directory/','/directory/new-york/aalyah-ross/','/directory/london/vanesa-lorenzo/'];
for(const kind of['work','category','author']){const path=manifest.discoveredRoutes?.find(p=>p.startsWith('/'+kind+'/'));if(path)paths.push(path);}
const uncached=manifest.discoveredRoutes?.find(p=>p.startsWith('/directory/sydney/')&&!manifest.routes[p]);if(uncached)paths.push(uncached);
const results=[];
for(const path of paths){await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});const start=b.events.length;await b.send('Page.navigate',{url:'http://127.0.0.1:4173'+path});await new Promise(r=>setTimeout(r,4000));
const result=await b.eval(`({url:location.href,title:document.title,reactRoot:!!document.querySelector('#app')?._reactRootContainer||Object.keys(document.querySelector('#app')||{}).some(k=>k.startsWith('__reactContainer')),text:document.querySelector('main')?.innerText.slice(0,350),html:document.querySelector('.reference-page')?.innerHTML.length,externalInternal:[...document.querySelectorAll('a[href]')].filter(a=>a.href.startsWith('https://imgmodels.com/')&&!/wp-content/.test(a.href)).map(a=>a.href).slice(0,4)})`);
results.push({path,...result,errors:b.events.slice(start).filter(e=>e.method==='Runtime.exceptionThrown')});console.log(JSON.stringify(results.at(-1)));}
await writeFile('reference/react-routing-check.json',JSON.stringify(results,null,2));await b.send('Page.close');b.close();
