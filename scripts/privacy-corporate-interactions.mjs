import {connectBrowser} from './browser.mjs';import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import assert from 'node:assert/strict';
const b=await connectBrowser(),out=resolve(import.meta.dirname,'../reference/corporate');
try{
 await b.send('Network.enable');await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`try{localStorage.removeItem('img-corporate-cookie-preview')}catch{}`});
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await b.send('Page.navigate',{url:'http://localhost:4173/img-privacy-policy'});
 for(let i=0;i<100;i++){if(await b.eval(`!!document.querySelector('#corporate-site')`))break;await new Promise(r=>setTimeout(r,100));}await b.eval('document.fonts.ready');
 const states=[];
 for(const [name,action]of [['menu',`document.querySelector('.navbar-toggler').click()`],['mailing',`document.querySelector('#mailingToggleDesktop').click()`],['cookies',`document.querySelector('.navbar-toggler').click();document.querySelector('#onetrust-pc-btn-handler').click()`]]){
  await b.eval(action);await new Promise(r=>setTimeout(r,1500));
  const shot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,`privacy-local-state-${name}.png`),Buffer.from(shot.data,'base64'));
  states.push({name,...await b.eval(`({menu:document.querySelector('#navbar').classList.contains('show'),mailing:getComputedStyle(document.querySelector('#toggleSectionContent')).display,cookies:getComputedStyle(document.querySelector('#onetrust-pc-sdk')).display})`)});
 }
 assert.equal(states[0].menu,true);assert.notEqual(states[1].mailing,'none');assert.equal(states[2].menu,false);assert.notEqual(states[2].cookies,'none');
 await b.eval(`document.querySelector('.category-host-list-handler[data-parent-id="2"]').click()`);await new Promise(r=>setTimeout(r,250));
 assert.match(await b.eval(`document.querySelector('#ot-pc-lst').innerText`),/www\.clarity\.ms/);
 await b.eval(`document.querySelector('#ot-pc-lst .ot-host-box').click()`);
 assert.equal(await b.eval(`document.querySelector('#ot-pc-lst .ot-host-box').getAttribute('aria-expanded')`),'true');
 await b.eval(`document.querySelector('#vendor-search-handler').value='www.clarity.ms';document.querySelector('#vendor-search-handler').dispatchEvent(new Event('input',{bubbles:true}))`);
 assert.ok(await b.eval(`[...document.querySelectorAll('#ot-host-lst .ot-host-item')].some(e=>e.style.display==='none')`));
 await b.eval(`document.querySelector('.back-btn-handler').click();document.querySelector('.save-preference-btn-handler').click()`);
 assert.equal(await b.eval(`getComputedStyle(document.querySelector('#onetrust-banner-sdk')).display`),'none');
 assert.ok(await b.eval(`!!localStorage.getItem('img-corporate-cookie-preview')`));
 await b.eval(`document.querySelector('#mailingToggleFooter').click()`);
 const preview=await b.eval(`(() => {
  const form=document.querySelector('#toggleSectionContent form');for(const input of form.querySelectorAll('input:not([type="hidden"]):not([type="submit"])')){
   if(input.type==='checkbox')input.checked=true;else input.value=input.type==='email'?'preview@example.invalid':'Local preview';
  }
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return form.querySelector('.corporate-preview-result').textContent;
 })()`);
 assert.match(preview,/Local preview only/);
 const sourceRequests=b.events.filter(e=>e.method==='Network.requestWillBeSent'&&/hsforms|clarity\.ms|googletagmanager|cdn\.cookielaw|www\.img\.com/.test(e.params.request.url));
 assert.equal(sourceRequests.length,0,'Corporate preview made a production request: '+JSON.stringify(sourceRequests.map(e=>({url:e.params.request.url,method:e.params.request.method}))));
 const exceptions=b.events.filter(e=>e.method==='Runtime.exceptionThrown');assert.equal(exceptions.length,0);
 await writeFile(resolve(out,'interaction-check.json'),JSON.stringify({states,preview,productionRequests:0,exceptions:0},null,2));console.log(JSON.stringify({passed:true,states,preview,productionRequests:0,exceptions:0},null,2));
}finally{await b.send('Page.close');b.close();}
