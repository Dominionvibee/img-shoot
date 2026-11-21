import {connectBrowser} from './browser.mjs';
import {mkdir,writeFile}from'node:fs/promises';
const b=await connectBrowser();await mkdir('reference/qa/pages',{recursive:true});
const routes=['contact','about-us','recruitmentwarning','under-18-faq','new-york-state-fashion-workers-act','from-the-archive','search','directory','directory/london/vanesa-lorenzo'];
const result=[];
for(const route of routes)for(const width of[390,1440])for(const[label,origin]of[['reference','https://imgmodels.com'],['local','http://127.0.0.1:4173']]){
 await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:`${origin}/${route}/`});await new Promise(r=>setTimeout(r,1300));await b.eval('document.fonts.ready');
 await b.eval(`document.querySelector('#onetrust-reject-all-handler')?.click();window.scrollTo(0,0);document.querySelectorAll('video').forEach(v=>{v.pause();v.currentTime=0})`);
 await new Promise(r=>setTimeout(r,150));
 const metrics=await b.eval(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,text:document.body.innerText.slice(0,10000),broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.src).map(i=>i.src),blocks:[...document.querySelectorAll('main,.header,.footer')].map(e=>({class:e.className,rect:e.getBoundingClientRect().toJSON()}))})`);
 const name=`${route.replaceAll('/','-')}-${width}`;
 await writeFile(`reference/qa/pages/${label}-${name}.png`,Buffer.from((await b.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 result.push({route,width,label,...metrics});await writeFile('reference/qa/pages/results.json',JSON.stringify(result,null,2));
 console.log(`${label} ${route} ${width}: ${metrics.scrollWidth}, ${metrics.height}, broken=${metrics.broken.length}`);
}
await writeFile('reference/qa/pages/errors.json',JSON.stringify(b.events.filter(e=>e.method==='Runtime.exceptionThrown'),null,2));b.close();
