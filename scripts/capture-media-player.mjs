import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const output=resolve(import.meta.dirname,'../shoot-frontend/assets/mediaelement');
await mkdir(output,{recursive:true});
const source='https://imgmodels.com/wp-includes/js/';
const resources=[
  ['jquery/jquery.min.js?ver=3.7.1','jquery.min.js'],
  ['mediaelement/mediaelement-and-player.min.js?ver=4.2.17','mediaelement-and-player.min.js'],
  ['mediaelement/mediaelement-migrate.min.js?ver=7.1.5','mediaelement-migrate.min.js'],
  ['mediaelement/mediaelementplayer-legacy.min.css?ver=4.2.17','mediaelementplayer-legacy.min.css'],
  ['mediaelement/wp-mediaelement.min.css?ver=7.1.5','wp-mediaelement.min.css'],
];
for(const [path,name]of resources){
  const url=source+path;const response=await fetch(url);if(!response.ok)throw Error(`${response.status}: ${url}`);
  let content=await response.text();
  if(name.endsWith('.css')){
    for(const match of [...content.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)]){
      if(match[1].startsWith('data:'))continue;
      const assetUrl=new URL(match[1],url);const file=assetUrl.pathname.split('/').at(-1);
      const asset=await fetch(assetUrl);if(!asset.ok)throw Error(`Missing player asset ${assetUrl}`);
      await writeFile(resolve(output,file),Buffer.from(await asset.arrayBuffer()));
      content=content.replaceAll(match[1],'/assets/mediaelement/'+file);
    }
  }
  await writeFile(resolve(output,name),content);
  console.log(name);
}
