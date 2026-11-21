import {connectBrowser} from './browser.mjs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

const base = resolve(import.meta.dirname, '..');
const folder = resolve(base, 'reference/qa/current-img');
await mkdir(folder, {recursive: true});
const manifest = JSON.parse(await readFile(resolve(base, 'shoot-frontend/data/routes.json'), 'utf8'));
const widths = process.env.QA_WIDTHS?.split(',').map(Number) || [320,375,390,430,768,1024,1280,1440,1920];
const paths = process.env.QA_PATHS?.split(',') || [
  '/', '/directory/', '/search/', '/contact/', '/about-us/', '/recruitmentwarning/',
  '/under-18-faq/', '/new-york-state-fashion-workers-act/', '/from-the-archive/',
  '/from-the-archive/page/2/', '/from-the-archive/page/29/',
  '/directory/london/vanesa-lorenzo/', '/khaite-fw26/', manifest.discoveredRoutes.find(path=>path.startsWith('/author/')),
];
const browser = await connectBrowser();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const repairPixels=process.argv.includes('--repair-pixels');
const pixelRepairs=repairPixels?new Set(JSON.parse(await readFile(resolve(folder,'pixels.json'),'utf8')).filter(result=>!result.identical).map(result=>result.path+':'+result.width)):null;
const results = process.argv.includes('--resume')||repairPixels
  ? JSON.parse(await readFile(resolve(folder,'results.json'),'utf8')) : [];
const metrics = `(() => {
  const selectors=['.header','.footer','main','.flexibleSections','.contactGrid__grid','.freeText__inner','.banner','.archiveGrid','.directoryGrid','.talentProfile','.searchApp'];
  const style=e=>{const s=getComputedStyle(e);return {font:s.font,color:s.color,background:s.backgroundColor,padding:s.padding,margin:s.margin,gap:s.gap,display:s.display,position:s.position}};
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height}};
  return {title:document.title,url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    height:document.documentElement.scrollHeight,text:document.body.innerText.replace(/\\s+/g,' ').trim(),
    blocks:selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(e=>getComputedStyle(e).display!=='none').slice(0,3).map((e,index)=>({selector,index,rect:rect(e),style:style(e)}))),
    footer:[...document.querySelectorAll('footer')].map(e=>({text:e.innerText,rect:rect(e),style:style(e),links:[...e.querySelectorAll('a')].map(a=>({text:a.textContent.trim(),rect:rect(a),style:style(a)}))})),
    visibleBroken:[...document.images].filter(i=>{const r=i.getBoundingClientRect();return i.complete&&!i.naturalWidth&&i.src&&r.width&&r.height&&r.bottom>0&&r.top<innerHeight}).map(i=>i.src),
    inputs:[...document.querySelectorAll('input,select,textarea,button')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>({tag:e.tagName,type:e.type,text:e.textContent?.trim(),placeholder:e.placeholder})),
    captcha:[...document.querySelectorAll('iframe[src*="recaptcha"],.g-recaptcha')].length};
})()`;

