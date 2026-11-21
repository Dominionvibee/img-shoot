import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const frontend=resolve(root,'shoot-frontend');
const clean=html=>html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,'');
await mkdir(resolve(frontend,'data/pages'),{recursive:true});
const slugs=['home','directory','search','from-the-archive','contact','about-us','recruitmentwarning','under-18-faq','new-york-state-fashion-workers-act','profile-vanesa-lorenzo'];
for(const slug of slugs){
 const raw=await readFile(resolve(root,slug==='home'?'reference-home.html':`reference/${slug}.html`),'utf8');
 const body=raw.match(/<body\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/body>/i);
 if(!body)throw new Error(`Missing reference body: ${slug}`);
 const result={bodyClass:body[1],html:clean(body[2])};
 await writeFile(resolve(frontend,`data/pages/${slug}.json`),JSON.stringify(result));
}
await copyFile(resolve(root,'reference/original.css'),resolve(frontend,'src/reference.css'));
await copyFile(resolve(root,'reference/original.js'),resolve(frontend,'assets/original/theme.js'));
await copyFile(resolve(root,'reference/cookie.css'),resolve(frontend,'src/cookie.css'));
await writeFile(resolve(frontend,'data/pages/cookie.json'),JSON.stringify({html:clean(await readFile(resolve(root,'reference/cookie.html'),'utf8'))}));
console.log(`Imported ${slugs.length} original public page templates, original theme and consent markup.`);
