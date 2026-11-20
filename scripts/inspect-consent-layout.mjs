import {connectBrowser} from './browser.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await connectBrowser({newTab:true});
const results=[];await mkdir('reference/qa/consent-layout',{recursive:true});
for(const width of[1440,390])for(const[label,origin]of[['reference','https://imgmodels.com'],['local','http://127.0.0.1:4173']]){
 await browser.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
 await browser.send('Page.navigate',{url:origin+'/'});await new Promise(r=>setTimeout(r,2500));await browser.eval('document.fonts.ready');
 await browser.eval('OneTrust.ToggleInfoDisplay()');await new Promise(r=>setTimeout(r,800));
 const metrics=await browser.eval(`({width:innerWidth,clientWidth:document.documentElement.clientWidth,bodyOverflow:document.body.style.overflow,focused:document.activeElement.outerHTML.slice(0,300),elements:[...document.querySelectorAll('#onetrust-pc-sdk,#onetrust-pc-sdk>div,.ot-pc-header,#ot-pc-content,#ot-pc-lst,.ot-pc-footer,.ot-btn-container,.ot-pc-footer-logo,.ot-pc-logo,#ot-pc-title')].map(e=>({id:e.id,c:e.className,inline:e.getAttribute('style'),rect:e.getBoundingClientRect().toJSON(),style:Object.fromEntries(['height','width','minHeight','maxHeight','position','padding','display','overflow','boxSizing','margin','top','bottom'].map(k=>[k,getComputedStyle(e)[k]]))}))})`);
 results.push({label,width,...metrics});
 await writeFile(`reference/qa/consent-layout/${label}-${width}.png`,Buffer.from((await browser.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 console.log(label,width,metrics.elements.map(e=>({id:e.id,c:e.c,inline:e.inline,r:e.rect})));
}
await writeFile('reference/qa/consent-layout/metrics.json',JSON.stringify(results,null,2));
await browser.send('Page.close');browser.close();
