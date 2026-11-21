import {connectBrowser} from './browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve(import.meta.dirname,'../reference/privacy');await mkdir(out,{recursive:true});
const b=await connectBrowser();const measurements=[];
const measure=`(() => {
 const metric=e=>{if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {tag:e.tagName,id:e.id,class:e.className,x:r.x,y:r.y+scrollY,width:r.width,height:r.height,font:c.font,color:c.color,background:c.backgroundColor,padding:c.padding,margin:c.margin,display:c.display,opacity:c.opacity,text:e.innerText?.slice(0,100)}};
 return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,body:metric(document.body),elements:[...document.querySelectorAll('img,input,button,re-captcha,iframe,form,.dsar-webform__description,.dsar-webform__footer,.dsar-webform__header')].map(metric),tree:[...document.querySelectorAll('body *')].filter(e=>e.children.length>0&&!['SCRIPT','STYLE','SVG','PATH'].includes(e.tagName)).slice(0,45).map(metric)};
})()`;
try{
 await b.send('Network.enable');await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'https://privacyportal.onetrust.com/webform/889c435d-64b4-46d8-ad05-06332fe1d097/db459d3a-bffa-4cb2-a6fd-0daa31651507?website=imgmodels.com'});
 await new Promise(r=>setTimeout(r,12000));
 const content=await b.eval(`({html:document.querySelector('app-root')?.outerHTML || document.body.innerHTML,styles:[...document.querySelectorAll('style')].map(e=>e.textContent),title:document.title,bodyClass:document.body.className,htmlClass:document.documentElement.className})`);
 await writeFile(resolve(out,'rendered-content.json'),JSON.stringify(content));
 const resources=[];
 for(const event of b.events.filter(e=>e.method==='Network.responseReceived')){
  const {requestId,response,type}=event.params;
  if(!['Stylesheet','Font'].includes(type))continue;
  try{const body=await b.send('Network.getResponseBody',{requestId});const ext=type==='Stylesheet'?'css':new URL(response.url).pathname.split('.').at(-1);const name=`original-resource-${resources.length}.${ext}`;await writeFile(resolve(out,name),body.base64Encoded?Buffer.from(body.body,'base64'):body.body);resources.push({url:response.url,name,type});}catch{}
 }
 await writeFile(resolve(out,'resources.json'),JSON.stringify(resources,null,2));
 for(const width of [320,375,390,430,768,1024,1280,1440,1920]){
  await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await new Promise(r=>setTimeout(r,250));
  measurements.push(await b.eval(measure));
  const shot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(resolve(out,`original-${width}.png`),Buffer.from(shot.data,'base64'));
 }
 await writeFile(resolve(out,'original-measurements.json'),JSON.stringify(measurements,null,2));
 // Inspect validation and country autocomplete without submitting information.
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await b.eval(`document.querySelector('#firstNameDSARElement').focus();document.querySelector('#lastNameDSARElement').focus();document.querySelector('#countryDSARElement').focus();document.querySelector('#countryDSARElement').value='Nig';document.querySelector('#countryDSARElement').dispatchEvent(new Event('input',{bubbles:true}));`);
 await new Promise(r=>setTimeout(r,300));
 await writeFile(resolve(out,'country-state.html'),await b.eval('document.documentElement.outerHTML'));
 await writeFile(resolve(out,'country-state.json'),JSON.stringify(await b.eval(`({text:document.body.innerText,overlays:[...document.querySelectorAll('[role="listbox"],.cdk-overlay-container')].map(e=>e.outerHTML),first:document.querySelector('#firstNameDSARElement').closest('vt-form-field')?.outerHTML})`),null,2));
 const shot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(resolve(out,'country-state.png'),Buffer.from(shot.data,'base64'));
 console.log(JSON.stringify({captured:measurements.length,resources,desktop:measurements.find(m=>m.width===1440)},null,2));
}finally{await b.send('Page.close');b.close();}
