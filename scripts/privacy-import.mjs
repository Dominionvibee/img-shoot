import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {connectBrowser} from './browser.mjs';
const base=resolve(import.meta.dirname,'..');
const capture=resolve(base,'reference/privacy');
const assets=resolve(base,'shoot-frontend/assets/privacy');await mkdir(assets,{recursive:true});
const content=JSON.parse(await readFile(resolve(capture,'rendered-content.json'),'utf8'));
const resources=JSON.parse(await readFile(resolve(capture,'resources.json'),'utf8'));
const b=await connectBrowser();
try{
 const source=await b.eval(`(() => {
  const doc=new DOMParser().parseFromString(${JSON.stringify(content.html)},'text/html');
  doc.querySelectorAll('script,iframe').forEach(e=>e.remove());
  const comments=doc.createTreeWalker(doc,NodeFilter.SHOW_COMMENT);const remove=[];while(comments.nextNode())remove.push(comments.currentNode);remove.forEach(e=>e.remove());
  const logo=doc.querySelector('#dsar-webform-header-logo');const logoData=logo.src;logo.src='/assets/privacy/wme-logo.jpg';
  doc.querySelector('img[alt="Powered By OneTrust"]').src='/assets/privacy/powered-by-onetrust.svg';
  doc.querySelector('#DSARWebformLanguageDropdown').setAttribute('value','English');
  doc.querySelector('#vt-input-5').setAttribute('value','Nigeria (+234)');
  const captcha=doc.querySelector('#google-captcha');captcha.innerHTML='<div data-privacy-recaptcha></div>';
  const form=doc.querySelector('form');form.setAttribute('data-local-preview','');form.setAttribute('novalidate','');
  const result=doc.createElement('p');result.className='privacy-local-result';result.setAttribute('role','status');result.setAttribute('tabindex','-1');result.hidden=true;form.append(result);
  // Preview disclosure is available from the submit control without adding a
  // design element that is absent in the reference's untouched form state.
  doc.querySelector('#dsar-webform-submit-button').title='Local preview only. This form does not send or store a privacy request.';
  const countries=new DOMParser().parseFromString(${JSON.stringify(JSON.parse(await readFile(resolve(capture,'country-state.json'),'utf8')).overlays[0])},'text/html');
  return {html:doc.body.innerHTML,logoData,countries:[...countries.querySelectorAll('[role="option"]')].map(e=>e.textContent.trim())};
 })()`);
 await writeFile(resolve(assets,'wme-logo.jpg'),Buffer.from(source.logoData.split(',')[1],'base64'));
 for(const resource of resources.filter(r=>r.type==='Font'))await copyFile(resolve(capture,resource.name),resolve(assets,new URL(resource.url).pathname.split('/').at(-1)));
 let css=content.styles[0]+'\n'+await readFile(resolve(capture,resources.find(r=>r.type==='Stylesheet').name),'utf8')+'\n'+content.styles.slice(1).join('\n');
 for(const r of resources.filter(r=>r.type==='Font')){const name=new URL(r.url).pathname.split('/').at(-1);css=css.replaceAll(name,'/assets/privacy/'+name);}
 await writeFile(resolve(assets,'onetrust.css'),css);
 const phone=JSON.parse(await readFile(resolve(capture,'source-states.json'),'utf8')).options;
 await writeFile(resolve(assets,'options.json'),JSON.stringify({countries:source.countries,phone},null,2));
 await writeFile(resolve(base,'shoot-frontend/data/pages/do-not-sell-my-personal-info.json'),JSON.stringify({title:'Privacy Web Form',bodyClass:'f01-privacy-form',kind:'privacy-form',source:'https://privacyportal.onetrust.com/webform/889c435d-64b4-46d8-ad05-06332fe1d097/db459d3a-bffa-4cb2-a6fd-0daa31651507?website=imgmodels.com',html:source.html,styles:['/assets/privacy/onetrust.css','/src/privacy-form.css']},null,2)+'\n');
 console.log(JSON.stringify({html:source.html.length,css:css.length,countries:source.countries.length,phone:phone.length}));
}finally{await b.send('Page.close');b.close();}
