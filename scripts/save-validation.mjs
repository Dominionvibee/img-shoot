import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const records=[];
for(const item of await json('reference/qa/pixel-summary.json'))records.push({route:'/',width:item.width,mae:item.mean_absolute_channel_error});
for(const item of await json('reference/qa/pages/pixel-summary.json'))records.push({route:'/'+item.route+'/',width:item.width,mae:item.mean_absolute_channel_error});
for(const item of await json('reference/qa/responsive-content/pixel-summary.json'))records.push({route:'/'+item.route+'/',width:item.width,mae:item.mean_absolute_channel_error});
for(const item of await json('reference/qa/responsive-directory/pixel-summary.json'))records.push({route:'/'+item.route+'/',width:item.width,mae:item.meanAbsoluteChannelError});
for(const item of (await json('reference/qa/responsive-media/summary.json')).pairs)records.push({route:'/'+item.route+'/',width:item.width,mae:item.maeRGB0to255});
// Superseded initial mobile captures were repeated after metadata loaded. The
// directory's initial session-state difference was also repeated in fresh tabs.
const {execFileSync}=await import('node:child_process');
const compare=(a,b)=>Number(execFileSync('python',['-c',`from PIL import Image,ImageChops,ImageStat;d=ImageChops.difference(Image.open(${JSON.stringify(a)}).convert('RGB'),Image.open(${JSON.stringify(b)}).convert('RGB'));print(sum(ImageStat.Stat(d).mean)/3)`],{encoding:'utf8'}).trim());
for(const route of ['new-york-state-fashion-workers-act','from-the-archive','directory/london/vanesa-lorenzo']){
 const name=route.replaceAll('/','-')+'-390.png';records.find(r=>r.route==='/'+route+'/'&&r.width===390).mae=compare('reference/qa/pages/reference-'+name,'reference/qa/pages/local-'+name);
}
records.find(r=>r.route==='/directory/'&&r.width===390).mae=compare('reference/directory-stable-reference.png','reference/directory-stable-local.png');
const consent=[390,1440].map(width=>({width,mae:compare(`reference/qa/consent-layout/reference-${width}.png`,`reference/qa/consent-layout/local-${width}.png`)}));
const folder='shoot-frontend/docs/milestones/F01/qa';await mkdir(folder,{recursive:true});
await writeFile(folder+'/viewport-comparison.json',JSON.stringify({capturedOn:'2026-11-20',reference:'https://imgmodels.com/',browser:'Installed Chrome, headless, Windows',viewportHeight:900,deviceScaleFactor:1,method:'Viewport PNGs compared with Pillow mean absolute RGB channel error (0–255); videos paused at time 0 where applicable. Initial unready media captures were superseded after metadata loaded.',pairs:records.length,exact:records.filter(r=>r.mae===0).length,maxMAE:Math.max(...records.map(r=>r.mae)),records,consent},null,2));
await writeFile(folder+'/interaction-results.json',JSON.stringify(await json('reference/qa/final-smoke.json'),null,2));
for(const [source,destination]of[
 ['reference/qa/reference-1440.png','home-reference-desktop.png'],['reference/qa/local-1440.png','home-local-desktop.png'],
 ['reference/qa/reference-390.png','home-reference-mobile.png'],['reference/qa/local-390.png','home-local-mobile.png'],
 ['reference/qa/consent-layout/reference-1440.png','consent-reference-desktop.png'],['reference/qa/consent-layout/local-1440.png','consent-local-desktop.png'],
])await copyFile(source,folder+'/'+destination);
console.log(JSON.stringify({comparisons:records.length,exact:records.filter(r=>r.mae===0).length,maxMAE:Math.max(...records.map(r=>r.mae)),consent}));
