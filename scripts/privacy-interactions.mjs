import {connectBrowser} from './browser.mjs';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const out=resolve(import.meta.dirname,'../reference/privacy');const results=[];const b=await connectBrowser();
try{
 await b.send('Network.enable');
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 for(const [name,url] of [['original','https://privacyportal.onetrust.com/webform/889c435d-64b4-46d8-ad05-06332fe1d097/db459d3a-bffa-4cb2-a6fd-0daa31651507?website=imgmodels.com'],['local','http://localhost:4173/do-not-sell-my-personal-info']]){
  await b.send('Page.navigate',{url});await new Promise(r=>setTimeout(r,7000));
  await b.eval('window.scrollTo(0,700)');await new Promise(r=>setTimeout(r,2000));
  const shot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(resolve(out,`${name}-captcha-scrolled.png`),Buffer.from(shot.data,'base64'));
  for(const [id,text] of [['emailDSARElement','invalid'],['countryDSARElement','invalid'],['phoneNumberDSARElement','letters']]){
   await b.eval(`document.querySelector('#${id}').focus()`);await b.send('Input.insertText',{text});await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await new Promise(r=>setTimeout(r,600));
  }
  await b.eval(`document.activeElement.blur()`);await new Promise(r=>setTimeout(r,1500));
  const result=await b.eval(`({errors:[...document.querySelectorAll('[id$="error"]')].map(e=>({id:e.id,text:e.textContent,html:e.outerHTML,height:e.getBoundingClientRect().height})),fields:[...document.querySelectorAll('input')].map(e=>({id:e.id,value:e.value,ariaInvalid:e.getAttribute('aria-invalid'),border:getComputedStyle(e).border,outline:getComputedStyle(e).outlineStyle==='none'?'none':getComputedStyle(e).outline})),captcha:document.querySelector('iframe[title="reCAPTCHA"]')?.getBoundingClientRect().toJSON()})`);
  results.push({name,...result});
  const stateShot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(resolve(out,`${name}-invalid-state.png`),Buffer.from(stateShot.data,'base64'));
 }
 await writeFile(resolve(out,'interaction-comparison.json'),JSON.stringify(results,null,2));
 assert.deepEqual(results[1].errors.map(({id,text,height})=>({id,text:text.trim(),height})),results[0].errors.map(({id,text,height})=>({id,text:text.trim(),height})));
 assert.deepEqual(results[1].fields,results[0].fields);
 console.log(JSON.stringify({passed:true,compared:'required/invalid email, country, and phone states',fields:results[1].fields.length,errors:results[1].errors.length}));
}finally{await b.send('Page.close');b.close();}
