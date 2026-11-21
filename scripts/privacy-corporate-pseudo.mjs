import {connectBrowser} from './browser.mjs';
const b=await connectBrowser();try{
 await b.send('Network.enable');await b.send('Log.enable');await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 for(const url of ['https://www.img.com/privacy-policy','http://localhost:4173/img-privacy-policy']){
  await b.send('Page.navigate',{url});await new Promise(r=>setTimeout(r,5000));await b.eval(`document.querySelector('.navbar-toggler').click()`);await new Promise(r=>setTimeout(r,1500));
  console.log(JSON.stringify(await b.eval(`({url:location.href,a:document.querySelector('.dropdown-toggle').outerHTML,pseudo:(()=>{const c=getComputedStyle(document.querySelector('.dropdown-toggle span'),'::after');return {display:c.display,content:c.content,width:c.width,height:c.height,background:c.backgroundImage}})()})`),null,2));
  console.log(JSON.stringify(b.events.filter(e=>e.method==='Log.entryAdded'||e.method==='Network.loadingFailed').map(e=>e.params).filter(p=>p.blockedReason==='csp'||p.entry?.text?.includes('Content Security')),null,2));
 }
}finally{await b.send('Page.close');b.close();}
