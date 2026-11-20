import assetMap from '../data/asset-map.json' with { type: 'json' };
import { setupConsent } from './consent.mjs';

// Public presentation captured 20 November 2026. The original theme's public
// interactions use a local, read-only snapshot API, with no production writes.
const manifest = await fetch('/data/routes.json').then(r=>r.json());
const normalize = path => path.replace(/\/+$/, '') + '/';
const routes = new Map(Object.entries(manifest.routes));
// F01 uses /home as its canonical landing URL while keeping the captured
// homepage content shared with the site's root route.
routes.set('/home/', routes.get('/') || 'home');
routes.set('/directory/london/vanesa-lorenzo/', 'profile-vanesa-lorenzo');
const asset = url => assetMap[url] || url;
const partnerRoutes = new Map([
  ['https://wmefashion.com/terms-of-use/', '/legal/terms-of-use/'],
  ['https://wmefashion.com/privacy-policy/', '/legal/privacy-policy/'],
  ['https://wmefashion.com/cookies/', '/legal/cookies/'],
]);
const scoutingOrigin = 'https://getscouted.imgmodels.com';
const privacyForm = 'https://privacyportal.onetrust.com/webform/889c435d-64b4-46d8-ad05-06332fe1d097/db459d3a-bffa-4cb2-a6fd-0daa31651507?website=imgmodels.com';
const legalPages = new Map([
  ['/legal/terms-of-use/', {title: 'Terms of Use', src: '/data/legal/terms-of-use.html'}],
  ['/legal/privacy-policy/', {title: 'Privacy Policy', src: '/data/legal/privacy-policy.html'}],
  ['/legal/cookies/', {title: 'Cookie Policy', src: '/data/legal/cookies.html'}],
]);
function localHref(href) {
  if (!href || href.startsWith('#')) return null;
  if (assetMap[href]) return assetMap[href];
  let url;
  try { url = new URL(href, window.location.href); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  if (url.origin === window.location.origin || ['imgmodels.com', 'www.imgmodels.com'].includes(url.hostname)) {
    return (url.pathname === '/' ? '/home' : url.pathname) + url.search + url.hash;
  }
  if (url.origin === scoutingOrigin) return '/get-scouted/' + (url.pathname === '/' ? '' : url.pathname.replace(/^\/+/, '')) + url.search + url.hash;
  if (url.origin === new URL(privacyForm).origin && url.pathname === new URL(privacyForm).pathname) return '/do-not-sell-my-personal-info/';
  return partnerRoutes.get(url.origin + url.pathname) || null;
}
function localizeTree(root) {
  const media = root.matches?.('[src], [data-banner-src], [poster], [data-href]') ? [root] : [];
  media.push(...root.querySelectorAll('[src], [data-banner-src], [poster], [data-href]'));
  for (const el of media) {
    for (const name of ['src', 'data-banner-src', 'poster']) if (el.hasAttribute(name)) el.setAttribute(name, asset(el.getAttribute(name)));
    if (el.hasAttribute('data-href')) el.setAttribute('data-href', localHref(el.getAttribute('data-href')) || el.getAttribute('data-href'));
  }
  const anchors = root.matches?.('a[href]') ? [root] : [];
  anchors.push(...root.querySelectorAll('a[href]'));
  for (const el of anchors) {
    const href = localHref(el.getAttribute('href'));
    if (href) el.setAttribute('href', href);
  }
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
// The original bundle assigns window.location for search, filters, and banners.
// Redirect those assignments through the React router without changing its UI.
async function loadThemeScript() {
  const response = await fetch('/assets/original/theme.js');
  if (!response.ok) throw new Error('Unable to load the captured theme');
  let source = await response.text();
  source = source.replaceAll('window.location="/search/"', 'window.F01Navigate("/search/")');
  source = source.replace('window.location.href=i?"/?featured-work-id="+e:"/?work-id="+e', 'window.F01Navigate(i?"/?featured-work-id="+e:"/?work-id="+e)');
  source = source.replace('window.location.href=n.toString()', 'window.F01Navigate(n.toString())');
  source = source.replaceAll('window.location.href=e.dataset.href', 'window.F01Navigate(e.dataset.href)');
  const listeners=[];
  const intervals=[];
  const add=EventTarget.prototype.addEventListener;
  const setIntervalOriginal=window.setInterval;
  EventTarget.prototype.addEventListener=function(...args){
    if(this===window||this===document||this===document.body)listeners.push([this,args]);
    return add.apply(this,args);
  };
  window.setInterval=function(...args){
    const id=setIntervalOriginal.apply(this,args);
    intervals.push(id);
    return id;
  };
  const script = document.createElement('script');
  script.textContent = source + '\n//# sourceURL=/assets/original/theme-routed.js';
  try {
    document.head.append(script);
    script.remove();
    document.dispatchEvent(new Event('DOMContentLoaded'));
  } finally {
    EventTarget.prototype.addEventListener=add;
    window.setInterval=setIntervalOriginal;
  }
  return ()=>{
    for(const [target,args] of listeners)target.removeEventListener(...args);
    for(const id of intervals)window.clearInterval(id);
  };
}
async function initializePage(root) {
  localizeTree(root);
  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) {
      localizeTree(node);
    }
  });
  observer.observe(root, {childList:true,subtree:true});
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
  const disposeTheme=await loadThemeScript();
  await setupConsent();
  return () => {observer.disconnect();disposeTheme();};
}

