import {connectBrowser} from './browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';

const out='reference/qa/responsive-media';
await mkdir(out,{recursive:true});
const widths=[320,375,430,768,1024,1280,1920];
const routes=['new-york-state-fashion-workers-act','from-the-archive','directory/london/vanesa-lorenzo'];
const results=[];
const browser=await connectBrowser({newTab:true});
await browser.send('Emulation.setFocusEmulationEnabled',{enabled:true});
await browser.send('Log.enable');
await browser.send('Network.enable');
try {
 for(const route of routes) for(const width of widths) for(const [label,origin] of [['reference','https://imgmodels.com'],['local','http://127.0.0.1:4173']]) {
  await browser.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  browser.events.length=0;
  await browser.send('Page.navigate',{url:`${origin}/${route}/`});
  await new Promise(r=>setTimeout(r,1500));
  await browser.eval(`document.querySelectorAll('img').forEach(i=>{i.loading='eager'});document.querySelectorAll('video').forEach(v=>{v.preload='auto';v.load()});`);
  await browser.eval(`Promise.race([Promise.all([document.fonts.ready,...[...document.querySelectorAll('video')].map(v=>v.readyState>=2?Promise.resolve():new Promise(r=>{v.addEventListener('loadeddata',r,{once:true});v.addEventListener('error',r,{once:true})}))]),new Promise(r=>setTimeout(r,14000))])`);
  await browser.eval(`Promise.race([Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,5000))]);`);
  await browser.eval(`document.querySelectorAll('video').forEach(v=>{v.pause();v.currentTime=0});window.dispatchEvent(new Event('resize'));window.scrollTo(0,0);`);
  await new Promise(r=>setTimeout(r,650));
  const data=await browser.eval(`({url:location.href,title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,font:getComputedStyle(document.body).font,geometry:[...document.querySelectorAll('nav.header,main,.footer,.siteWrap,.defaultText,.workGrid,.profile,.portfolio,.talentProfile')].map(e=>({class:e.className,rect:e.getBoundingClientRect().toJSON()})),brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth&&i.currentSrc).map(i=>i.currentSrc),pendingImages:[...document.images].filter(i=>!i.complete).map(i=>i.currentSrc),videos:[...document.querySelectorAll('video')].map(v=>({src:v.currentSrc,state:v.readyState,width:v.videoWidth,height:v.videoHeight,currentTime:v.currentTime,rect:v.getBoundingClientRect().toJSON()}))})`);
  const errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown'||e.method==='Log.entryAdded'&&e.params.entry.level==='error').map(e=>e.params);
  const networkFailures=browser.events.filter(e=>e.method==='Network.loadingFailed').map(e=>({error:e.params.errorText,type:e.params.type,canceled:e.params.canceled}));
  const name=`${label}-${route.replaceAll('/','-')}-${width}.png`;
  await writeFile(`${out}/${name}`,Buffer.from((await browser.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  results.push({route,width,label,screenshot:name,...data,errors,networkFailures});
  await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify({route,width,label,height:data.height,scrollWidth:data.scrollWidth,broken:data.brokenImages.length,pending:data.pendingImages.length,errors:errors.length,videos:data.videos.map(v=>v.state)}));
 }
} finally {browser.close();}
