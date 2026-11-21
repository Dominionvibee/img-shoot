import {connectBrowser} from './browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve(import.meta.dirname,'../reference/corporate');await mkdir(out,{recursive:true});
const b=await connectBrowser();
try{
 await b.send('Network.enable');await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 for(const [slug,path] of [['privacy','privacy-policy'],['cookies','cookies']]){
  const start=b.events.length;await b.send('Page.navigate',{url:'https://www.img.com/'+path});await new Promise(r=>setTimeout(r,7000));
  const source=await b.eval(`({url:location.href,title:document.title,html:document.documentElement.outerHTML,body:document.body.outerHTML,bodyClass:document.body.className,htmlAttributes:[...document.documentElement.attributes].map(a=>[a.name,a.value]),text:document.body.innerText,styles:[...document.querySelectorAll('style')].map(e=>e.textContent),links:[...document.querySelectorAll('link')].map(e=>({rel:e.rel,href:e.href})),scripts:[...document.scripts].map(e=>({src:e.src,text:e.textContent.slice(0,500)})),anchors:[...document.querySelectorAll('a[href]')].map(a=>({text:a.textContent.trim(),href:a.href})),images:[...document.images].map(e=>({src:e.src,srcset:e.srcset,alt:e.alt})),forms:[...document.querySelectorAll('form')].map(e=>e.outerHTML)})`);
  await writeFile(resolve(out,slug+'-source.json'),JSON.stringify(source,null,2));
  const requests=[];
  for(const event of b.events.slice(start).filter(e=>e.method==='Network.responseReceived')){
   const {requestId,response,type}=event.params;if(!['Stylesheet','Font','Image','Script'].includes(type))continue;
   try{const body=await b.send('Network.getResponseBody',{requestId});let ext=new URL(response.url).pathname.split('.').at(-1);if(type==='Stylesheet')ext='css';if(type==='Script')ext='js';if(ext.length>5)ext=type.toLowerCase();const name=slug+'-resource-'+requests.length+'.'+ext;await writeFile(resolve(out,name),body.base64Encoded?Buffer.from(body.body,'base64'):body.body);requests.push({url:response.url,type,name,mime:response.mimeType});}catch{}
  }
  await writeFile(resolve(out,slug+'-resources.json'),JSON.stringify(requests,null,2));
  const metrics=[];
  for(const width of [320,375,390,430,768,1024,1280,1440,1920]){
   await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await b.eval('window.scrollTo(0,0)');await new Promise(r=>setTimeout(r,1250));
   metrics.push(await b.eval(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,elements:[...document.querySelectorAll('header,nav,main,h1,h2,footer,button,.w-nav,.w-nav-menu,.policy-rich-text')].slice(0,50).map(e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {tag:e.tagName,class:e.className,text:e.innerText.slice(0,100),x:r.x,y:r.y,width:r.width,height:r.height,font:c.font,color:c.color,background:c.backgroundColor,display:c.display}})})`));
   const shot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,slug+'-original-'+width+'.png'),Buffer.from(shot.data,'base64'));
   await b.eval('window.scrollTo(0,document.documentElement.scrollHeight)');await new Promise(r=>setTimeout(r,1250));
   const footer=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,slug+'-original-footer-'+width+'.png'),Buffer.from(footer.data,'base64'));
  }
  await writeFile(resolve(out,slug+'-metrics.json'),JSON.stringify(metrics,null,2));
  console.log(JSON.stringify({slug,title:source.title,text:source.text.slice(0,1000),styles:source.links.filter(x=>x.rel==='stylesheet'),resources:requests.length,forms:source.forms.length,anchors:source.anchors.slice(0,12)},null,2));
 }
}finally{await b.send('Page.close');b.close();}