await loadScript('/assets/original/react.min.js');
await loadScript('/assets/original/react-dom.min.js');
await loadScript('/assets/original/remix-router.js');
await loadScript('/assets/original/react-router.js');
await loadScript('/assets/original/react-router-dom.js');
const {createElement:h,useState,useEffect,useRef}=window.React;
const {BrowserRouter,Routes,Route,useLocation,useNavigate,Link,Navigate}=window.ReactRouterDOM;

function useLocalNavigation() {
  const navigate=useNavigate();
  useEffect(()=>{
    const route=input=>{
      const target=localHref(String(input));
      if(target)navigate(target);
      else window.location.assign(String(input));
    };
    window.F01Navigate=route;
    const onClick=event=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const anchor=event.target.closest?.('a[href]');
      if(!anchor||anchor.hasAttribute('download')||(anchor.target&&anchor.target!=='_self'))return;
      const href=anchor.getAttribute('href');
      if(!href||href.startsWith('#'))return;
      const target=localHref(href);
      if(!target||target.startsWith('/assets/')||target.startsWith('/portfolio-download'))return;
      event.preventDefault();
      if(target!==window.location.pathname+window.location.search+window.location.hash)navigate(target);
    };
    document.addEventListener('click',onClick);
    return()=>{
      document.removeEventListener('click',onClick);
      if(window.F01Navigate===route)delete window.F01Navigate;
    };
  },[navigate]);
}

function HomeRedirect(){
  const location=useLocation();
  return h(Navigate,{to:{pathname:'/home',search:location.search,hash:location.hash},replace:true});
}

function ExternalPage({title,src,allowInnerLinks=false}){
  const frame=useRef(null),navigate=useNavigate();
  useLocalNavigation();
  useEffect(()=>{document.title=title+' - IMG Models';document.body.className='f01-external-body';},[title]);
  const onLoad=()=>{
    if(!allowInnerLinks)return;
    try{
      frame.current.contentDocument.addEventListener('click',event=>{
        const anchor=event.target.closest?.('a[href]');
        if(!anchor||event.defaultPrevented||event.button!==0)return;
        const target=localHref(anchor.href);
        if(!target)return;
        event.preventDefault();
        navigate(target);
      });
    }catch{/* Live partner frames are cross-origin. */}
  };
  return h('main',{className:'f01-external-page'},
    h('a',{className:'f01-external-return',href:'/home'},'← IMG Models'),
    h('iframe',{ref:frame,src,title,onLoad,className:'f01-external-frame'}));
}

function ReferencePage(){
 const location=useLocation(),root=useRef(null),[loaded,setLoaded]=useState(null),[error,setError]=useState('');
 const slug=routes.get(normalize(location.pathname));
 const page=loaded?.path===location.pathname?loaded.value:null;
 useLocalNavigation();
 useEffect(()=>{
  let active=true;
  setLoaded(null);setError('');
  const source=slug?'/data/pages/'+slug+'.json':'/api/reference-page?path='+encodeURIComponent(normalize(location.pathname));
  fetch(source).then(async response=>{
    const data=await response.json();
    if(!response.ok)throw new Error(data.message||'The captured page is unavailable.');
    return data;
  }).then(value=>{if(active)setLoaded({path:location.pathname,value})})
    .catch(cause=>{if(active)setError(cause.message)});
  return()=>{active=false};
 },[location.pathname,slug]);
 useEffect(()=>{
  if(!page||!root.current)return;
  let cancelled=false,dispose;
  document.body.className=page.bodyClass;
  document.title='IMG Models';
  initializePage(root.current).then(cleanup=>{
    if(cancelled)cleanup();else dispose=cleanup;
  }).catch(cause=>{if(!cancelled)setError(cause.message)});
  if(location.hash)document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  else window.scrollTo(0,0);
  return()=>{cancelled=true;dispose?.()};
 },[page]);
 if(error)return h('main',{style:{padding:'60px 30px'}},h('h1',null,'Page capture unavailable'),h('p',null,error),h(Link,{to:'/home'},'Return home'));
 return h('div',{ref:root,className:'reference-page',dangerouslySetInnerHTML:{__html:page?.html||''}});
}

function AppRoutes(){
  const location=useLocation(),path=normalize(location.pathname);
  const legal=legalPages.get(path);
  if(legal)return h(ExternalPage,{...legal,allowInnerLinks:true});
  if(path.startsWith('/get-scouted/')){
    const tail=path.slice('/get-scouted/'.length);
    return h(ExternalPage,{title:'Get Scouted',src:scoutingOrigin+'/'+tail+location.search+location.hash});
  }
  if(path==='/do-not-sell-my-personal-info/')return h(ExternalPage,{title:'Do not sell my personal info',src:privacyForm});
  const patterns=['/home','/directory','/directory/:territory/:talent/*','/work/:slug/*','/from-the-archive/*','/category/*','/talent-category/*','/author/*','/:page','*'];
  return h(Routes,null,h(Route,{path:'/',element:h(HomeRedirect)}),...patterns.map(pattern=>h(Route,{key:pattern,path:pattern,element:h(ReferencePage)})));
}

window.ReactDOM.createRoot(document.getElementById('app')).render(h(BrowserRouter,null,h(AppRoutes)));
