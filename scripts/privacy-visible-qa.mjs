import {connectBrowser} from './browser.mjs';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve(import.meta.dirname,'../reference/privacy');const b=await connectBrowser();const results=[];
const original='https://privacyportal.onetrust.com/webform/889c435d-64b4-46d8-ad05-06332fe1d097/db459d3a-bffa-4cb2-a6fd-0daa31651507?website=imgmodels.com';
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 for(const [name,url] of [['original',original],['local','http://localhost:4173/do-not-sell-my-personal-info']]){
  await b.send('Page.navigate',{url});
  for(let i=0;i<150;i++){if(await b.eval(`!!document.querySelector('iframe[title="reCAPTCHA"]')`))break;await new Promise(r=>setTimeout(r,100));}
  await b.eval('document.fonts.ready');
  await new Promise(r=>setTimeout(r,2000));
  for(const width of [320,375,390,430,768,1024,1280,1440,1920]){
   await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
   await b.eval(`window.scrollTo(0,document.querySelector('#google-captcha').getBoundingClientRect().top+scrollY-200)`);
   await new Promise(r=>setTimeout(r,width===320?1500:500));
   const result=await b.eval(`(() => {const frame=document.querySelector('iframe[title="reCAPTCHA"]'),r=frame.getBoundingClientRect();return {width:innerWidth,scrollY,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,captcha:{x:r.x,y:r.y+scrollY,viewportY:r.y,width:r.width,height:r.height,src:frame.src},overflow:document.documentElement.scrollWidth>innerWidth}})()`);
   results.push({name,...result});
   // A viewport screenshot preserves the scrolled cross-origin iframe's paint
   // position. A full-document screenshot can move OOPIF layers during resize.
   const shot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,`${name}-visible-${width}.png`),Buffer.from(shot.data,'base64'));
  }
 }
 await writeFile(resolve(out,'visible-comparison.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({captures:results.length,overflows:results.filter(r=>r.overflow),widths:results.filter(r=>r.name==='local').map(r=>r.width)}));
}finally{await b.send('Page.close');b.close();}
