import { connectBrowser } from './browser.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

// A separate CDP target keeps this matrix independent of concurrent interaction
// checks. Cookies are dismissed without clearing shared browser storage.
const browser = await connectBrowser({newTab: true});
const folder = resolve(import.meta.dirname, '../reference/qa/responsive-content');
await mkdir(folder, {recursive: true});
await browser.send('Network.enable');
await browser.send('Log.enable');
const results = process.argv.includes('--resume') ? JSON.parse(await readFile(resolve(folder, 'results.json'), 'utf8')) : [];
const widths = [320, 375, 430, 768, 1024, 1280, 1920];
const routes = ['contact', 'about-us', 'recruitmentwarning', 'under-18-faq'];

try {
  for (const route of routes) for (const width of widths) {
    for (const [label, origin] of [['reference', 'https://imgmodels.com'], ['local', 'http://127.0.0.1:4173']]) {
      if (results.some(result => result.label === label && result.route === route && result.viewportWidth === width)) continue;
      const startEvent = browser.events.length;
      await browser.send('Emulation.setDeviceMetricsOverride', {width, height: 900, deviceScaleFactor: 1, mobile: false});
      await browser.send('Page.navigate', {url: `${origin}/${route}/`});
      await browser.eval(`new Promise((resolve,reject)=>{let n=0;const check=()=>{if(document.readyState==='complete'&&document.querySelector('.flexibleSections'))resolve();else if(++n>160)reject(new Error('Content did not become ready'));else setTimeout(check,125)};check()})`);
      await browser.eval('document.fonts.ready');
      await browser.eval(`{
        const reject=document.querySelector('#onetrust-reject-all-handler');
        if(reject&&reject.getClientRects().length&&getComputedStyle(reject).visibility!=='hidden')reject.click();
        window.scrollTo(0,0);
      }`);
      await new Promise(resolve => setTimeout(resolve, 250));
      const metrics = await browser.eval(`({
        url:location.href,width:innerWidth,height:innerHeight,
        scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
        text:document.body.innerText,
        broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.src).map(i=>i.src),
        blocks:[...document.querySelectorAll('main,.header,.footer,.freeText__inner,.contactGrid__grid')].map(e=>({
          class:e.className,rect:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).font
        })),
        content:[...document.querySelectorAll('.freeText__inner>p,.freeText__inner>h6,.contactGrid__tile')].map(e=>({
          text:e.textContent.trim(),rect:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).font
        })),
        horizontalOverflow:[...document.body.querySelectorAll('main *')].filter(e=>{
          const r=e.getBoundingClientRect();return r.width>0&&(r.left < -1||r.right>innerWidth+1)
        }).slice(0,20).map(e=>({tag:e.tagName,class:e.className,rect:e.getBoundingClientRect().toJSON()}))
      })`);
      const events = browser.events.slice(startEvent);
      const errors = events.filter(event => event.method === 'Runtime.exceptionThrown'
        || (event.method === 'Log.entryAdded' && event.params.entry.level === 'error')
        || (event.method === 'Network.loadingFailed' && !event.params.canceled));
      const name = `${label}-${route}-${width}`;
      const shot = await browser.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
      await writeFile(resolve(folder, `${name}.png`), Buffer.from(shot.data, 'base64'));
      results.push({label,route,viewportWidth:width,...metrics,errors});
      await writeFile(resolve(folder, 'results.json'), JSON.stringify(results, null, 2));
      console.log(`${name}: width=${metrics.scrollWidth}, height=${metrics.scrollHeight}, errors=${errors.length}`);
    }
  }
} finally {
  browser.close();
}

const summary = execFileSync('python', ['-c', `
import json,sys
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
p=Path(sys.argv[1]); rows=json.loads((p/'results.json').read_text(encoding='utf-8')); out=[]
for i in range(0,len(rows),2):
 a,b=rows[i:i+2]; suffix=a['route']+'-'+str(a['viewportWidth'])+'.png'
 original=Image.open(p/('reference-'+suffix)).convert('RGB'); local=Image.open(p/('local-'+suffix)).convert('RGB')
 diff=ImageChops.difference(original,local); values=ImageStat.Stat(diff)
 changed=sum(1 for r,g,bl in diff.getdata() if max(r,g,bl)>3)
 geometry=[{'selector':x['class'],'reference':x['rect'],'local':y['rect']} for x,y in zip(a['blocks'],b['blocks']) if x['rect']!=y['rect']]
 out.append({'route':a['route'],'width':a['viewportWidth'],'same_text':a['text']==b['text'],
 'mean_absolute_channel_error':round(sum(values.mean)/3,6),'changed_pixels_over_3':changed,
 'changed_percent':round(100*changed/(original.width*original.height),6),
 'reference_height':a['scrollHeight'],'local_height':b['scrollHeight'],
 'reference_overflow':a['scrollWidth']>a['width'],'local_overflow':b['scrollWidth']>b['width'],
        'geometry_differences':geometry,'local_broken_images':b['broken'],'reference_errors':a['errors'],
        'local_errors':[e for e in b['errors'] if not e.get('params',{}).get('entry',{}).get('url','').startswith('https://imgmodels.com/')]})
(p/'pixel-summary.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print(json.dumps({'comparisons':len(out),'max_mean_absolute_channel_error':max(x['mean_absolute_channel_error'] for x in out),
 'text_mismatches':sum(not x['same_text'] for x in out),'geometry_mismatches':sum(bool(x['geometry_differences']) for x in out),
 'local_overflows':sum(x['local_overflow'] for x in out),'local_errors':sum(len(x['local_errors']) for x in out)},indent=2))
`, folder], {encoding: 'utf8'});
console.log(summary);
