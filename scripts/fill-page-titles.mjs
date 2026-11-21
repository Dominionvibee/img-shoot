import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../shoot-frontend');
const manifest=JSON.parse(await readFile(resolve(root,'data/routes.json'),'utf8'));
const paths=new Map(Object.entries(manifest.routes).map(([path,slug])=>[slug,path]));
paths.set('profile-vanesa-lorenzo','/directory/london/vanesa-lorenzo/');
const entities={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',ndash:'–',mdash:'—',hellip:'…'};
const decode=text=>text.replace(/&(?:#(\d+)|#x([a-f\d]+)|(\w+));/gi,(match,decimal,hex,name)=>{
  const code=decimal?Number(decimal):hex?parseInt(hex,16):null;
  return code!==null?(code<=0x10ffff?String.fromCodePoint(code):match):(entities[name]??match);
}).trim();
const pending=[],failures=[];
let normalized=0,captured=0,cursor=0,stopped=false;
for(const file of await readdir(resolve(root,'data/pages'))){
  const page=JSON.parse(await readFile(resolve(root,'data/pages',file),'utf8'));
  if(page.kind)continue;
  if(page.title){const title=decode(page.title);if(title!==page.title){page.title=title;await writeFile(resolve(root,'data/pages',file),JSON.stringify(page));normalized++;}continue;}
  const path=paths.get(file.replace(/\.json$/,''));
  if(path)pending.push({file,path});
}
async function worker(){
  while(cursor<pending.length&&!stopped){
    const {file,path}=pending[cursor++];
    await new Promise(resolve=>setTimeout(resolve,500));
    try{
      const response=await fetch('https://imgmodels.com'+path,{signal:AbortSignal.timeout(30000)});
      if(response.status===429){stopped=true;throw Error('HTTP429: reference capture stopped');}
      const html=await response.text();const title=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
      if(!title)throw Error('No source title');
      const page=JSON.parse(await readFile(resolve(root,'data/pages',file),'utf8'));
      page.title=decode(title);
      await writeFile(resolve(root,'data/pages',file),JSON.stringify(page));
      captured++;if(captured%100===0)console.log(`${captured}/${pending.length} source titles`);
    }catch(error){failures.push({path,error:error.message});}
  }
}
await Promise.all([worker(),worker()]);
const summary={capturedAt:new Date().toISOString(),requested:pending.length,captured,normalized,stopped,failures};
await writeFile(resolve(root,'docs/milestones/F01/qa/page-titles.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary));
