import {connectBrowser} from './browser.mjs';
import {writeFile,mkdir,readFile} from 'node:fs/promises';

const browser=await connectBrowser({newTab:true});
await browser.send('Network.enable');
const widths=(process.argv[2]||'320,375,430,768,1024,1280,1920').split(',').map(Number);
const routes=(process.argv[3]||'directory,search').split(',');
const output='reference/qa/responsive-directory';
await mkdir(output,{recursive:true});
const results=await readFile(`${output}/metrics.json`,'utf8').then(JSON.parse).catch(()=>[]);
for(const route of routes){
  for(const width of widths){
    for(const [label,origin] of [['reference','https://imgmodels.com'],['local','http://127.0.0.1:4173']]){
      browser.events.length=0;
      await browser.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
      await browser.send('Page.navigate',{url:`${origin}/${route}/`});
      await new Promise(resolve=>setTimeout(resolve,900));
      await browser.eval('sessionStorage.clear()');
      await browser.send('Page.reload');
      for(let attempt=0;attempt<40;attempt++){
        const ready=await browser.eval(`document.readyState==='complete' && !!document.querySelector('.header__searchApp input') ${route==='directory'?'&& !!document.querySelector(\'.territoryPicker\')':''}`);
        if(ready)break;
        await new Promise(resolve=>setTimeout(resolve,150));
      }
      await browser.eval('document.fonts.ready');
      await browser.eval(`document.querySelector('#onetrust-reject-all-handler')?.click();document.querySelectorAll('video').forEach(video=>video.pause());window.scrollTo(0,0);`);
      await new Promise(resolve=>setTimeout(resolve,2000));
      await browser.eval('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      const metrics=await browser.eval(`({url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,height:document.documentElement.scrollHeight,picker:!!document.querySelector('.territoryPicker.active'),text:document.body.innerText.slice(0,1800),blocks:[...document.querySelectorAll('.header,.header__logoWrapper,.header__searchApp,.directory,.directory__desktopStickyContainer,.directory__viewsWrapper,.directoryGrid,.territoryPicker,.territoryPicker__filtersWrapper,.searchPage,.searchPage__inputWrapper,.searchApp,.searchFilters,.footer')].filter(element=>element.getBoundingClientRect().width).map(element=>({class:element.className,rect:element.getBoundingClientRect().toJSON(),font:getComputedStyle(element).font})),broken:[...document.images].filter(image=>image.complete&&image.naturalWidth===0&&image.src&&image.getBoundingClientRect().width).map(image=>image.src)})`);
      const errors=browser.events.filter(event=>event.method==='Runtime.exceptionThrown').map(event=>event.params.exceptionDetails.exception?.description||event.params.exceptionDetails.text);
      const failedRequests=browser.events.filter(event=>event.method==='Network.loadingFailed'&&event.params.errorText!=='net::ERR_ABORTED').map(event=>event.params.errorText);
      const badResponses=browser.events.filter(event=>event.method==='Network.responseReceived'&&event.params.response.status>=400).map(event=>({url:event.params.response.url,status:event.params.response.status}));
      const shot=await browser.send('Page.captureScreenshot',{format:'png'});
      await writeFile(`${output}/${route}-${label}-${width}.png`,Buffer.from(shot.data,'base64'));
      const previous=results.findIndex(item=>item.route===route&&item.label===label&&item.width===width);
      if(previous>=0)results.splice(previous,1);
      results.push({route,label,width,...metrics,errors,failedRequests,badResponses});
      console.log(`${route} ${label} ${width}: page ${metrics.scrollWidth}/${metrics.clientWidth}, picker ${metrics.picker}, errors ${errors.length}, broken ${metrics.broken.length}`);
      await writeFile(`${output}/metrics.json`,JSON.stringify(results,null,2));
    }
  }
}
browser.close();