try {
  for (const path of paths) for (const width of widths) {
    const previous=results.findIndex(result=>result.path===path&&result.width===width);
    if(previous!==-1){
      const result=results[previous];
      if(repairPixels&&!pixelRepairs.has(path+':'+width))continue;
      if(!repairPixels&&!result.reference?.unavailable&&!result.local?.unavailable)continue;
      results.splice(previous,1);
    }
    const pair = {path, width};
    const name = (path.replaceAll('/','_') || 'home')+'-'+width;
    for (const [label, origin] of [['reference','https://imgmodels.com'], ['local','http://localhost:4173']]) {
      const start=browser.events.length;
      await browser.send('Page.bringToFront');
      await browser.send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:false});
      await browser.send('Page.navigate', {url:origin+path});
      await delay(250);
      const deadline=Date.now()+25000;
      let ready=false;
      while(Date.now()<deadline){
        ready=await browser.eval(`location.origin===${JSON.stringify(origin)}&&document.readyState==='complete'&&!!document.body&&(!!document.querySelector('.header')||document.body.innerText.includes('404.'))&&document.documentElement.classList.contains('fonts-loaded')&&${label==='local'?'!!document.querySelector(".reference-page")?.innerHTML':'true'}`);
        if(ready)break;
        await delay(100);
      }
      if(!ready){pair[label]={unavailable:true,url:await browser.eval('location.href')};continue;}
      await browser.eval('document.fonts.ready');
      if(path==='/directory/'){
        await browser.eval(`new Promise(resolve=>{let n=0;const check=()=>{if(document.querySelectorAll('.directoryGrid__item').length||++n>100)resolve();else setTimeout(check,100)};check()})`);
      }
      // Compare settled content, rather than one origin's cold image/API load
      // against the other origin's cached response. Keep original CSS intact.
      await browser.eval(`Promise.all([...document.images].map(image=>{image.loading='eager';return image.complete?Promise.resolve():new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});setTimeout(resolve,6000)})}))`);
      await browser.eval(`document.querySelector('#onetrust-reject-all-handler')?.click();document.querySelectorAll('video').forEach(v=>{v.pause();if(v.readyState)v.currentTime=0});window.scrollTo(0,0)`);
      await delay(1300);
      const data=await browser.eval(metrics);
      pair[label]=data;
      const shot=await browser.send('Page.captureScreenshot',{format:'png'});
      await writeFile(resolve(folder,`${label}-${name}-top.png`),Buffer.from(shot.data,'base64'));
      await browser.eval('window.scrollTo(0,document.documentElement.scrollHeight)');
      await delay(1300);
      await browser.eval(`document.querySelectorAll('video').forEach(v=>{v.pause();if(v.readyState)v.currentTime=0})`);
      const footerShot=await browser.send('Page.captureScreenshot',{format:'png'});
      await writeFile(resolve(folder,`${label}-${name}-footer.png`),Buffer.from(footerShot.data,'base64'));
      pair[label].exceptions=browser.events.slice(start).filter(e=>e.method==='Runtime.exceptionThrown');
      if(label==='reference'&&process.argv.includes('--update-titles')&&manifest.routes[path]){
        const file=resolve(base,'shoot-frontend/data/pages',manifest.routes[path]+'.json');
        const page=JSON.parse(await readFile(file,'utf8'));page.title=data.title;await writeFile(file,JSON.stringify(page));
      }
    }
    if(pair.reference&&!pair.reference.unavailable&&pair.local&&!pair.local.unavailable){
      pair.sameText=pair.reference.text===pair.local.text;
      pair.heightDelta=pair.local.height-pair.reference.height;
      pair.geometry=pair.reference.blocks.map(a=>{
        const b=pair.local.blocks.find(b=>b.selector===a.selector&&b.index===a.index);
        return {selector:a.selector,index:a.index,delta:b?Object.fromEntries(Object.keys(a.rect).map(k=>[k,b.rect[k]-a.rect[k]])):null,sameStyle:JSON.stringify(a.style)===JSON.stringify(b?.style)};
      });
    }
    results.push(pair);
    await writeFile(resolve(folder,'results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify({path,width,sameText:pair.sameText,heightDelta:pair.heightDelta,unavailable:!!pair.reference?.unavailable||!!pair.local?.unavailable}));
  }
}finally{await browser.send('Page.close');browser.close();}

const pixels=JSON.parse(execFileSync('python',['-c',`
import json,sys
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
p=Path(sys.argv[1]);rows=json.loads((p/'results.json').read_text(encoding='utf-8'));out=[]
for r in rows:
 name=r['path'].replace('/','_')+'-'+str(r['width'])
 for view in ['top','footer']:
  a=p/('reference-'+name+'-'+view+'.png');b=p/('local-'+name+'-'+view+'.png')
  if not a.exists() or not b.exists():continue
  d=ImageChops.difference(Image.open(a).convert('RGB'),Image.open(b).convert('RGB'));s=ImageStat.Stat(d)
  out.append({'path':r['path'],'width':r['width'],'view':view,'mean_absolute_channel_error':round(sum(s.mean)/3,6),'identical':d.getbbox() is None})
print(json.dumps(out))
`,folder],{encoding:'utf8',maxBuffer:4*1024*1024}));
await writeFile(resolve(folder,'pixels.json'),JSON.stringify(pixels,null,2));
const summary={comparedAt:new Date().toISOString(),pairs:results.length,pixelPairs:pixels.length,pixelIdentical:pixels.filter(p=>p.identical).length,
  maxMeanPixelError:Math.max(...pixels.map(p=>p.mean_absolute_channel_error)),unavailable:results.filter(r=>r.reference?.unavailable||r.local?.unavailable).map(r=>({path:r.path,width:r.width})),
  textMismatches:results.filter(r=>r.sameText===false).map(r=>({path:r.path,width:r.width})),
  geometryMismatches:results.filter(r=>r.geometry?.some(b=>!b.delta||Object.values(b.delta).some(v=>Math.abs(v)>0.5))).map(r=>({path:r.path,width:r.width,geometry:r.geometry})),
  localOverflow:results.filter(r=>r.local?.scrollWidth>r.width).map(r=>({path:r.path,width:r.width})),
  localExceptions:results.flatMap(r=>r.local?.exceptions||[])};
await writeFile(resolve(base,'shoot-frontend/docs/milestones/F01/qa/current-img-fidelity.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({pairs:summary.pairs,pixelPairs:summary.pixelPairs,pixelIdentical:summary.pixelIdentical,textMismatches:summary.textMismatches.length,geometryMismatches:summary.geometryMismatches.length,unavailable:summary.unavailable.length}));
