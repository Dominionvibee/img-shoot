import {connectBrowser} from './browser.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

const folder=resolve(import.meta.dirname,'../reference/scouting-fidelity/qa');
await mkdir(folder,{recursive:true});
const browser=await connectBrowser();
const repair=process.argv.includes('--repair');
const extras=process.argv.includes('--extras');
const rows=repair||extras?JSON.parse(await readFile(resolve(folder,'results.json'),'utf8')):[];
const widths=[320,375,390,430,768,1024,1280,1440,1920];
const onlyWidth=Number(process.argv.find(arg=>arg.startsWith('--width='))?.split('=')[1])||null;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(expression) {
  for(let i=0;i<200;i++) {if(await browser.eval(expression))return;await pause(75);}
  throw Error('Timed out: '+expression);
}
async function ready(origin) {
  await browser.send('Page.bringToFront');
  await browser.send('Page.navigate',{url:origin});
  await wait(`location.href.startsWith(${JSON.stringify(origin)})&&!!document.querySelector('button')&&document.readyState==='complete'`);
  if(origin.includes('localhost'))await wait(`!!document.querySelector('[data-scout-age-toggle][aria-expanded]')`);
  await browser.eval('document.fonts.ready');
  await browser.eval(`document.querySelectorAll('video').forEach(v=>{v.pause();v.currentTime=0;});window.scrollTo(0,0)`);
  await pause(450);
}
async function acknowledge() {
  await browser.eval(`[...document.querySelectorAll('div,p,button')].find(e=>e.textContent.trim().toLowerCase()==='acknowledged').click()`);
  await pause(1100);
}
async function choose(age) {
  await browser.send('Page.bringToFront');
  const selector=`(document.querySelector('[data-scout-age-toggle]')||document.querySelector('button'))`;
  await browser.eval(`${selector}.click()`);
  await wait(`[...${selector}.querySelectorAll('span')].some(e=>e.textContent===${JSON.stringify(age<14?'Under 14 years old':age+' yrs old')})`);
  await browser.eval(`[...${selector}.querySelectorAll('span')].find(e=>e.textContent===${JSON.stringify(age<14?'Under 14 years old':age+' yrs old')}).click()`);
  await pause(2500);
  await browser.eval('document.fonts.ready');
  // Freeze the source's *completed* scroll tween, like pausing its video. A
  // background Chrome target can otherwise continue GSAP scrolling between the
  // DOM measurements and screenshot. This changes no markup or presentation.
  if(age>=14)await browser.eval(`(()=>{if(!window.webpackChunk_N_E)return;let runtime;window.webpackChunk_N_E.push([['scouting-visual-qa-'+Date.now()],{},r=>{runtime=r}]);const gsap=runtime(802).os;for(const tween of gsap.getTweensOf(window))if(tween.vars.scrollTo)tween.progress(1).kill();})()`);
  if(age>=14)await browser.eval(`(()=>{const e=${age>=18?`document.querySelector('.modelForm')`:`document.querySelector('#myForm')`};window.scrollTo(0,e.getBoundingClientRect().top+scrollY-${age>=18?100:0});})()`);
  await pause(150);
}
async function capture(label,width,state) {
  if(extras&&!['age-options','one-guardian','height-dropdown','nationality-dropdown'].includes(state))return;
  if(repair&&!((label==='local'&&['age','guardian'].includes(state))||(label==='reference'&&width===1440&&['adult','pictures'].includes(state))))return;
  const metrics=await browser.eval(`(() => {
    const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).display!=='none'&&!e.closest('[hidden]');
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
    const fields=[...document.querySelectorAll('form input:not([type=file]),form select')].filter(visible);
    const texts=[...document.querySelectorAll('h1,h2,button,footer a,footer p')].filter(visible);
    const logo=document.querySelector('svg.desktop');
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,scrollY,
      text:document.body.innerText,logo:logo?rect(logo):null,
      fields:fields.map(e=>({name:e.name,type:e.type,placeholder:e.placeholder||'',rect:rect(e),font:getComputedStyle(e).font})),
      texts:texts.map(e=>({text:e.textContent.trim(),rect:rect(e),font:getComputedStyle(e).font})),
      footer:document.querySelector('footer')?rect(document.querySelector('footer')):null,
      captcha:document.querySelectorAll('iframe[src*=recaptcha]').length,
      broken:[...document.images].filter(i=>visible(i)&&i.complete&&i.naturalWidth===0).map(i=>i.src)};
  })()`);
  const screenshot=await browser.send('Page.captureScreenshot',{format:'png'});
  await writeFile(resolve(folder,`${label}-${state}-${width}.png`),Buffer.from(screenshot.data,'base64'));
  const index=rows.findIndex(row=>row.label===label&&row.width===width&&row.state===state);
  if(index>=0)rows.splice(index,1);
  rows.push({label,width,state,...metrics});
  await writeFile(resolve(folder,'results.json'),JSON.stringify(rows,null,2));
}
try {
  await browser.send('Network.enable');
  for(const width of widths) {
    if(onlyWidth&&width!==onlyWidth)continue;
    await browser.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    for(const [label,origin] of [['reference','https://getscouted.imgmodels.com/'],['local','http://localhost:4173/get-scouted']]) {
      if(repair&&label==='reference'&&width!==1440)continue;
      await ready(origin);await capture(label,width,'warning');
      await acknowledge();await capture(label,width,'age');
      if(!repair) {
        await browser.eval(`(document.querySelector('[data-scout-age-toggle]')||document.querySelector('button')).click()`);
        await wait(`(document.querySelector('[data-scout-age-toggle]')||document.querySelector('button')).querySelectorAll('span').length>20`);
        await capture(label,width,'age-options');
        await browser.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);await pause(150);
      }
      await choose(18);await capture(label,width,'adult');
      if(!repair&&[390,1440].includes(width))for(const [id,query,state] of [['height','170','height-dropdown'],['nationality','Fre','nationality-dropdown']]) {
        await browser.eval(`(()=>{const e=document.getElementById(${JSON.stringify(id)});window.scrollTo(0,e.getBoundingClientRect().top+scrollY-150);e.focus();})()`);
        await browser.send('Input.insertText',{text:query});
        await wait(`document.getElementById(${JSON.stringify(id)}).parentElement.querySelector(':scope>div')?.childElementCount>0`);
        if(id==='nationality')await wait(`document.getElementById('nationality').parentElement.querySelector(':scope>div')?.textContent.trim()==='French'`);
        await pause(1600);await capture(label,width,state);
      }
      await browser.eval(`document.querySelector('#modelForm h2').scrollIntoView()`);await pause(250);await capture(label,width,'pictures');
      await browser.eval(`(()=>{const e=[...document.querySelectorAll('[alt="img-qr"]')].find(e=>e.getClientRects().length);window.scrollTo(0,e.getBoundingClientRect().top+scrollY-100);})()`);await pause(250);await capture(label,width,'qr');
      await browser.eval(`window.scrollTo(0,document.documentElement.scrollHeight)`);await pause(250);await capture(label,width,'footer');
      await ready(origin);await acknowledge();await choose(16);await capture(label,width,'guardian');
      if(!repair){await browser.eval(`document.querySelector('#conf').click()`);await pause(250);await capture(label,width,'one-guardian');}
      if(!extras){await ready(origin);await acknowledge();await choose(13);await capture(label,width,'under14');}
    }
    console.log(`Scouting reference/local compared at ${width}px`);
  }
} finally {await browser.send('Page.close');browser.close();}

