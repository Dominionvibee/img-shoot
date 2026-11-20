import{connectBrowser}from'./browser.mjs';import{writeFile}from'node:fs/promises';
const b=await connectBrowser({newTab:true});const results=[];
for(const width of[1440,390])for(const[label,origin]of[['reference','https://imgmodels.com'],['local','http://127.0.0.1:4173']]){
 await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await b.send('Page.navigate',{url:origin+'/'});await new Promise(r=>setTimeout(r,2000));
 const before=await b.eval(`({html:document.documentElement.getAttribute('style'),body:document.body.getAttribute('style'),htmlClass:document.documentElement.className,bodyClass:document.body.className,header:document.querySelector('.header').getBoundingClientRect().toJSON(),clientWidth:document.documentElement.clientWidth,bodyWidth:getComputedStyle(document.body).width})`);
 await b.eval(`document.querySelector('#onetrust-reject-all-handler')?.click();OneTrust.ToggleInfoDisplay()`);await new Promise(r=>setTimeout(r,500));
 const after=await b.eval(`({html:document.documentElement.getAttribute('style'),body:document.body.getAttribute('style'),htmlClass:document.documentElement.className,bodyClass:document.body.className,header:document.querySelector('.header').getBoundingClientRect().toJSON(),clientWidth:document.documentElement.clientWidth,bodyWidth:getComputedStyle(document.body).width,optout:document.querySelector('.ot-optout-signal').outerHTML,panel:document.querySelector('#onetrust-pc-sdk').getAttribute('style'),root:document.querySelector('#onetrust-consent-sdk').getAttribute('style')})`);
 results.push({label,width,before,after});console.log(JSON.stringify(results.at(-1)));
}
await writeFile('reference/qa/consent-layout/details.json',JSON.stringify(results,null,2));await b.send('Page.close');b.close();
