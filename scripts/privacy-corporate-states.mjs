import {connectBrowser} from './browser.mjs';import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
const b=await connectBrowser(),out=resolve(import.meta.dirname,'../reference/corporate');const states=[];
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await b.send('Page.navigate',{url:'https://www.img.com/privacy-policy'});await new Promise(r=>setTimeout(r,7000));
 for(const [name,action] of [['menu',`document.querySelector('.navbar-toggler').click()`],['mailing',`document.querySelector('#mailingToggleDesktop').click()`],['cookies',`document.querySelector('.navbar-toggler').click();document.querySelector('#onetrust-pc-btn-handler').click()`]]){
  await b.eval(action);await b.eval('document.fonts.ready');await new Promise(r=>setTimeout(r,1500));
  const state=await b.eval(`({body:document.body.className,attrs:[...document.querySelectorAll('.header,#navbar,#menuContent,#toggleSectionContent,.header__mailing-toggle .btn,#onetrust-pc-sdk,.onetrust-pc-dark-filter,#onetrust-banner-sdk')].map(e=>({selector:e.id?'#'+e.id:e.className,html:e.outerHTML.slice(0,e.outerHTML.indexOf('>')+1),class:e.className,style:e.getAttribute('style'),aria:e.getAttribute('aria-hidden')})),text:document.body.innerText.slice(0,2000)})`);states.push({name,...state});
  const shot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,`privacy-original-state-${name}.png`),Buffer.from(shot.data,'base64'));
 }
 await writeFile(resolve(out,'source-states.json'),JSON.stringify(states,null,2));console.log(JSON.stringify(states.map(({name,attrs,body})=>({name,attrs,body})),null,2));
}finally{await b.send('Page.close');b.close();}
