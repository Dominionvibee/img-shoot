import {connectBrowser} from './browser.mjs';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

const folder = resolve(import.meta.dirname, '../reference/legal-fidelity');
await mkdir(folder, {recursive:true});
const browser = await connectBrowser();
const widths = [320,375,390,430,768,1024,1280,1440,1920];
const routes = [
  ['terms-of-use','term-of-use'], ['privacy-policy','privacy-policy'],
  ['cookies','cookie-policy'], ['the-incubator-terms','the-incubator-terms'],
];
const results = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(expression, timeout=30000) {
  const end = Date.now()+timeout;
  while(Date.now()<end) {
    if(await browser.eval(expression)) return;
    await delay(80);
  }
  throw new Error('Legal page did not become ready: '+expression);
}
const measurements = `(() => {
  const rect = e => Object.fromEntries(Object.entries(e.getBoundingClientRect().toJSON()).map(([k,v])=>[k,Math.round(v*1000)/1000]));
  const selectors = ['.header','.header__logoWrap','.header__menuList','main','.siteWrap','h1','.policy-container','.scroll-policy-container','.footer','.footer .maxWidth','.footer img','.footer__menu','.site-credits'];
  const blocks = selectors.flatMap(selector=>[...document.querySelectorAll(selector)].map((e,index)=>({selector,index,rect:rect(e),font:getComputedStyle(e).font,color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor,display:getComputedStyle(e).display})));
  return {path:location.pathname,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,
    header:!!document.querySelector('.header'),footers:document.querySelectorAll('footer').length,
    sourceFooter:!!document.querySelector('.footer__menuCol'),imgFooter:!!document.querySelector('.footer__col'),
    text:[...document.querySelectorAll('header,main,footer')].map(e=>e.innerText).join('\\n'),
    footerLinks:[...document.querySelectorAll('footer a')].map(a=>({text:a.textContent.trim(),rect:rect(a),font:getComputedStyle(a).font})),
    broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.src).map(i=>i.src),blocks};
})()`;

async function shot(name) {
  const screenshot = await browser.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(resolve(folder,name+'.png'),Buffer.from(screenshot.data,'base64'));
}

try {
  await browser.send('Network.enable');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  for(const [source,local] of routes) {
    for(const label of ['reference','local']) {
      const origin = label==='reference'?'https://wmefashion.com':'http://localhost:4173';
      const path = label==='reference'?source:local;
      await browser.send('Page.navigate',{url:origin+'/'+path+'/'});
      await wait(`document.readyState==='complete'&&!!document.querySelector('.footer__menuCol')&&getComputedStyle(document.querySelector('.siteWrap')).opacity==='1'`);
      if(label==='local') await wait(`document.querySelector('#onetrust-consent-sdk')?.dataset.localConsentReady==='true'`);
      await browser.eval('document.fonts.ready');
      await browser.eval(`document.querySelector('#onetrust-reject-all-handler')?.click()`);
      await delay(400);
      for(const width of widths) {
        await browser.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
        await browser.eval(`document.querySelector('.header')?.classList.remove('active');window.scrollTo({top:0,behavior:'instant'})`);
        await delay(200);
        const top = await browser.eval(measurements);
        const prefix = label+'-'+source+'-'+width;
        await shot(prefix+'-top');
        await browser.eval(`window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})`);
        await delay(200);
        const bottom = await browser.eval(measurements);
        await shot(prefix+'-bottom');
        let menu;
        if(width<1024) {
          // The source uses Lenis/ScrollTrigger. Real wheel input updates their
          // scroll state; native scrollTo alone can leave its footer layer stale.
          await browser.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:100,y:500,deltaX:0,deltaY:-100000});
          await delay(1600);
          await browser.eval(`document.querySelector('.burger').click()`);
          await delay(600);
          menu = await browser.eval(`({active:document.querySelector('.header').classList.contains('active'),height:document.querySelector('.header').getBoundingClientRect().height,links:[...document.querySelectorAll('.header__menuList a')].map(a=>({text:a.textContent,rect:a.getBoundingClientRect().toJSON()}))})`);
          await shot(prefix+'-menu');
          await browser.eval(`document.querySelector('.burger').click()`);
          await delay(500);
        }
        results.push({route:source,localRoute:local,label,width,top,bottom,menu});
        await writeFile(resolve(folder,'measurements.json'),JSON.stringify(results,null,2));
        console.log(prefix+': page '+top.scrollWidth+'x'+top.height+', footer '+top.sourceFooter+', overflow '+(top.scrollWidth-width));
      }
    }
  }
  const errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown');
  await writeFile(resolve(folder,'browser-errors.json'),JSON.stringify(errors,null,2));
} finally {
  await browser.send('Page.close');
  browser.close();
}

const summary = execFileSync('python',['-c',`
import json,sys
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
p=Path(sys.argv[1]); rows=json.loads((p/'measurements.json').read_text(encoding='utf-8')); out=[]
for a in rows:
 if a['label']!='reference':continue
 b=next(x for x in rows if x['label']=='local' and x['route']==a['route'] and x['width']==a['width'])
 comparisons={}
 for state in ['top','bottom']+(['menu'] if a.get('menu') else []):
  suffix=a['route']+'-'+str(a['width'])+'-'+state+'.png'
  original=Image.open(p/('reference-'+suffix)).convert('RGB'); local=Image.open(p/('local-'+suffix)).convert('RGB')
  diff=ImageChops.difference(original,local); stats=ImageStat.Stat(diff)
  changed=sum(1 for pixel in diff.getdata() if max(pixel)>3)
  comparisons[state]={'mean_absolute_channel_error':round(sum(stats.mean)/3,6),'changed_percent':round(100*changed/(original.width*original.height),6)}
 geometry=[{'selector':x['selector'],'reference':x['rect'],'local':y['rect']} for x,y in zip(a['top']['blocks'],b['top']['blocks']) if x!=y]
 out.append({'route':a['route'],'width':a['width'],'same_text':a['top']['text']==b['top']['text'],'reference_height':a['top']['height'],'local_height':b['top']['height'],'local_overflow':b['top']['scrollWidth']>b['width'],'geometry_differences':geometry,'pixels':comparisons,'menu_active':b['menu']['active'] if b.get('menu') else None})
(p/'summary.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print(json.dumps({'comparisons':len(out),'text_mismatches':sum(not x['same_text'] for x in out),'geometry_mismatches':sum(bool(x['geometry_differences']) for x in out),'local_overflows':sum(x['local_overflow'] for x in out),'max_error':max(s['mean_absolute_channel_error'] for x in out for s in x['pixels'].values())},indent=2))
`,folder],{encoding:'utf8'});
console.log(summary);
