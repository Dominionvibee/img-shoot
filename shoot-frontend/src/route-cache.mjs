import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
const data=new URL('../data/',import.meta.url);
const read=async path=>JSON.parse(await readFile(new URL(path,data),'utf8'));
let blockedUntil=0;
async function publicGet(path){
 if(Date.now()<blockedUntil)throw Object.assign(new Error('The reference website is limiting requests. Please retry later.'),{status:503});
 const response=await fetch('https://imgmodels.com'+path,{signal:AbortSignal.timeout(45000),redirect:'follow'});
 if(new URL(response.url).origin!=='https://imgmodels.com')throw Object.assign(new Error('The reference redirected outside this site.'),{status:502});
 if(response.status===429){blockedUntil=Date.now()+60000;throw Object.assign(new Error('The reference website is limiting requests. Please retry later.'),{status:503});}
 if(!response.ok)throw Object.assign(new Error('Reference returned HTTP '+response.status),{status:response.status===404?404:502});
 return response;
}
export async function handleRouteCache(req,res){
 const url=new URL(req.url,'http://localhost');
 const page=url.pathname==='/api/reference-page';
 const gallery=url.pathname==='/wp-json/wme/v1/get_single_work';
 const pdf=url.pathname==='/portfolio-download';
 if(!page&&!gallery&&!pdf)return false;
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return true;}
 try{
  let value;
  if(pdf){
   if(!/^\d+$/.test(url.searchParams.get('model_id')||'')||!/^\d+$/.test(url.searchParams.get('model_picture_category_id')||'')||!/^[\w-]+$/.test(url.searchParams.get('filename')||''))throw Object.assign(new Error('Invalid portfolio request'),{status:400});
   const response=await publicGet(url.pathname+url.search);
   if(!response.headers.get('content-type')?.includes('pdf'))throw new Error('The reference did not return a portfolio PDF');
   res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${url.searchParams.get('filename')}.pdf"`});
   if(req.method==='HEAD')res.end();else Readable.fromWeb(response.body).pipe(res);return true;
  }
  if(page){
   const path=(url.searchParams.get('path')||'/').replace(/\/+$/,'')+'/';
   const manifest=await read('routes.json');
   if(manifest.routes[path])value=await read('pages/'+manifest.routes[path]+'.json');
   else{
    if(!manifest.discoveredRoutes?.includes(path))throw Object.assign(new Error('Page not found'),{status:404});
    const slug='route-'+createHash('sha256').update(path).digest('hex').slice(0,20);
    const cached=await read('pages/'+slug+'.json').catch(()=>null);
    const raw=cached?null:await(await publicGet(path)).text(),body=raw?.match(/<body\b[^>]*class=["']([^"']*)["'][^>]*>([\s\S]*?)<\/body>/i);
    if(cached)value=cached;
    else{
    if(!body)throw new Error('No public page body was returned');
    value={bodyClass:body[1],source:'https://imgmodels.com'+path,html:body[2].replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,'')};
    await mkdir(new URL('pages/',data),{recursive:true});await writeFile(new URL('pages/'+slug+'.json',data),JSON.stringify(value));
    }
    // The crawler owns the manifest; this deterministic cache needs no concurrent manifest write.
   }
  }else{
   const featured=url.searchParams.get('featured-work-id'),id=featured||url.searchParams.get('work-id');
   if(!/^\d+$/.test(id||''))return false;
   const filename=`reference-api/${featured?'featured-work':'work'}-${id}.json`;
   if(await read(filename).catch(()=>null))return false;
   value=await(await publicGet('/wp-json/wme/v1/get_single_work?'+(featured?'featured-work-id=':'work-id=')+id)).json();
   if(!Array.isArray(value)||!value.length)return false;
   await writeFile(new URL(filename,data),JSON.stringify(value));
   return false;
  }
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','X-Data-Source':'public-reference-cache'});res.end(req.method==='HEAD'?undefined:JSON.stringify(value));
 }catch(error){res.writeHead(error.status||502,{'Content-Type':'application/json; charset=utf-8','Retry-After':'60'});res.end(JSON.stringify({message:error.message}));}
 return true;
}
