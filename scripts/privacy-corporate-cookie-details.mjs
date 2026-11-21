import {connectBrowser} from './browser.mjs';import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
const b=await connectBrowser(),out=resolve(import.meta.dirname,'../reference/corporate');
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await b.send('Page.navigate',{url:'https://www.img.com/privacy-policy'});await new Promise(r=>setTimeout(r,7000));
 await b.eval(`document.querySelector('#onetrust-pc-btn-handler').click()`);await new Promise(r=>setTimeout(r,500));
 const groups=await b.eval(`[...document.querySelectorAll('.category-host-list-handler')].map(e=>({id:e.getAttribute('data-parent-id'),text:e.getAttribute('aria-label')}))`);
 const states=[];
 for(const group of groups){
  await b.eval(`document.querySelector('.category-host-list-handler[data-parent-id="${group.id}"]').click()`);await new Promise(r=>setTimeout(r,400));
  states.push({group,...await b.eval(`({html:document.querySelector('#ot-pc-lst').innerHTML,text:document.querySelector('#ot-pc-lst').innerText,attrs:[...document.querySelectorAll('#ot-pc-content,#ot-pc-lst,#ot-pc-title')].map(e=>({id:e.id,class:e.className,style:e.getAttribute('style')}))})`)});
  await b.eval(`document.querySelector('#ot-back-arw').closest('button').click()`);await new Promise(r=>setTimeout(r,100));
 }
 await writeFile(resolve(out,'cookie-details.json'),JSON.stringify(states,null,2));await writeFile(resolve(import.meta.dirname,'../shoot-frontend/assets/corporate/cookie-details.json'),JSON.stringify(states));
 console.log(JSON.stringify(states.map(({group,text,attrs})=>({group,text:text.slice(0,250),attrs})),null,2));
}finally{await b.send('Page.close');b.close();}
