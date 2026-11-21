import { connectBrowser } from './browser.mjs';
import { writeFile } from 'node:fs/promises';
const b=await connectBrowser();
await b.send('Emulation.setDeviceMetricsOverride',{width:Number(process.argv[3]||1440),height:900,deviceScaleFactor:1,mobile:false});
if(process.argv.includes('--clear')) {await b.send('Network.clearBrowserCookies');await b.send('Storage.clearDataForOrigin',{origin:'https://imgmodels.com',storageTypes:'all'});}
await b.send('Page.navigate',{url:process.argv[2]||'https://imgmodels.com/'});
await new Promise(r=>setTimeout(r,5000));
if(process.argv.includes('--cookie')) {
 console.log(await b.eval(`JSON.stringify({cookie:document.querySelector('#onetrust-consent-sdk')?.outerHTML.length,styles:[...document.querySelectorAll('style')].map(e=>({id:e.id,len:e.textContent.length}))})`));
 await writeFile('reference/cookie.html',await b.eval(`document.querySelector('#onetrust-consent-sdk')?.outerHTML||''`));
 await writeFile('reference/cookie.css',await b.eval(`document.querySelector('#onetrust-style')?.textContent||''`));
}
const data=await b.eval(`JSON.stringify({text:document.body.innerText.slice(0,2000),bodyClass:document.body.className,resources:performance.getEntriesByType('resource').filter(r=>/json|ajax|api/.test(r.name)).map(r=>r.name),styles:[...document.querySelectorAll('.header,.header__logoWrapper,.banner,.bannerText,.imageSlider,.workGrid')].map(e=>({c:e.className,r:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).font}))})`);
console.log(data);
const prefix=process.argv[4]||'inspect';
await writeFile(`reference/${prefix}.html`,await b.eval('document.documentElement.outerHTML'));
await writeFile(`reference/${prefix}.png`,Buffer.from((await b.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
b.close();
