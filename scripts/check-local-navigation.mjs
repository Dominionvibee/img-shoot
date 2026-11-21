import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {connectBrowser} from './browser.mjs';

const browser=await connectBrowser();
const results=[];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const origin='http://localhost:4173';
async function wait(expression){
  for(let n=0;n<250;n++){
    if(await browser.eval(expression))return;
    await delay(80);
  }
  throw Error('Navigation check timed out: '+expression);
}
async function ready(path){
  await wait(`location.pathname.replace(/\\/+$/,'')===${JSON.stringify(path.replace(/\/+$/,''))}&&!!document.querySelector('.reference-page')?.innerHTML&&typeof F01Navigate==='function'`);
  await delay(150);
  const value=await browser.eval(`({url:location.href,marker:window.__localNavigationDocument,text:document.body.innerText.slice(0,80)})`);
  assert.equal(new URL(value.url).origin,origin);
  assert.equal(value.marker,'persistent');
  assert.ok(!value.text.includes('Page capture unavailable'),value.text);
  return value;
}
async function go(path){await browser.eval(`window.F01Navigate(${JSON.stringify(path)})`);return ready(new URL(path,origin).pathname);}

try{
  await browser.send('Network.enable');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await browser.send('Page.navigate',{url:origin});
  await wait(`typeof F01Navigate==='function'&&!!document.querySelector('.JS--header')`);
  await browser.eval(`window.__localNavigationDocument='persistent';localStorage.setItem('f01-cookie-consent',JSON.stringify({value:'essential'}));localStorage.setItem('f01-cookie-consent-wme',JSON.stringify({value:'essential'}));document.querySelector('#onetrust-reject-all-handler')?.click()`);
  for(const [label,path,kind]of[
    ['About Us','/about-us','img'],['Contact','/contact','img'],['Recruitment Warning','/recruitment-warning','img'],
    ['Terms of use','/term-of-use','legal'],['Privacy Policy','/privacy-policy','legal'],['Cookie Policy','/cookie-policy','legal'],
    ['Under 18 FAQs','/under-18-faq','img'],['New York State Fashion Workers Act','/new-york-state-fashion-workers-act','img'],
    ['Do not sell my personal info','/do-not-sell-my-personal-info','privacy'],['We Love Your Genes','/get-scouted','scouting'],
  ]){
    await go('/');
    await browser.eval(`(()=>{const link=[...document.querySelector('footer.footer').querySelectorAll('a')].find(a=>a.textContent.trim().toLowerCase()===${JSON.stringify(label.toLowerCase())});if(!link)throw Error('Missing source footer link');link.click()})()`);
    const state=await ready(path);
    const footer=await browser.eval(`({site:!!document.querySelector('.reference-page footer.footer'),text:[...document.querySelectorAll('.reference-page footer')].map(f=>f.innerText).join(' ')})`);
    if(kind==='privacy')assert.equal(footer.site,false,'OneTrust must not inherit an IMG site footer');
    if(kind==='legal')assert.ok(!footer.text.toLowerCase().includes('we love your genes'),'WME must retain its own footer');
    results.push({test:'source footer navigation',label,kind,...state});
    await browser.eval('history.back()');await ready('/');
  }
  await go('/term-of-use');
  await browser.eval(`[...document.querySelectorAll('footer a')].find(a=>a.getAttribute('href')==='/the-incubator-terms').click()`);
  results.push({test:'WME fourth policy',...await ready('/the-incubator-terms')});

  await go('/do-not-sell-my-personal-info');
  for(const path of ['/img-privacy-policy','/img-cookie-policy']){
    await browser.eval(`document.querySelector('a[href="${path}"]').click()`);
    results.push({test:'OneTrust original policy destination',...await ready(path)});
    await browser.eval('history.back()');await ready('/do-not-sell-my-personal-info');
  }

  await go('/from-the-archive');
  await browser.eval(`document.querySelector('.workGrid__gridItem[data-featured-work="30601"]').click()`);
  await wait(`document.body.classList.contains('workModalActive')&&document.querySelector('.workModal img')?.naturalWidth>0`);
  results.push({test:'archive photograph gallery',...await browser.eval(`({url:location.href,images:document.querySelectorAll('.workModal img').length})`)});
  assert.equal(new URL(results.at(-1).url).origin,origin);
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await wait(`!document.body.classList.contains('workModalActive')`);
  await go('/?featured-work-id=30601');
  await wait(`document.querySelector('.workModal')?.innerText.includes('CHANEL RESORT')`);
  await go('/?featured-work-id=28553');
  await wait(`!!document.querySelector('.workModal .mejs-container')`);
  results.push({test:'same-page gallery URL and original video controls',...await browser.eval(`({url:location.href,title:document.querySelector('.workModal').innerText.slice(0,100),players:document.querySelectorAll('.workModal .mejs-container').length})`)});
  await go('/from-the-archive');
  await browser.eval(`document.querySelector('a[href="/from-the-archive/page/2/"]').click()`);
  results.push({test:'archive pagination',...await ready('/from-the-archive/page/2/')});

  await go('/');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await browser.eval(`document.querySelector('.JS--burgerToggle').click()`);
  await wait(`document.querySelector('.burgerMenu')?.getBoundingClientRect().width>0`);
  await browser.eval(`[...document.querySelectorAll('.burgerMenu a')].find(a=>a.textContent.trim().toLowerCase()==='contact').click()`);
  results.push({test:'mobile menu route click',...await ready('/contact')});
  const exceptions=browser.events.filter(e=>e.method==='Runtime.exceptionThrown');
  assert.equal(exceptions.length,0,JSON.stringify(exceptions));
  await writeFile(resolve(import.meta.dirname,'../shoot-frontend/docs/milestones/F01/qa/local-navigation.json'),JSON.stringify({checks:results.length,exceptions,results},null,2));
  console.log(JSON.stringify({checks:results.length,exceptions:exceptions.length,allRoutesLocal:true}));
}catch(error){
  console.log(JSON.stringify(await browser.eval(`({url:location.href,body:document.body.className,text:document.body.innerText.slice(0,300),modal:document.querySelector('.workModal')?.innerText.slice(0,250),player:typeof MediaElementPlayer,styles:[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>({href:l.href,media:l.media}))})`)));
  console.log(JSON.stringify(browser.events.filter(e=>e.method==='Runtime.exceptionThrown')));
  throw error;
}finally{await browser.send('Page.close');browser.close();}
