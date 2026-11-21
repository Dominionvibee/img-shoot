import {mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const origin = 'https://wmefashion.com';
const pages = ['terms-of-use', 'privacy-policy', 'cookies', 'the-incubator-terms'];
const out = new URL('../shoot-frontend/data/legal/', import.meta.url);
const cssOut = new URL('../shoot-frontend/assets/legal/', import.meta.url);
const pageOut = new URL('../shoot-frontend/data/pages/', import.meta.url);
const cssUrl = origin + '/wp-content/themes/wme-fashion/build-live/style-main.css?v=1.34';

async function publicText(url) {
  const response = await fetch(url, {signal: AbortSignal.timeout(45000)});
  if (!response.ok || new URL(response.url).origin !== origin) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

await mkdir(out, {recursive: true});
await mkdir(cssOut, {recursive: true});
const assets=new Map();
async function localAsset(url) {
  if(!/^https?:/.test(url))return url;
  if(assets.has(url))return assets.get(url);
  const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw new Error(`Asset HTTP ${response.status}: ${url}`);
  const type=response.headers.get('content-type')||'';
  const ext=type.includes('woff2')?'woff2':type.includes('woff')?'woff':new URL(url).pathname.split('.').at(-1).match(/^\w{2,5}$/)?.[0]||'bin';
  const file=createHash('sha256').update(url).digest('hex').slice(0,16)+'.'+ext;
  await writeFile(new URL(file,cssOut),Buffer.from(await response.arrayBuffer()));
  const local='/assets/legal/'+file;assets.set(url,local);return local;
}
let css = await publicText(cssUrl);
css = css.replace(/url\(\s*(['"]?)(?!data:|https?:|\/\/|#)([^'")]+)\1\s*\)/gi,
  (_match, _quote, path) => `url("${new URL(path.trim(), cssUrl)}")`);
for(const match of [...css.matchAll(/url\(["']?(https?:[^)'"\s]+)["']?\)/g)]) {
  const local=await localAsset(match[1]);css=css.replaceAll(match[1],local);
}
await writeFile(new URL('wme-style.css', cssOut), css);

for (const slug of pages) {
  const source = `${origin}/${slug}/`;
  const raw = await publicText(source);
  const body = raw.match(/<body\b([^>]*)>([\s\S]*?)<\/body>/i);
  if (!body) throw new Error(`Missing body in ${source}`);
  const bodyClass = body[1].match(/\bclass=["']([^"']*)["']/i)?.[1] || '';
  let clean = body[2]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
  clean=clean.replace(/<a\b[^>]*>\s*WME\s+Fashion\s+Incubator\s*<\/a>/gi,
    '<span class="wme-incubator-text">WME Fashion Incubator</span>');
  clean=clean.replace(/\b(href|src|poster)=(['"])(\/(?!\/)[^'"]*)\2/gi,(_m,attr,q,path)=>`${attr}=${q}${origin}${path}${q}`);
  for(const match of [...clean.matchAll(/\b(?:src|poster)=["'](https?:[^"']+)["']/g)]) {
    const local=await localAsset(match[1]);clean=clean.replaceAll(match[1],local);
  }
  const title = raw.match(/<title>([^<]*)<\/title>/i)?.[1] || 'WME Fashion';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${origin}/"><title>${title}</title><link rel="stylesheet" href="/assets/legal/wme-style.css"></head><body class="${bodyClass}">${clean}</body></html>`;
  await writeFile(new URL(slug + '.html', out), html);
  await writeFile(new URL('legal-'+slug+'.json',pageOut),JSON.stringify({source,title,kind:'legal',bodyClass:'f01-legal '+bodyClass,styles:['/assets/legal/consent.css','/assets/legal/wme-style.css','/src/local-pages.css'],html:clean}));
  console.log(`${source} -> ${slug}.html (${html.length} characters)`);
}
