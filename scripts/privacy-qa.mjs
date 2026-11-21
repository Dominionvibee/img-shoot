import {connectBrowser} from './browser.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const out=resolve(import.meta.dirname,'../reference/privacy');
const original=JSON.parse(await readFile(resolve(out,'original-measurements.json'),'utf8'));
const b=await connectBrowser();const results=[];
const selectors=['#dsar-webform-header-logo','#DSARWebformLanguageDropdown','form','#firstNameDSARElement','#lastNameDSARElement','#emailDSARElement','#vt-input-5','#phoneNumberDSARElement','#countryDSARElement','#dsar-webform-submit-button'];
try{
 await b.send('Network.enable');
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'http://localhost:4173/do-not-sell-my-personal-info'});
 for(let i=0;i<100;i++) {if(await b.eval('!!document.querySelector("#firstNameDSARElement")'))break;await new Promise(r=>setTimeout(r,100));}
 assert.ok(await b.eval('!!document.querySelector("#firstNameDSARElement")'),'Privacy route did not load; check localhost:4173 is running');
 await b.eval('document.fonts.ready');await new Promise(r=>setTimeout(r,2500));
 for(const width of [320,375,390,430,768,1024,1280,1440,1920]){
  await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await b.eval('window.scrollTo(0,0)');await new Promise(r=>setTimeout(r,250));
  const local=await b.eval(`(() => {const metric=e=>{if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {tag:e.tagName,id:e.id,x:r.x,y:r.y+scrollY,width:r.width,height:r.height,font:c.font,color:c.color,background:c.backgroundColor,padding:c.padding,margin:c.margin,opacity:c.opacity}};return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,elements:${JSON.stringify(selectors)}.map(s=>metric(document.querySelector(s))),captcha:metric(document.querySelector('[data-privacy-recaptcha]')),footer:metric(document.querySelector('#webform-footer')),policyLinks:[...document.querySelectorAll('#dsar-webform-container a[href]')].map(a=>a.getAttribute('href')),inventedFooter:!!document.querySelector('.f01-local-footer'),homeLink:!!document.querySelector('a[href="/home"]')}})()`);
  const source=original.find(m=>m.width===width);
  const changes=[];
  for(const element of local.elements){const reference=source.elements.find(e=>element.id?e.id===element.id:e.tag===element.tag);for(const key of ['x','y','width','height'])if(Math.abs(element[key]-reference[key])>.1)changes.push({id:element.id||element.tag,key,original:reference[key],local:element[key],difference:element[key]-reference[key]});for(const key of ['font','color','background','padding','margin','opacity'])if(element[key]!==reference[key])changes.push({id:element.id||element.tag,key,original:reference[key],local:element[key]});}
  results.push({...local,changes,originalHeight:source.scrollHeight});
  assert.deepEqual(local.policyLinks,['/img-privacy-policy','/img-cookie-policy']);
  assert.equal(local.inventedFooter,false);assert.equal(local.homeLink,false);
  assert.equal(changes.length,0,`Privacy geometry or style changed at ${width}px`);
  assert.equal(local.scrollHeight,source.scrollHeight);
  const shot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(resolve(out,`local-${width}.png`),Buffer.from(shot.data,'base64'));
 }
 await writeFile(resolve(out,'local-comparison.json'),JSON.stringify(results,null,2));
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 // Required validation, exact captured options, selection, clear, and keyboard.
 await b.eval(`document.querySelector('#firstNameDSARElement').focus();document.querySelector('#lastNameDSARElement').focus();document.querySelector('#countryDSARElement').focus();`);
 assert.equal(await b.eval(`document.querySelector('#firstNameerror').textContent.trim()`),'This field is required');
 assert.equal(await b.eval(`document.querySelector('#dsar-webform-submit-button').disabled`),true);
 assert.equal(await b.eval(`document.querySelectorAll('.cdk-overlay-container [role="option"]').length`),250);
 await b.eval(`document.querySelector('#countryDSARElement').value='Nig';document.querySelector('#countryDSARElement').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#countryDSARElement').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));document.querySelector('#countryDSARElement').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));`);
 assert.equal(await b.eval(`document.querySelector('#countryDSARElement').value`),'Niger');
 await b.eval(`document.querySelector('[title="Clear the Country field"]').click()`);
 assert.equal(await b.eval(`document.querySelector('#countryDSARElement').value`),'');
 await b.eval(`document.querySelector('#vt-input-5').focus()`);
 assert.equal(await b.eval(`document.querySelectorAll('.cdk-overlay-container [role="option"]').length`),249);
 const requests=b.events.filter(e=>e.method==='Network.requestWillBeSent').map(e=>({url:e.params.request.url,method:e.params.request.method}));
 const exceptions=b.events.filter(e=>e.method==='Runtime.exceptionThrown');
 const frame=await b.eval(`document.querySelector('[data-privacy-recaptcha] iframe')?.src || null`);
 assert.ok(frame?.startsWith('https://www.google.com/recaptcha/api2/anchor?'),'Actual Google widget did not render');
 assert.equal(exceptions.length,0);
 assert.equal(requests.some(r=>r.method==='POST'&&/onetrust/.test(r.url)),false);
 console.log(JSON.stringify({widths:results.length,changes:results.map(({width,changes,scrollHeight,originalHeight})=>({width,changes,heightDelta:scrollHeight-originalHeight})),realCaptchaFrame:frame,exceptions:exceptions.length,localOnly:true},null,2));
}finally{await b.send('Page.close');b.close();}
