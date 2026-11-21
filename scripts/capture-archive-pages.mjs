import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const folder = resolve(root, 'shoot-frontend/data/pages');
const referenceFolder = resolve(root, 'reference');
await mkdir(folder, {recursive: true});
await mkdir(referenceFolder, {recursive: true});
const clean = html => html.replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
const pages = Array.from({length: 28}, (_, index) => index + 2);
const results = [];
let cursor = 0;

function verify(page, template) {
  if (!template.bodyClass.includes('page-from-the-archive')) throw new Error(`Page ${page}: wrong body class`);
  if (/<(?:script|noscript)\b|<!--/i.test(template.html)) throw new Error(`Page ${page}: executable or comment markup remains`);
  const pagination = template.html.match(/class="workGrid__paginationStatus">\s*(\d+)\s+of\s+(\d+)\s*</);
  if (!pagination || Number(pagination[1]) !== page || Number(pagination[2]) !== 29) throw new Error(`Page ${page}: incorrect pagination`);
  const workIds = [...template.html.matchAll(/data-featured-work="(\d+)"/g)].map(match => match[1]);
  if (!workIds.length) throw new Error(`Page ${page}: no captured archive cards`);
  return {page, source: `https://imgmodels.com/from-the-archive/page/${page}/`, cards: workIds.length,
    workIds, bytes: Buffer.byteLength(JSON.stringify(template)), scriptFree: true};
}

async function worker() {
  while (cursor < pages.length) {
    const page = pages[cursor++];
    let template;
    if (process.argv.includes('--verify-only')) {
      template = JSON.parse(await readFile(resolve(folder, `archive-${page}.json`), 'utf8'));
    } else {
      const url = `https://imgmodels.com/from-the-archive/page/${page}/`;
      let raw;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch(url, {signal: AbortSignal.timeout(30000)});
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          raw = await response.text();
          break;
        } catch (error) {
          if (attempt === 1) throw new Error(`Page ${page}: ${error.message}`);
        }
      }
      const body = raw.match(/<body\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/body>/i);
      if (!body) throw new Error(`Page ${page}: missing reference body`);
      template = {bodyClass: body[1], html: clean(body[2])};
      verify(page, template);
      await writeFile(resolve(referenceFolder, `archive-${page}.html`), raw);
      await writeFile(resolve(folder, `archive-${page}.json`), JSON.stringify(template));
    }
    const result = verify(page, template);
    results.push(result);
    console.log(`archive-${page}: ${result.cards} original cards, script-free, pagination ${page}/29`);
  }
}

await Promise.all(Array.from({length: 6}, worker));
results.sort((a, b) => a.page - b.page);
const summary = {capturedAt: '2026-11-20', verified: results.length, totalCards: results.reduce((sum, page) => sum + page.cards, 0), pages: results};
await writeFile(resolve(referenceFolder, 'archive-capture-results.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({verified: summary.verified, totalCards: summary.totalCards}));
