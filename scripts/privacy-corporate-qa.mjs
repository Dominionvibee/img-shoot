import {connectBrowser} from './browser.mjs';import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import assert from 'node:assert/strict';
const out=resolve(import.meta.dirname,'../reference/corporate'),b=await connectBrowser(),results=[];
try{
 await b.send('Network.enable');await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`try{localStorage.removeItem('img-corporate-cookie-preview')}catch{}`});
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 for(const [slug,path]of [['privacy','/img-privacy-policy'],['cookies','/img-cookie-policy']]){
  const original=JSON.parse(await readFile(resolve(out,slug+'-metrics.json'),'utf8'));
  await b.send('Page.navigate',{url:'http://localhost:4173'+path});
  for(let i=0;i<100;i++){if(await b.eval(`!!document.querySelector('#corporate-site')`))break;await new Promise(r=>setTimeout(r,100));}
  assert.ok(await b.eval(`!!document.querySelector('#corporate-site')`),'Corporate route is not wired');await b.eval('document.fonts.ready');await new Promise(r=>setTimeout(r,1000));
  for(const width of [320,375,390,430,768,1024,1280,1440,1920]){
   await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await b.eval('window.scrollTo(0,0)');await new Promise(r=>setTimeout(r,1250));
   const local=await b.eval(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,elements:[...document.querySelectorAll('header,nav,main,h1,h2,footer,button,.w-nav,.w-nav-menu,.policy-rich-text')].slice(0,50).map(e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {tag:e.tagName,class:e.className,text:e.innerText.slice(0,100),x:r.x,y:r.y,width:r.width,height:r.height,font:c.font,color:c.color,background:c.backgroundColor,display:c.display}})})`);
   const reference=original.find(m=>m.width===width),changes=[];
   local.elements.forEach((e,i)=>{const source=reference.elements[i];if(!source){changes.push({i,extra:e.tag});return;}for(const key of ['x','y','width','height'])if(Math.abs(e[key]-source[key])>.15)changes.push({i,tag:e.tag,text:e.text.slice(0,25),key,original:source[key],local:e[key]});for(const keyof of ['font','color','background','display'])if(e[keyof]!==source[keyof])changes.push({i,tag:e.tag,text:e.text.slice(0,25),key:keyof,original:source[keyof],local:e[keyof]});});
   results.push({slug,width,height:local.height,originalHeight:reference.height,overflow:local.scrollWidth>width,changes});
   const shot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,slug+'-local-'+width+'.png'),Buffer.from(shot.data,'base64'));
   await b.eval('window.scrollTo(0,document.documentElement.scrollHeight)');await new Promise(r=>setTimeout(r,1250));const footer=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,slug+'-local-footer-'+width+'.png'),Buffer.from(footer.data,'base64'));
  }
 }
 await writeFile(resolve(out,'comparison.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({slug,width,changes,height,originalHeight,overflow})=>({slug,width,changes,heightDelta:height-originalHeight,overflow})),null,2));
 console.log('Runtime exceptions',JSON.stringify(b.events.filter(e=>e.method==='Runtime.exceptionThrown')));
}finally{await b.send('Page.close');b.close();}
