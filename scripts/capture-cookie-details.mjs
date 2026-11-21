import {connectBrowser} from './browser.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Read-only captures of public cookie metadata; no consent submission or live
// analytics integration is copied into the local application.
const b=await connectBrowser();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(expression){for(let i=0;i<240;i++){if(await b.eval(expression))return;await delay(80);}throw Error('Source consent interface unavailable');}
try {
  for(const [variant,url,file] of [
    ['wme','https://wmefashion.com/terms-of-use/','cookie-wme.json'],
    ['img','https://imgmodels.com/','cookie.json'],
  ]) {
    await b.send('Page.navigate',{url});
    await wait(`!!window.OneTrust?.ToggleInfoDisplay&&!!document.querySelector('#onetrust-pc-sdk')`);
    await b.eval('window.OneTrust.ToggleInfoDisplay()');
    await wait(`document.querySelector('#onetrust-pc-sdk').getBoundingClientRect().height>0`);
    const ids=await b.eval(`Array.from(document.querySelectorAll('.category-host-list-handler')).map(button=>button.dataset.parentId)`);
    const hostDetails={};
    for(const id of ids) {
      await b.eval(`(()=>{const button=document.querySelector('.ot-cat-item[data-optanongroupid="${id}"] button[ot-accordion="true"]');if(button.getAttribute('aria-expanded')!=='true')button.click();document.querySelector('.category-host-list-handler[data-parent-id="${id}"]').click()})()`);
      await delay(200);
      hostDetails[id]=await b.eval(`document.querySelector('#ot-host-lst').innerHTML`);
      await b.eval(`document.querySelector('.back-btn-handler').click()`);
    }
    const path=resolve(import.meta.dirname,'../shoot-frontend/data/pages',file);
    const page=JSON.parse(await readFile(path,'utf8'));
    page.hostDetails=hostDetails;
    await writeFile(path,JSON.stringify(page));
    console.log(JSON.stringify({variant,groups:ids,hostRows:Object.values(hostDetails).filter(Boolean).length}));
  }
} finally {await b.send('Page.close');b.close();}
