import{connectBrowser}from'./browser.mjs';import{writeFile,mkdir}from'node:fs/promises';
const b=await connectBrowser({newTab:true});const out=[];await mkdir('reference/qa/consent',{recursive:true});
for(const[label,origin]of[['reference','https://imgmodels.com'],['local','http://127.0.0.1:4173']])for(const width of[390,1440]){
 await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await b.send('Page.navigate',{url:origin+'/'});await new Promise(r=>setTimeout(r,1800));
 await b.eval(`document.querySelector('#onetrust-reject-all-handler')?.click();OneTrust.ToggleInfoDisplay()`);await new Promise(r=>setTimeout(r,400));
 out.push({label,width,panel:await b.eval(`({visible:document.querySelector('#onetrust-pc-sdk').getBoundingClientRect().toJSON(),choices:[...document.querySelectorAll('.category-switch-handler')].map(i=>({id:i.dataset.optanongroupid,checked:i.checked})),focus:document.activeElement.id})`)});
 await writeFile(`reference/qa/consent/${label}-${width}.png`,Buffer.from((await b.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 if(label==='local'){
  await b.eval(`document.querySelector('[ot-accordion="true"][aria-controls="ot-desc-id-2"]').click();document.querySelector('#ot-group-id-2').click();document.querySelector('.save-preference-btn-handler').click();OneTrust.ToggleInfoDisplay()`);
  out.push({label,width,test:'custom-restored',result:await b.eval(`({saved:JSON.parse(localStorage.getItem('f01-cookie-consent')),checked:document.querySelector('#ot-group-id-2').checked,bodyInert:document.querySelector('main').inert})`)});
  await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  out.push({label,width,test:'escape',result:await b.eval(`({hidden:document.querySelector('#onetrust-pc-sdk').getAttribute('aria-hidden'),bodyInert:document.querySelector('main').inert})`)});
 }else await b.eval(`document.querySelector('#close-pc-btn-handler').click()`);
}
await writeFile('reference/qa/consent/results.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));b.close();
