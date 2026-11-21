import {connectBrowser} from './browser.mjs';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve(import.meta.dirname,'../reference/privacy');const b=await connectBrowser();
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'https://privacyportal.onetrust.com/webform/889c435d-64b4-46d8-ad05-06332fe1d097/db459d3a-bffa-4cb2-a6fd-0daa31651507?website=imgmodels.com'});await new Promise(r=>setTimeout(r,6000));
 await b.eval(`document.querySelector('#firstNameDSARElement').focus();document.querySelector('#lastNameDSARElement').focus();document.querySelector('#emailDSARElement').focus();document.querySelector('#emailDSARElement').value='invalid';document.querySelector('#emailDSARElement').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#vt-input-5').focus()`);await new Promise(r=>setTimeout(r,600));
 const state=await b.eval(`({options:[...document.querySelectorAll('[role="option"]')].map(e=>e.textContent.trim()),errors:[...document.querySelectorAll('[id$="error"]')].map(e=>({id:e.id,html:e.outerHTML})),phone:document.querySelector('.cdk-overlay-container')?.outerHTML})`);
 await writeFile(resolve(out,'source-states.json'),JSON.stringify(state,null,2));
 const shot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(resolve(out,'source-validation-phone.png'),Buffer.from(shot.data,'base64'));
 console.log(JSON.stringify({phoneOptions:state.options.length,errors:state.errors},null,2));
}finally{await b.send('Page.close');b.close();}
