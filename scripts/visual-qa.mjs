import {connectBrowser} from './browser.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
const b=await connectBrowser();
const widths=[320,375,390,430,768,1024,1280,1440,1920];
const results=[];await mkdir('reference/qa',{recursive:true});
for(const width of widths){
 for(const [label,origin]of[['reference','https://imgmodels.com'],['local','http://127.0.0.1:4173']]){
  await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  await b.send('Page.navigate',{url:origin+'/'});
  await new Promise(r=>setTimeout(r,1800));
  await b.eval(`document.fonts.ready`);
  await b.eval(`document.querySelector('#onetrust-reject-all-handler')?.click();document.querySelectorAll('video').forEach(v=>{v.pause();v.currentTime=0;});window.scrollTo(0,0)`);
  await new Promise(r=>setTimeout(r,350));
  const metrics=await b.eval(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,blocks:[...document.querySelectorAll('.header,.banner,.bannerText,.banner__credit,.imageSlider,.workGrid,.largeSplitLink,.footer')].map(e=>({class:e.className.replace(/ listenerAdded/g,''),rect:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).font})),broken:[...document.images].filter(i=>i.loading!=='lazy'&&i.src&&!i.complete||i.complete&&i.naturalWidth===0&&i.src).map(i=>i.src)})`);
  const screenshot=await b.send('Page.captureScreenshot',{format:'png'});await writeFile(`reference/qa/${label}-${width}.png`,Buffer.from(screenshot.data,'base64'));
  results.push({label,width,...metrics});console.log(`${label} ${width}: page=${metrics.scrollWidth}, height=${metrics.scrollHeight}, broken=${metrics.broken.length}`);
 }
 await writeFile('reference/qa/home-metrics.json',JSON.stringify(results,null,2));
}
b.close();
