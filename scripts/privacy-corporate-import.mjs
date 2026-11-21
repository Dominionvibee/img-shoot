import {connectBrowser} from './browser.mjs';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=resolve(import.meta.dirname,'..');const capture=resolve(base,'reference/corporate');const assets=resolve(base,'shoot-frontend/assets/corporate');await mkdir(assets,{recursive:true});
const b=await connectBrowser();
const sharedAssets={};
try{
 for(const [slug,name] of [['privacy','corporate-privacy-policy'],['cookies','corporate-cookies']]){
  const source=JSON.parse(await readFile(resolve(capture,slug+'-source.json'),'utf8'));
  const resources=JSON.parse(await readFile(resolve(capture,slug+'-resources.json'),'utf8'));
  const map={...sharedAssets};const styles={};
  for(const r of resources){
   if(r.type==='Stylesheet'){styles[r.url]=await readFile(resolve(capture,r.name),'utf8');continue;}
   if(!['Image','Font'].includes(r.type)||r.url.startsWith('data:')||/counters\.gif|clarity|c\.gif/.test(r.url))continue;
   let filename=new URL(r.url).pathname.split('/').at(-1).replace(/\.gzip$/,'');
   if(!filename.includes('.'))continue;
   map[r.url]='/assets/corporate/'+filename;
   await copyFile(resolve(capture,r.name),resolve(assets,filename));
  }
  const parsed=await b.eval(`(() => {
   const doc=new DOMParser().parseFromString(${JSON.stringify(source.html)},'text/html');
   const styles=${JSON.stringify(styles)};
   const css=[...doc.querySelectorAll('style,link[rel="stylesheet"]')].map(e=>{
    if(e.tagName==='STYLE')return e.textContent;
    const text=styles[e.href]||'';return e.media?'@media '+e.media+'{'+text+'}':text;
   }).join('\\n');
   doc.querySelectorAll('script,style,link,noscript,iframe').forEach(e=>e.remove());
   const comments=doc.createTreeWalker(doc,NodeFilter.SHOW_COMMENT),remove=[];while(comments.nextNode())remove.push(comments.currentNode);remove.forEach(e=>e.remove());
   doc.querySelector('#app')?.setAttribute('id','corporate-site');
   for(const a of doc.querySelectorAll('a[href]')){
    const href=a.getAttribute('href');if(href&&!href.startsWith('#'))a.setAttribute('href',new URL(href,${JSON.stringify(source.url)}).href);
   }
   for(const e of doc.querySelectorAll('[onclick]')){if(e.getAttribute('onclick').includes('OneTrust'))e.setAttribute('data-corporate-cookie-settings','');e.removeAttribute('onclick');}
   for(const form of doc.forms){
    form.removeAttribute('action');form.removeAttribute('method');form.removeAttribute('target');form.setAttribute('data-corporate-preview','');
    for(const hidden of form.querySelectorAll('input[type="hidden"]'))hidden.remove();
    const result=doc.createElement('p');result.className='corporate-preview-result';result.hidden=true;result.role='status';result.tabIndex=-1;form.append(result);
    form.querySelector('[type="submit"]')?.setAttribute('title','Local preview only; no subscription will be sent.');
   }
   for(const e of doc.querySelectorAll('[src]')){const src=new URL(e.getAttribute('src'),${JSON.stringify(source.url)}).href;e.setAttribute('src',${JSON.stringify(map)}[src]||src);}
   for(const e of doc.querySelectorAll('[style]')){let value=e.getAttribute('style');for(const [url,path]of Object.entries(${JSON.stringify(map)}))value=value.replaceAll(url,path);e.setAttribute('style',value);}
   return {html:doc.body.innerHTML,css,bodyAttributes:[...doc.body.attributes].map(a=>[a.name,a.value])};
  })()`);
  let css=parsed.css.replaceAll('#app','#corporate-site');
  for(const [url,path] of Object.entries(map)){css=css.replaceAll(url,path);const filename=new URL(url).pathname.split('/').at(-1);if(url.includes('/fonts/'))css=css.replaceAll('../fonts/'+filename,path);}
  await writeFile(resolve(assets,slug+'.css'),css);
  await writeFile(resolve(base,'shoot-frontend/data/pages/'+name+'.json'),JSON.stringify({title:source.title,bodyClass:source.bodyClass+' f01-corporate-policy',kind:'corporate-policy',source:source.url,bodyAttributes:parsed.bodyAttributes,html:parsed.html,styles:['/assets/corporate/'+slug+'.css','/src/corporate.css']},null,2)+'\n');
  console.log(JSON.stringify({slug,html:parsed.html.length,css:css.length,assets:Object.keys(map).length}));
  Object.assign(sharedAssets,map);
 }
}finally{await b.send('Page.close');b.close();}
