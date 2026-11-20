import assetMap from '../data/asset-map.json' with { type: 'json' };
import { setupConsent } from './consent.mjs';

// Public presentation captured 20 November 2026. The original theme's public
// interactions use a local, read-only snapshot API, with no production writes.
const manifest = await fetch('/data/routes.json').then(r=>r.json());
const normalize = path => path.replace(/\/+$/, '') + '/';
const routes = new Map(Object.entries(manifest.routes));
routes.set('/directory/london/vanesa-lorenzo/', 'profile-vanesa-lorenzo');
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
      el.href = url.pathname + url.search + url.hash;
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
async function initializePage(root) {
  localizeTree(root);
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) {
      if (node.matches('[src]')) node.setAttribute('src', asset(node.getAttribute('src')));localizeTree(node);
    }
  }).observe(root, {childList:true,subtree:true});
  window.WP_SETTINGS = {
    rest_nonce: '', isLoggedIn: '', transientsDateTime: 'f01-reference-2026-11-20', hideDirectory: '',
    directoryUnderConstructionMessage: 'The directory will be fully operational within the next 24 hours.',
    directoryBoardOverrides: [], hiddenDirectoryCategoriesByTerritory: [], directoryCategoriesCacheKey: 'f01-2026-11-20',
    searchCategories: {model:'Model',development:'Development',talent:'Talent'},
    directoryIncludeFeatured: {'new-york':false,'los-angeles':false,paris:true,sydney:true,london:true,milan:true},
  };

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

await loadScript('/assets/original/react.min.js');
await loadScript('/assets/original/react-dom.min.js');
await loadScript('/assets/original/remix-router.js');
await loadScript('/assets/original/react-router.js');
await loadScript('/assets/original/react-router-dom.js');
const {createElement:h,useState,useEffect,useRef}=window.React;
const {BrowserRouter,Routes,Route,useLocation,Link}=window.ReactRouterDOM;
function ReferencePage(){
 const location=useLocation(),root=useRef(null),[page,setPage]=useState(null),[error,setError]=useState('');
 const slug=routes.get(normalize(location.pathname));
 useEffect(()=>{
  let active=true;
  const source=slug?'/data/pages/'+slug+'.json':'/api/reference-page?path='+encodeURIComponent(normalize(location.pathname));
  fetch(source).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.message||'The captured page is unavailable.');return data}).then(p=>{if(active)setPage(p)}).catch(e=>{if(active)setError(e.message)});
  return()=>{active=false};
 },[slug]);
 useEffect(()=>{if(page&&root.current){document.body.className=page.bodyClass;initializePage(root.current).catch(e=>setError(e.message));}},[page]);
 if(error)return h('main',{style:{padding:'60px 30px'}},h('h1',null,'Page capture unavailable'),h('p',null,error),h(Link,{to:'/',reloadDocument:true},'Return home'));
 return h('div',{ref:root,className:'reference-page',dangerouslySetInnerHTML:{__html:page?.html||''}});
}
// React Router resolves all captured paths, including deep links and refreshes.
// Document navigation reinitializes the original theme's global page lifecycle.
const patterns=['/','/directory','/directory/:territory/:talent/*','/work/:slug/*','/from-the-archive/*','/category/*','/talent-category/*','/author/*','/:page','*'];
window.ReactDOM.createRoot(document.getElementById('app')).render(h(BrowserRouter,null,h(Routes,null,...patterns.map(path=>h(Route,{key:path,path,element:h(ReferencePage)})))));