const summary=execFileSync('python',['-c',`
from PIL import Image,ImageChops,ImageStat
from pathlib import Path
import json,sys
p=Path(sys.argv[1]);rows=json.loads((p/'results.json').read_text(encoding='utf-8'));out=[]
for a in [r for r in rows if r['label']=='reference']:
 b=next(r for r in rows if r['label']=='local' and r['state']==a['state'] and r['width']==a['width'])
 suffix=a['state']+'-'+str(a['width'])+'.png'
 ia=Image.open(p/('reference-'+suffix)).convert('RGB');ib=Image.open(p/('local-'+suffix)).convert('RGB')
 diff=ImageChops.difference(ia,ib);mean=sum(ImageStat.Stat(diff).mean)/3
 changed=sum(1 for pixel in diff.getdata() if max(pixel)>3)
 out.append({'state':a['state'],'width':a['width'],'mean_absolute_channel_error':round(mean,6),'changed_percent':round(changed*100/(ia.width*ia.height),6),'same_text':a['text']==b['text'],'same_fields':a['fields']==b['fields'],'reference_height':a['scrollHeight'],'local_height':b['scrollHeight'],'reference_scroll':a['scrollY'],'local_scroll':b['scrollY'],'local_overflow':b['scrollWidth']>b['width'],'broken':b['broken'],'captcha':b['captcha']})
(p/'summary.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print(json.dumps({'pairs':len(out),'exact':sum(x['mean_absolute_channel_error']==0 for x in out),'max_error':max(x['mean_absolute_channel_error'] for x in out),'overflow':sum(x['local_overflow'] for x in out),'broken':sum(bool(x['broken']) for x in out)},indent=2))
`,folder],{encoding:'utf8'});
console.log(summary);
