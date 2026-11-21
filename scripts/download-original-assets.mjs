import { readFile, writeFile, mkdir, stat, readdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const html = (await Promise.all(['reference-home.html', 'reference/new-york-state-fashion-workers-act.html', 'reference/from-the-archive.html', 'reference/profile-vanesa-lorenzo.html'].map(path=>readFile(resolve(root,path),'utf8').catch(()=>'')))).join('\n');
const css = await readFile(resolve(root, 'reference/original.css'), 'utf8');
const media = [...html.matchAll(/https:\/\/[^\s"'<>]+\.(?:jpe?g|png|webp|gif|mp4|woff2?)(?:\?[^\s"'<>]*)?/gi)].map(x=>x[0].replaceAll('&amp;', '&'));
const cssAssets = [...css.matchAll(/url\(([^)]+)\)/g)].map(x=>x[1].trim().replace(/^['"]|['"]$/g, '')).filter(x=>!x.startsWith('data:')).map(x=>new URL(x, 'https://imgmodels.com/wp-content/themes/img-models/build/').href);
const talent=JSON.parse((await readFile(resolve(root,'shoot-frontend/data/talent.json'),'utf8')).trim()).entries;
const thumbnails=talent.slice().sort((a,b)=>a.name.localeCompare(b.name)).slice(0,40).map(x=>typeof x.thumbnail==='string'?x.thumbnail:x.thumbnail?.source).filter(Boolean);
const vendors=[...html.matchAll(/src=['"](https:\/\/[^'"\s]+\/react(?:-dom)?\.min\.js[^'"\s]*)['"]/g)].map(x=>x[1]);
const apiDir=resolve(root,'shoot-frontend/data/reference-api');
const apiFiles=(await readdir(apiDir)).filter(x=>/^(?:featured-work|work)-.+\.json$/.test(x));
const apiStrings=[];
function strings(value) {if(typeof value==='string') apiStrings.push(value);else if(Array.isArray(value))value.forEach(strings);else if(value && typeof value==='object')Object.values(value).forEach(strings);}
for(const file of apiFiles) strings(JSON.parse((await readFile(resolve(apiDir,file),'utf8')).trim()));
const apiMedia=apiStrings.flatMap(text=>[...text.matchAll(/https:\/\/[^\s"'<>]+\.(?:jpe?g|png|webp|gif|mp4|woff2?)(?:\?[^\s"'<>]*)?/gi)].map(x=>x[0].replaceAll('&amp;', '&')));
const urls = [...new Set([...cssAssets, ...media, ...thumbnails, ...vendors, ...apiMedia])].sort((a,b)=>(/woff|2026_VMAG_OCT7|VXCC-2/.test(b)?1:0)-(/woff|2026_VMAG_OCT7|VXCC-2/.test(a)?1:0));
const dir = resolve(root, 'shoot-frontend/assets/original');
await mkdir(dir, {recursive:true});
const mapping = JSON.parse(await readFile(resolve(root,'shoot-frontend/data/asset-map.json'),'utf8').catch(()=>'{}')), failures = [];
let cursor=0, bytes=0;
async function worker() {
  while (cursor < urls.length) {
    const url=urls[cursor++];
    const name=decodeURIComponent(basename(new URL(url).pathname));
    const path=resolve(dir,name);
    try {
      let size=await stat(path).then(x=>x.size).catch(()=>0);
      if (!size) {
        const response=await fetch(url,{signal:AbortSignal.timeout(90000)});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const length=Number(response.headers.get('content-length')||0);
        if(length>70000000){await response.body.cancel();throw new Error(`Asset exceeds 70 MB (${length} bytes); skipped for review`);}
        const data=Buffer.from(await response.arrayBuffer());
        if(data.length>70000000)throw new Error(`Asset exceeds 70 MB (${data.length} bytes); skipped for review`);
        await writeFile(path,data);size=data.length;
      }
      mapping[url]=`/assets/original/${name}`;bytes+=size;
      if(!mapping[url])console.log(`OK ${name} ${size}`);
    } catch(error) { failures.push({url,error:error.message});console.log(`FAIL ${url} ${error.message}`); }
  }
}
await Promise.all(Array.from({length:6},worker));
await writeFile(resolve(root,'shoot-frontend/data/asset-map.json'),JSON.stringify(mapping,null,2)+'\n');
await writeFile(resolve(root,'reference/asset-download-results.json'),JSON.stringify({total:urls.length,downloaded:Object.keys(mapping).length,bytes,failures},null,2)+'\n');
console.log(JSON.stringify({total:urls.length,downloaded:Object.keys(mapping).length,bytes,failures}));
