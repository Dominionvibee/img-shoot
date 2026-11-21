import {connectBrowser} from './browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const folder=resolve(import.meta.dirname,'../reference/legal-consent');
await mkdir(folder,{recursive:true});
const b=await connectBrowser();
const results=[];
const widths=process.argv.includes('--all-widths')?[320,375,390,430,768,1024,1280,1440,1920]:[390,1440];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(expression){
  for(let i=0;i<180;i++){if(await b.eval(expression))return;await delay(80);}
  throw Error('Consent check timed out: '+expression);
}
async function snapshot(label,width,state){
  const data=await b.eval(`(() => {const selectors=['#onetrust-banner-sdk','#onetrust-policy-text','#onetrust-button-group','#onetrust-pc-sdk','.ot-pc-header','#ot-pc-content','#ot-pc-desc','.ot-pc-footer'];return {active:document.activeElement?.outerHTML.slice(0,200),blocks:selectors.map(selector=>{const e=document.querySelector(selector);return {selector,rect:e?.getBoundingClientRect().toJSON(),font:e&&getComputedStyle(e).font,display:e&&getComputedStyle(e).display,text:e?.innerText}}),htmlOverflow:getComputedStyle(document.documentElement).overflow,bodyOverflow:getComputedStyle(document.body).overflow}})()`);
  const shot=await b.send('Page.captureScreenshot',{format:'png'});
  await writeFile(resolve(folder,label+'-'+width+'-'+state+'.png'),Buffer.from(shot.data,'base64'));
  results.push({label,width,state,...data});
}
try{
  await b.send('Network.enable');
  for(const width of widths)for(const label of ['reference','local']){
    await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    const origin=label==='reference'?'https://wmefashion.com':'http://localhost:4173';
    if(label==='reference')for(const name of ['OptanonConsent','OptanonAlertBoxClosed']){
      await b.send('Network.deleteCookies',{name,domain:'.wmefashion.com',path:'/'});
      await b.send('Network.deleteCookies',{name,domain:'wmefashion.com',path:'/'});
    }
    await b.send('Page.navigate',{url:origin+'/term'+(label==='reference'?'s':'')+'-of-use/'});
    await wait(`!!document.querySelector('#onetrust-consent-sdk')&&!!window.OneTrust`);
    if(label==='local'){
      await b.eval(`localStorage.removeItem('f01-cookie-consent-wme')`);
      await b.send('Page.reload');
      await wait(`document.querySelector('#onetrust-consent-sdk')?.dataset.localConsentReady==='true'`);
    }
    await wait(`!!document.querySelector('#onetrust-banner-sdk')`);
    await b.eval('document.fonts.ready');
    await wait(`getComputedStyle(document.querySelector('.siteWrap')).opacity==='1'`);
    await delay(1200);
    await snapshot(label,width,'banner');
    await b.eval(`window.OneTrust.ToggleInfoDisplay()`);await delay(600);
    await snapshot(label,width,'preferences');
    await b.eval(`document.querySelector('#close-pc-btn-handler').click()`);await delay(700);
    results.push({label,width,state:'closed',closed:await b.eval(`(()=>{const css=getComputedStyle(document.querySelector('#onetrust-pc-sdk'));return css.display==='none'||css.visibility==='hidden'||css.opacity==='0'})()`)});
    await b.eval(`document.querySelector('#onetrust-reject-all-handler').click()`);
  }
}finally{await b.send('Page.close');b.close();}
await writeFile(resolve(folder,'measurements.json'),JSON.stringify(results,null,2));
const summary=execFileSync('python',['-c',`
import json,sys
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
p=Path(sys.argv[1]);out=[]
for width in json.loads(sys.argv[2]):
 for state in ['banner','preferences']:
  a=Image.open(p/f'reference-{width}-{state}.png').convert('RGB');b=Image.open(p/f'local-{width}-{state}.png').convert('RGB');d=ImageChops.difference(a,b);s=ImageStat.Stat(d)
  out.append({'width':width,'state':state,'mean_absolute_channel_error':sum(s.mean)/3})
(p/'summary.json').write_text(json.dumps(out,indent=2),encoding='utf-8');print(json.dumps(out,indent=2))
`,folder,JSON.stringify(widths)],{encoding:'utf8'});
console.log(summary);
