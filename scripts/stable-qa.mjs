import{connectBrowser}from'./browser.mjs';import{writeFile}from'node:fs/promises';
const b=await connectBrowser();const result=[];
for(const route of['from-the-archive','new-york-state-fashion-workers-act','directory/london/vanesa-lorenzo'])for(const[label,origin]of[['reference','https://imgmodels.com'],['local','http://127.0.0.1:4173']]){
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:false});await b.send('Page.navigate',{url:`${origin}/${route}/`});await new Promise(r=>setTimeout(r,1500));
 await b.eval(`document.querySelector('#onetrust-reject-all-handler')?.click();document.querySelectorAll('img').forEach(i=>{i.loading='eager'});document.querySelectorAll('video').forEach(v=>{v.preload='auto';v.load()});`);
 await b.eval(`Promise.race([Promise.all([...document.querySelectorAll('video')].map(v=>v.readyState>=2?Promise.resolve():new Promise(r=>{v.addEventListener('loadeddata',r,{once:true});v.addEventListener('error',r,{once:true})}))),new Promise(r=>setTimeout(r,12000))])`);
 await b.eval(`Promise.race([Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,3000))]);`);
 await b.eval(`document.querySelectorAll('video').forEach(v=>{v.pause();v.currentTime=0});window.dispatchEvent(new Event('resize'));window.scrollTo(0,0);`);await new Promise(r=>setTimeout(r,500));
 const name=`${route.replaceAll('/','-')}-390`, metrics=await b.eval(`({height:document.documentElement.scrollHeight,media:[...document.querySelectorAll('video')].map(v=>({src:v.currentSrc,state:v.readyState,width:v.videoWidth,height:v.videoHeight}))})`);
 await writeFile(`reference/qa/pages/${label}-${name}.png`,Buffer.from((await b.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 result.push({label,route,...metrics});console.log(label,route,metrics.height,metrics.media.map(v=>v.state));
}await writeFile('reference/qa/pages/stable-results.json',JSON.stringify(result,null,2));b.close();
