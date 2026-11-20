import {connectBrowser} from './browser.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser=await connectBrowser();
const {send,eval:evaluate}=browser;
await send('Network.enable');
await send('Network.setBlockedURLs',{urls:['*://imgmodels.com/*','*://www.imgmodels.com/*','*://getscouted.imgmodels.com/*','*://wmefashion.com/*','*://privacyportal.onetrust.com/*']});
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'http://localhost:4173/#'});
await new Promise(resolve=>setTimeout(resolve,1500));
await evaluate(`window.__footerReactDocument='persistent'`);
const targets=[
  ['About Us','/about-us'],['Contact','/contact'],['Recruitment Warning','/recruitment-warning'],
  ['Terms of use','/term-of-use'],['Privacy Policy','/privacy-policy'],['Cookie Policy','/cookie-policy'],
  ['Under 18 FAQs','/under-18-faq'],['New York State Fashion Workers Act','/new-york-state-fashion-workers-act'],
  ['Do not sell my personal info','/do-not-sell-my-personal-info'],['We Love Your Genes','/get-scouted'],
];
const results=[];
try{
  for(const [label,path] of targets){
    await evaluate(`(()=>{const footer=document.querySelector('.f01-local-footer')||document.querySelector('footer.footer');const link=[...footer.querySelectorAll('a')].find(a=>a.textContent.trim().toLowerCase()===${JSON.stringify(label.toLowerCase())});if(!link)throw Error('Missing footer link');link.click()})()`);
    await new Promise(resolve=>setTimeout(resolve,750));
    const result=await evaluate(`({path:location.pathname,origin:location.origin,document:window.__footerReactDocument,frames:document.querySelectorAll('iframe').length,content:document.querySelector('.reference-page')?.innerHTML.length,body:document.body.className,externalFooter:[...(document.querySelector('.f01-local-footer')||document.querySelector('footer.footer')).querySelectorAll('a')].filter(a=>a.origin!==location.origin).map(a=>a.textContent.trim().toLowerCase())})`);
    assert.equal(result.path,path);assert.equal(result.origin,'http://localhost:4173');assert.equal(result.document,'persistent');assert.equal(result.frames,0);assert.ok(result.content>1000);
    if(['/term-of-use','/privacy-policy','/cookie-policy'].includes(path))assert.equal(await evaluate(`getComputedStyle(document.querySelector('.siteWrap')).opacity`),'1');
    assert.deepEqual(result.externalFooter.sort(),['instagram','site credits','tiktok']);
    results.push({label,...result});
    // Scouting blocks scrolling until acknowledged, just like the reference.
    // Navigation remains available through React after leaving its age gate.
    if(path==='/get-scouted'){
      await evaluate(`document.querySelector('[data-scout-ack]').click();document.querySelector('[data-scout-age-toggle]').click();document.querySelector('[data-age-value="18"]').click()`);
      assert.equal(await evaluate(`document.querySelector('[data-scout-adult]').hidden`),false);
    }
  }
  await evaluate(`window.F01Navigate('/#')`);await new Promise(resolve=>setTimeout(resolve,600));
  const menuGetScouted=await evaluate(`[...document.querySelectorAll('.header a')].find(a=>a.textContent.trim()==='Get Scouted')?.getAttribute('href')`);
  assert.equal(menuGetScouted,'/get-scouted');
  const exceptions=browser.events.filter(event=>event.method==='Runtime.exceptionThrown');
  assert.equal(exceptions.length,0);
  await writeFile('shoot-frontend/docs/milestones/F01/qa/footer-routing-check.json',JSON.stringify({blockedReferenceHosts:true,iframes:0,exceptions,results},null,2));
  console.log(JSON.stringify({passed:results.length,exceptions:exceptions.length,allLocal:true,iframes:0}));
}finally{await send('Page.close');browser.close();}
