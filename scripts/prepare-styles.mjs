import {readFile, writeFile} from 'node:fs/promises';
const map=JSON.parse(await readFile('shoot-frontend/data/asset-map.json','utf8'));
let css=await readFile('reference/original.css','utf8');
css=css.replace(/url\(([^)]+)\)/g,(whole,quoted)=>{
 const raw=quoted.replace(/["']/g,'');if(raw.startsWith('data:'))return whole;
 const absolute=new URL(raw,'https://imgmodels.com/wp-content/themes/img-models/build/').href;
 return `url(${JSON.stringify(map[absolute]||absolute)})`;
});
await writeFile('shoot-frontend/src/reference.css',css);
