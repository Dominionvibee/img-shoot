import assetMap from '../data/asset-map.json' with { type: 'json' };
import { setupConsent } from './consent.mjs';

// Public presentation captured 20 November 2026. The original theme's public
// interactions use a local, read-only snapshot API, with no production writes.
const path = location.pathname.replace(/\/+$/, '') || '/';
const routes = new Map([
  ['/', 'home'], ['/directory', 'directory'], ['/search', 'search'],
  ['/from-the-archive', 'from-the-archive'], ['/contact', 'contact'],
  ['/about-us', 'about-us'], ['/recruitmentwarning', 'recruitmentwarning'],
  ['/under-18-faq', 'under-18-faq'],
  ['/new-york-state-fashion-workers-act', 'new-york-state-fashion-workers-act'],
  ['/directory/london/vanesa-lorenzo', 'profile-vanesa-lorenzo'],
]);
const archivePage = Number(path.match(/^\/from-the-archive\/page\/(\d+)$/)?.[1] || 1);
const slug = routes.get(path) || (archivePage > 1 && archivePage <= 29 ? `archive-${archivePage}` : null);
const asset = url => assetMap[url] || url;
function localizeTree(root) {
  root.querySelectorAll('[src], [data-banner-src], [poster]').forEach(el => {
    for (const name of ['src', 'data-banner-src', 'poster']) if (el.hasAttribute(name)) el.setAttribute(name, asset(el.getAttribute(name)));
  });
  root.querySelectorAll('a[href]').forEach(el => {
    const href = el.getAttribute('href');
    if(assetMap[href]){el.href=assetMap[href];return;}
    if (href?.startsWith('https://imgmodels.com')) {
      const url = new URL(href);
      if (routes.has(url.pathname.replace(/\/+$/, '') || '/') || /^\/from-the-archive\//.test(url.pathname)) el.href = url.pathname + url.search + url.hash;
    }
  });
}
function localizeData(value) {
  if (typeof value === 'string') return asset(value);
  if (Array.isArray(value)) return value.map(localizeData);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,localizeData(v)]));
  return value;
}
async function loadScript(src) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');script.src = src;
    script.onload = resolve;script.onerror = () => reject(new Error(`Unable to load ${src}`));document.head.append(script);
  });
}
if (!slug) {
  document.querySelector('#app').innerHTML = '<main style="padding:40px"><h1>Page not found</h1><a href="/">Return home</a></main>';
} else {
  const template = await fetch(`/data/pages/${slug}.json`).then(r=>r.json());
  document.body.className = template.bodyClass;document.body.innerHTML = template.html;localizeTree(document.body);
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) {
      if (node.matches('[src]')) node.setAttribute('src', asset(node.getAttribute('src')));localizeTree(node);
    }
  }).observe(document.body, { childList: true, subtree: true });
  window.WP_SETTINGS = {
    rest_nonce: '', isLoggedIn: '', transientsDateTime: 'f01-reference-2026-11-20', hideDirectory: '',
    directoryUnderConstructionMessage: 'The directory will be fully operational within the next 24 hours.',
    directoryBoardOverrides: [], hiddenDirectoryCategoriesByTerritory: [], directoryCategoriesCacheKey: 'f01-2026-11-20',
    searchCategories: {model:'Model',development:'Development',talent:'Talent'},
    directoryIncludeFeatured: {'new-york':false,'los-angeles':false,paris:true,sydney:true,london:true,milan:true},
  };
  await loadScript('/assets/original/react.min.js');await loadScript('/assets/original/react-dom.min.js');
  window.wp = {
    element: {...window.React, ...window.ReactDOM},
    apiFetch: async ({path: apiPath, signal}) => {
      const response = await fetch(`/wp-json/${apiPath}`, {signal});
      if (!response.ok) throw new Error('The local reference snapshot is unavailable.');
      return localizeData(await response.json());
    },
  };
  await loadScript('/assets/original/theme.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await setupConsent();
}
