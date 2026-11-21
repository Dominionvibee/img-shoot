import {connectBrowser} from './browser.mjs';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const b=await connectBrowser();const out=resolve(import.meta.dirname,'../reference/privacy');
try{
 await b.send('Network.enable');
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'http://localhost:4173/do-not-sell-my-personal-info'});
 for(let i=0;i<150;i++){if(await b.eval(`!!document.querySelector('[data-privacy-recaptcha] iframe')`))break;await new Promise(r=>setTimeout(r,100));}
 assert.ok(await b.eval(`document.querySelector('[data-privacy-recaptcha] iframe')?.src.includes('k=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI')`),'Only the public Google test widget may be clicked by this test');
 await b.eval(`(() => {
   for(const [id,value] of [['firstNameDSARElement','Preview'],['lastNameDSARElement','Example'],['emailDSARElement','preview@example.invalid']]){
    const input=document.getElementById(id);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));
   }
   const country=document.querySelector('#countryDSARElement');country.focus();country.value='United States';country.dispatchEvent(new Event('input',{bubbles:true}));
   [...document.querySelectorAll('[role="option"]')].find(e=>e.getAttribute('aria-label')==='United States').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
   window.scrollTo(0,document.querySelector('#google-captcha').getBoundingClientRect().top+scrollY-200);
 })()`);
 assert.equal(await b.eval(`document.querySelector('#dsar-webform-submit-button').disabled`),true,'Submit must remain disabled without test CAPTCHA token');
 await new Promise(r=>setTimeout(r,2000));
 const checkbox=await b.eval(`(() => {const r=document.querySelector('[data-privacy-recaptcha] iframe').getBoundingClientRect();return {x:r.x+27,y:r.y+39}})()`);
 await b.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...checkbox});
 await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...checkbox});
 for(let i=0;i<150;i++){if(await b.eval(`!document.querySelector('#dsar-webform-submit-button').disabled`))break;await new Promise(r=>setTimeout(r,100));}
 assert.equal(await b.eval(`document.querySelector('#dsar-webform-submit-button').disabled`),false,'Public test widget did not produce a token');
 await b.eval(`document.querySelector('#dsar-webform-submit-button').click()`);
 const message=await b.eval(`document.querySelector('.privacy-local-result').textContent`);
 assert.match(message,/Local preview only/);assert.match(message,/No privacy request has been submitted or stored/);
 const productionRequests=b.events.filter(e=>e.method==='Network.requestWillBeSent'&&/onetrust\.com/.test(e.params.request.url));
 assert.equal(productionRequests.length,0,'Local form sent a request to OneTrust');
 const exceptions=b.events.filter(e=>e.method==='Runtime.exceptionThrown');assert.equal(exceptions.length,0);
 const shot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(resolve(out,'local-preview-submit.png'),Buffer.from(shot.data,'base64'));
 const result={passed:true,publicTestWidget:true,productionRequests:0,exceptions:0,message};
 await writeFile(resolve(out,'submit-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await b.send('Page.close');b.close();}
