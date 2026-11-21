import {readFile, writeFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {canonicalPath, localRoute} from '../shoot-frontend/src/navigation.mjs';

const root=resolve(import.meta.dirname,'../shoot-frontend');
const manifest=JSON.parse(await readFile(resolve(root,'data/routes.json'),'utf8'));
const routes=new Map(Object.entries(manifest.routes));
for(const [path,slug] of Object.entries({
  '/get-scouted/':'get-scouted', '/term-of-use/':'legal-terms-of-use',
  '/privacy-policy/':'legal-privacy-policy', '/cookie-policy/':'legal-cookies',
  '/the-incubator-terms/':'legal-the-incubator-terms',
  '/do-not-sell-my-personal-info/':'do-not-sell-my-personal-info',
  '/img-privacy-policy/':'corporate-privacy-policy','/img-cookie-policy/':'corporate-cookies',
}))routes.set(path,slug);
routes.set('/recruitment-warning/',routes.get('/recruitmentwarning/'));
routes.set('/home/',routes.get('/'));
const normalize=path=>(canonicalPath(path).replace(/\/+$/,'')||'')+'/';
const data={checkedAt:new Date().toISOString(),discovered:manifest.discoveredRoutes.length,captured:routes.size,pending:manifest.pendingRoutes.length,
  missingPages:[],missingStyles:[],missingAssets:[],internalTargetsNotInventoried:[],externalPageHosts:{},pages:[]};
const assets=new Map();
const exists=async path=>{
  if(!assets.has(path))assets.set(path,await stat(resolve(root,'.'+path)).then(s=>s.isFile()).catch(()=>false));
  return assets.get(path);
};
const unknown=new Map();
for(const [path,slug] of routes){
  let page;
  try{page=JSON.parse(await readFile(resolve(root,'data/pages',slug+'.json'),'utf8'));}
  catch(e){data.missingPages.push({path,slug,error:e.code||e.message});continue;}
  const html=page.html||'';
  for(const href of page.styles||[])if(href.startsWith('/')&&!await exists(href))data.missingStyles.push({path,href});
  for(const m of html.matchAll(/\b(?:src|poster)=["'](\/assets\/[^"']+)["']/g))if(!await exists(m[1]))data.missingAssets.push({path,asset:m[1]});
  for(const match of html.matchAll(/\bhref=["']([^"']+)["']/g)){
    const href=match[1].replaceAll('&amp;','&');
    const local=localRoute(href,'http://localhost:4173'+path);
    if(local){
      const target=new URL(local,'http://localhost:4173');
      if(!/^\/(?:assets|portfolio-download|wp-content)\b/.test(target.pathname)&&!routes.has(normalize(target.pathname))){
        const key=normalize(target.pathname);let entry=unknown.get(key);
        if(!entry){entry={target:key,count:0,examples:[]};unknown.set(key,entry);}
        entry.count++;if(entry.examples.length<3)entry.examples.push({path,href});
      }
    }else{
      try{const url=new URL(href);if(/^https?:$/.test(url.protocol))data.externalPageHosts[url.hostname]=(data.externalPageHosts[url.hostname]||0)+1;}catch{/* Relative fragments and protocols remain native. */}
    }
  }
  data.pages.push({path,source:page.source||'https://imgmodels.com'+path,title:page.title||null,kind:page.kind||'img',bytes:Buffer.byteLength(html),
    headerCount:(html.match(/<(?:nav|header)\b[^>]*class=["'][^"']*\bheader\b/gi)||[]).length,
    footerCount:(html.match(/<footer\b/gi)||[]).length,captcha:/recaptcha|captchaHost/i.test(html),
    sha256:createHash('sha256').update(html).digest('hex')});
}
data.internalTargetsNotInventoried=[...unknown.values()].sort((a,b)=>b.count-a.count);
await writeFile(resolve(root,'docs/milestones/F01/qa/current-route-inventory.json'),JSON.stringify(data,null,2));
console.log(JSON.stringify({routes:data.captured,pending:data.pending,missingPages:data.missingPages,missingStyles:data.missingStyles,
  missingAssets:data.missingAssets,unknownTargets:data.internalTargetsNotInventoried,externalHosts:data.externalPageHosts},null,2));
