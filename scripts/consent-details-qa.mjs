import {connectBrowser} from './browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const folder=resolve(import.meta.dirname,'../reference/consent-details');
await mkdir(folder,{recursive:true});
const b=await connectBrowser();
const results=[];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(expression){for(let i=0;i<240;i++){if(await b.eval(expression))return;await delay(50);}throw Error('Consent details did not load');}
async function snapshot(variant,label,width,state){
  const metadata=await b.eval(`({height:document.querySelector('#onetrust-pc-sdk').getBoundingClientRect().height,hosts:[...document.querySelectorAll('#ot-host-lst .ot-host-name')].map(e=>e.textContent),cookies:[...document.querySelectorAll('#ot-host-lst .ot-c-name>div:last-child')].map(e=>e.textContent),text:document.querySelector('#ot-pc-lst').innerText,expanded:document.querySelector('.ot-host-box')?.getAttribute('aria-expanded')})`);
  const screenshot=await b.send('Page.captureScreenshot',{format:'png'});
  await writeFile(resolve(folder,`${variant}-${label}-${width}-${state}.png`),Buffer.from(screenshot.data,'base64'));
  results.push({variant,label,width,state,...metadata});
}
try{
  for(const variant of ['wme','img'])for(const width of [390,1440])for(const label of ['reference','local']){
    await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    const url=label==='local'?'http://localhost:4173/'+(variant==='wme'?'term-of-use':'about-us'):variant==='wme'?'https://wmefashion.com/terms-of-use/':'https://imgmodels.com/about-us/';
    await b.send('Page.navigate',{url});
    await wait(`!!window.OneTrust&&!!document.querySelector('#onetrust-pc-sdk')`);
    if(label==='local'){
      await b.eval(`localStorage.setItem(${JSON.stringify(variant==='wme'?'f01-cookie-consent-wme':'f01-cookie-consent')},JSON.stringify({value:'essential',choices:{'1':true}}))`);
    }else {await b.eval(`window.OneTrust.RejectAll()`);await delay(700);}
    await b.eval('document.fonts.ready');
    await b.eval('window.OneTrust.ToggleInfoDisplay()');await delay(400);
    await wait(`document.querySelector('#onetrust-pc-sdk').getBoundingClientRect().height>0&&getComputedStyle(document.querySelector('#onetrust-pc-sdk')).visibility!=='hidden'`);
    await b.eval(`document.querySelector('.ot-cat-item[data-optanongroupid="1"] button[ot-accordion="true"]').click();document.querySelector('.category-host-list-handler[data-parent-id="1"]').click()`);await delay(300);
    await snapshot(variant,label,width,'list');
    assert.ok(await b.eval(`document.querySelectorAll('#ot-host-lst .ot-host-info').length>0`));
    const position=await b.eval(`(()=>{const r=document.querySelector('.ot-host-box').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await b.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...position});
    await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...position});
    await delay(300);await snapshot(variant,label,width,'expanded');
    assert.equal(await b.eval(`document.querySelector('.ot-host-box').getAttribute('aria-expanded')`),'true');
    await b.eval(`(()=>{const input=document.querySelector('#vendor-search-handler');input.value='no-cookie-test';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,key:'t'}))})()`);await delay(250);
    await snapshot(variant,label,width,'empty');
    assert.ok(await b.eval(`document.querySelector('#no-results')?.textContent.includes('no-cookie-test did not match any Hosts.')`));
    await b.eval(`(()=>{const input=document.querySelector('#vendor-search-handler');input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,key:'Backspace'}))})()`);await delay(150);
    await b.eval(`document.querySelector('#filter-btn-handler').click()`);await delay(250);
    await snapshot(variant,label,width,'filter');
    await b.eval(`document.querySelector('#clear-filters-handler').click();document.querySelector('.category-filter-handler[data-optanongroupid="4"]').click();document.querySelector('#filter-apply-handler').click()`);await delay(250);
    await snapshot(variant,label,width,'advertising');
    assert.ok(await b.eval(`document.querySelectorAll('#ot-host-lst .ot-host-info').length>0`));
    if(label==='local'){
      const expected=results.find(result=>result.variant===variant&&result.label==='reference'&&result.width===width&&result.state==='advertising');
      assert.equal(await b.eval(`document.querySelectorAll('#ot-host-lst .ot-c-name>div:last-child').length`),expected.cookies.length);
      await b.eval(`document.querySelector('.ot-host-box').focus()`);
      await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});
      await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      assert.equal(await b.eval(`document.querySelector('.ot-host-box').getAttribute('aria-expanded')`),'true');
      await b.eval(`document.querySelector('.back-btn-handler').click()`);
      assert.equal(await b.eval(`getComputedStyle(document.querySelector('#ot-pc-content')).display`),'block');
      await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      assert.equal(await b.eval(`getComputedStyle(document.querySelector('#onetrust-pc-sdk')).display`),'none');
    }
    console.log(variant,label,width,'details/search/filter passed');
  }
  assert.equal(b.events.filter(e=>e.method==='Runtime.exceptionThrown').length,0);
}finally{await b.send('Page.close');b.close();}
await writeFile(resolve(folder,'measurements.json'),JSON.stringify(results,null,2));
console.log(execFileSync('python',['-c',`
import json,sys
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
p=Path(sys.argv[1]);rows=json.loads((p/'measurements.json').read_text(encoding='utf-8'));out=[]
for a in rows:
 if a['label']!='reference':continue
 b=next(x for x in rows if x['label']=='local' and all(x[k]==a[k] for k in ['variant','width','state']))
 suffix=f"{a['width']}-{a['state']}.png";im=Image.open(p/(a['variant']+'-reference-'+suffix)).convert('RGB');local=Image.open(p/(a['variant']+'-local-'+suffix)).convert('RGB');stats=ImageStat.Stat(ImageChops.difference(im,local))
 out.append({'variant':a['variant'],'width':a['width'],'state':a['state'],'same_text':a['text']==b['text'],'same_cookies':a['cookies']==b['cookies'],'reference_height':a['height'],'local_height':b['height'],'mean_absolute_channel_error':sum(stats.mean)/3})
(p/'summary.json').write_text(json.dumps(out,indent=2),encoding='utf-8');print(json.dumps(out,indent=2))
`,folder],{encoding:'utf8'}));
