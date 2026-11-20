import {mkdir, writeFile} from 'node:fs/promises';

const origin = 'https://wmefashion.com';
const pages = ['terms-of-use', 'privacy-policy', 'cookies'];
const out = new URL('../shoot-frontend/data/legal/', import.meta.url);
const cssOut = new URL('../shoot-frontend/assets/legal/', import.meta.url);
const cssUrl = origin + '/wp-content/themes/wme-fashion/build-live/style-main.css?v=1.34';

async function publicText(url) {
  const response = await fetch(url, {signal: AbortSignal.timeout(45000)});
  if (!response.ok || new URL(response.url).origin !== origin) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

await mkdir(out, {recursive: true});
await mkdir(cssOut, {recursive: true});
let css = await publicText(cssUrl);
css = css.replace(/url\(\s*(['"]?)(?!data:|https?:|\/\/|#)([^'")]+)\1\s*\)/gi,
  (_match, _quote, path) => `url("${new URL(path.trim(), cssUrl)}")`);
await writeFile(new URL('wme-style.css', cssOut), css);

for (const slug of pages) {
  const source = `${origin}/${slug}/`;
  const raw = await publicText(source);
  const body = raw.match(/<body\b([^>]*)>([\s\S]*?)<\/body>/i);
  if (!body) throw new Error(`Missing body in ${source}`);
  const bodyClass = body[1].match(/\bclass=["']([^"']*)["']/i)?.[1] || '';
  const clean = body[2]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
  const title = raw.match(/<title>([^<]*)<\/title>/i)?.[1] || 'WME Fashion';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${origin}/"><title>${title}</title><link rel="stylesheet" href="/assets/legal/wme-style.css"></head><body class="${bodyClass}">${clean}</body></html>`;
  await writeFile(new URL(slug + '.html', out), html);
  console.log(`${source} -> ${slug}.html (${html.length} characters)`);
}
