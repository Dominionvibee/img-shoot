import {connectBrowser} from './browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve(import.meta.dirname,'../reference/privacy');await mkdir(out,{recursive:true});
const browser=await connectBrowser();
try{
 await browser.send('Network.enable');
 await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await browser.send('Page.navigate',{url:'https://privacyportal.onetrust.com/webform/889c435d-64b4-46d8-ad05-06332fe1d097/db459d3a-bffa-4cb2-a6fd-0daa31651507?website=imgmodels.com'});
 await new Promise(r=>setTimeout(r,8000));
 await writeFile(resolve(out,'original.html'),await browser.eval('document.documentElement.outerHTML'));
 const info=await browser.eval(`({url:location.href,title:document.title,text:document.body.innerText,links:[...document.querySelectorAll('link')].map(e=>({rel:e.rel,href:e.href})),images:[...document.images].map(e=>({src:e.src,alt:e.alt})),inputs:[...document.querySelectorAll('input,select,textarea,button')].map(e=>({tag:e.tagName,id:e.id,type:e.type,name:e.name,value:e.value,placeholder:e.placeholder,required:e.required,html:e.outerHTML.slice(0,1200)})),frames:[...document.querySelectorAll('iframe')].map(e=>e.outerHTML),styles:[...document.querySelectorAll('style')].map(e=>e.textContent)})`);
 await writeFile(resolve(out,'inspection.json'),JSON.stringify(info,null,2));
 const shot=await browser.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(resolve(out,'original-1440.png'),Buffer.from(shot.data,'base64'));
 console.log(JSON.stringify({...info,styles:info.styles.map(s=>s.length)},null,2));
}finally{await browser.send('Page.close');browser.close();}
