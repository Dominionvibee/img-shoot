import {connectBrowser} from './browser.mjs';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const b=await connectBrowser();
const app=resolve(import.meta.dirname,'../shoot-frontend');
try {
  await b.send('Network.enable');
  const {cookies}=await b.send('Network.getCookies',{urls:['https://wmefashion.com/terms-of-use/']});
  for(const cookie of cookies.filter(cookie=>cookie.name.startsWith('Optanon'))) {
    await b.send('Network.deleteCookies',{name:cookie.name,domain:cookie.domain,path:cookie.path});
  }
  await b.send('Page.navigate',{url:'https://wmefashion.com/terms-of-use/'});
  let ready=false;
  for(let i=0;i<180;i++) {
    ready=await b.eval(`!!document.querySelector('#onetrust-banner-sdk')&&!!document.querySelector('#onetrust-pc-sdk')&&document.querySelector('#onetrust-style')?.textContent.length>1000`);
    if(ready)break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!ready)throw Error('The reference initial consent banner did not load');
  await b.eval('document.fonts.ready');
  // The SDK clears its entry animation after one second. Capturing its temporary
  // negative bottom offset would freeze that one viewport's animation locally.
  await new Promise(resolve=>setTimeout(resolve,1600));
  let {html,style}=await b.eval(`({html:document.querySelector('#onetrust-consent-sdk').outerHTML,style:document.querySelector('#onetrust-style').textContent})`);
  const urls=new Set([...(html+' '+style).matchAll(/https:\/\/cdn\.cookielaw\.org\/logos\/[^\s"'<>()&]+/g)].map(match=>match[0]));
  for(const url of urls) {
    const base='consent-'+new URL(url).pathname.split('/').at(-1);
    const bytes=await b.eval(`fetch(${JSON.stringify(url)}).then(async response=>{
      if(!response.ok)throw Error('Consent asset HTTP '+response.status);
      const bytes=new Uint8Array(await response.arrayBuffer());
      let raw='';for(let offset=0;offset<bytes.length;offset+=8192)raw+=String.fromCharCode(...bytes.subarray(offset,offset+8192));return btoa(raw);
    })`);
    await writeFile(resolve(app,'assets/legal',base),Buffer.from(bytes,'base64'));
    html=html.replaceAll(url,'/assets/legal/'+base);
    style=style.replaceAll(url,'/assets/legal/'+base);
  }
  const hostDetails={};
  await b.eval('window.OneTrust.ToggleInfoDisplay()');
  await new Promise(resolve=>setTimeout(resolve,400));
  const groupIds=await b.eval(`Array.from(document.querySelectorAll('.category-host-list-handler')).map(button=>button.dataset.parentId)`);
  for(const id of groupIds) {
    await b.eval(`document.querySelector('.ot-cat-item[data-optanongroupid="${id}"] button[ot-accordion="true"]').click()`);
    await b.eval(`document.querySelector('.category-host-list-handler[data-parent-id="${id}"]').click()`);
    await new Promise(resolve=>setTimeout(resolve,200));
    hostDetails[id]=await b.eval(`document.querySelector('#ot-host-lst').innerHTML`);
    await b.eval(`document.querySelector('.back-btn-handler').click()`);
  }
  await writeFile(resolve(app,'data/pages/cookie-wme.json'),JSON.stringify({source:'https://wmefashion.com/terms-of-use/',kind:'consent',html,hostDetails}));
  await writeFile(resolve(app,'assets/legal/consent.css'),style);
  console.log(JSON.stringify({initialBanner:html.includes('onetrust-banner-sdk'),preferences:html.includes('onetrust-pc-sdk'),htmlLength:html.length,cssLength:style.length,assets:urls.size}));
} finally {
  await b.send('Page.close');b.close();
}
