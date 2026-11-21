import assetMap from '../data/asset-map.json' with { type: 'json' };
import { setupConsent, clearConsent } from './consent.mjs';
import { canonicalPath, localRoute } from './navigation.mjs';
import { setupScouting } from './scouting.mjs';
import { setupPrivacyForm } from './privacy-form.mjs';
import { setupCorporatePolicy } from './corporate.mjs';
import { createPageStyleManager } from './page-styles.mjs';
import { setupMediaLifecycle } from './media-lifecycle.mjs';
import { createThemeScope } from './theme-lifecycle.mjs';

const pageStyles = createPageStyleManager(document);
setupMediaLifecycle();

// Public presentation captured 20 November 2026. The original theme's public
// interactions use a local, read-only snapshot API, with no production writes.
const manifest = await fetch('/data/routes.json').then(r=>r.json());
const normalize = path => path.replace(/\/+$/, '') + '/';
const routes = new Map(Object.entries(manifest.routes));
// Keep the previous landing path as an alias of the root homepage.
routes.set('/home/', routes.get('/') || 'home');
routes.set('/directory/london/vanesa-lorenzo/', 'profile-vanesa-lorenzo');
const asset = url => assetMap[url] || url;
const footerPages = new Map([
  ['/get-scouted/', 'get-scouted'],
  ['/term-of-use/', 'legal-terms-of-use'],
  ['/privacy-policy/', 'legal-privacy-policy'],
  ['/cookie-policy/', 'legal-cookies'],
  ['/the-incubator-terms/', 'legal-the-incubator-terms'],
  ['/do-not-sell-my-personal-info/', 'do-not-sell-my-personal-info'],
  ['/img-privacy-policy/', 'corporate-privacy-policy'],
  ['/img-cookie-policy/', 'corporate-cookies'],
]);
routes.set('/recruitment-warning/', routes.get('/recruitmentwarning/'));
for (const [path, slug] of footerPages) routes.set(path, slug);
function localHref(href) {
  return assetMap[href] || localRoute(href, window.location.href);
}
function localizeTree(root) {
  const media = root.matches?.('[src], [data-banner-src], [poster], [data-href]') ? [root] : [];
  media.push(...root.querySelectorAll('[src], [data-banner-src], [poster], [data-href]'));
  for (const el of media) {
    for (const name of ['src', 'data-banner-src', 'poster']) if (el.hasAttribute(name)) {
      const current=el.getAttribute(name),localized=asset(current);
      if(localized!==current)el.setAttribute(name,localized);
    }
    if (el.hasAttribute('data-href')) el.setAttribute('data-href', localHref(el.getAttribute('data-href')) || el.getAttribute('data-href'));
  }
  const anchors = root.matches?.('a[href]') ? [root] : [];
  anchors.push(...root.querySelectorAll('a[href]'));
  for (const el of anchors) {
    const href = localHref(el.getAttribute('href'));
    if (href) {
      el.setAttribute('href', href);
      if (!href.startsWith('/assets/') && !el.hasAttribute('download')) el.removeAttribute('target');
    }
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
async function loadThemeScript(signal,scope) {
  const response = await fetch('/assets/original/theme.js', {signal});
  if (!response.ok) throw new Error('Unable to load the captured theme');
  let source = await response.text();
  signal?.throwIfAborted();
  source = source.replaceAll('window.location="/search/"', 'window.F01Navigate("/search/")');
  source = source.replace('window.location.href=i?"/?featured-work-id="+e:"/?work-id="+e', 'window.F01Navigate(i?"/?featured-work-id="+e:"/?work-id="+e)');
  source = source.replace('window.location.href=n.toString()', 'window.F01Navigate(n.toString())');
  source = source.replaceAll('window.location.href=e.dataset.href', 'window.F01Navigate(e.dataset.href)');
  // The explicit offline gallery state has no first image. Preserve the theme's
  // credits and close control without dereferencing missing media metadata.
  source = source.replaceAll('i.mediaItems[0].talent_ids','i.mediaItems[0]?.talent_ids');
  const script = document.createElement('script');
  script.textContent = source + '\n//# sourceURL=/assets/original/theme-routed.js';
  scope.activate();
  try {
    document.head.append(script);
    script.remove();
    document.dispatchEvent(new Event('DOMContentLoaded'));
  } catch(error) {
    scope.dispose();
    throw error;
  }
  return ()=>scope.dispose();
}
async function initializePage(root, signal) {
  const scope=createThemeScope();
  const reactRoots=new Set();
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
    element: {...window.React, ...window.ReactDOM,render:(element,container,...args)=>{
      reactRoots.add(container);
      return window.ReactDOM.render(element,container,...args);
    }},
    apiFetch: async ({path: apiPath, signal}) => {
      const response = await fetch(`/wp-json/${apiPath}`, {signal});
      if (!response.ok) throw new Error('The local reference snapshot is unavailable.');
      return localizeData(await response.json());
    },
  };
  try {
    const disposeTheme=await loadThemeScript(signal,scope);
    return () => {
      observer.disconnect();
      for(const container of reactRoots)window.ReactDOM.unmountComponentAtNode(container);
      reactRoots.clear();
      disposeTheme();
    };
  } catch (error) {
    observer.disconnect();
    scope.dispose();
    throw error;
  }
}

await loadScript('/assets/mediaelement/jquery.min.js');
await loadScript('/assets/mediaelement/mediaelement-and-player.min.js');
await loadScript('/assets/mediaelement/mediaelement-migrate.min.js');
await loadScript('/assets/original/react.min.js');
await loadScript('/assets/original/react-dom.min.js');
await loadScript('/assets/original/remix-router.js');
await loadScript('/assets/original/react-router.js');
await loadScript('/assets/original/react-router-dom.js');
const {createElement:h,useState,useEffect,useLayoutEffect,useRef}=window.React;
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
      if(event.target.closest?.('[data-local-gallery-retry]')){event.preventDefault();window.location.reload();return;}
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

function setupLegal(root) {
  // Preserve the WME policy navigation and its own footer behavior.
  document.documentElement.classList.add('weLoaded');
  const header=root.querySelector('.header');
  header?.classList.add('dark');
  const toggle=root.querySelector('.burger');
  const click=()=>{header?.classList.toggle('active');};
  if(toggle){toggle.setAttribute('role','button');toggle.tabIndex=0;toggle.setAttribute('aria-label','Toggle navigation');}
  toggle?.addEventListener('click',click);
  const key=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();click();}};
  toggle?.addEventListener('keydown',key);
  const footer=root.querySelector('footer.footer');
  const after=root.querySelector('.footerAfter');
  const updateFooter=()=>{if(after&&footer)after.style.display=footer.getBoundingClientRect().top<innerHeight-200?'block':'none';};
  window.addEventListener('scroll',updateFooter,{passive:true});
  window.addEventListener('resize',updateFooter);
  updateFooter();
  return()=>{toggle?.removeEventListener('click',click);toggle?.removeEventListener('keydown',key);window.removeEventListener('scroll',updateFooter);window.removeEventListener('resize',updateFooter);document.documentElement.classList.remove('weLoaded');};
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
    await pageStyles.prepare(data);
    return data;
  }).then(value=>{if(active)setLoaded({path:location.pathname,value})})
    .catch(cause=>{if(active)setError(cause.message)});
  return()=>{active=false};
 },[location.pathname,slug]);
 useLayoutEffect(()=>{
  if(!page)return;
  pageStyles.activate(page);
  document.body.className=page.bodyClass;
  document.title=page.title||'IMG Models';
  // Protected source content was not accessible during inspection. Keep that
  // boundary explicit and never forward a copied password form to production.
  for(const form of root.current.querySelectorAll('.post-password-form')){
    form.removeAttribute('action');
    for(const input of form.querySelectorAll('input,button'))input.disabled=true;
    const notice=document.createElement('p');notice.setAttribute('role','note');
    notice.textContent='This reference page is password protected. Protected content and sign-in are unavailable in this local preview. Do not enter a password.';
    form.prepend(notice);
  }
  clearConsent(page.kind==='legal'?'wme':(!page.kind||page.kind==='img'?'img':null));
 },[page]);
 useEffect(()=>{
  if(!page||!root.current)return;
  let cancelled=false,dispose;
  const abort=new AbortController();
  let cleanup;
  if(page.kind==='scouting')cleanup=setupScouting(root.current);
  else if(page.kind==='privacy-form')cleanup=setupPrivacyForm(root.current);
  else if(page.kind==='corporate-policy')cleanup=setupCorporatePolicy(root.current);
  else if(page.kind==='legal'){
    const disposeLegal=setupLegal(root.current);
    cleanup=setupConsent({variant:'wme'}).then(()=>disposeLegal);
  }
  else cleanup=Promise.all([initializePage(root.current,abort.signal),setupConsent()]).then(([dispose])=>dispose);
  localizeTree(root.current);
  const observer=new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)localizeTree(node);
  });
  observer.observe(root.current,{childList:true,subtree:true});
  Promise.resolve(cleanup).then(cleanup=>{
    if(cancelled)cleanup?.();else dispose=cleanup;
  }).catch(cause=>{if(!cancelled)setError(cause.message)});
  if(location.hash)document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  else window.scrollTo(0,0);
  return()=>{cancelled=true;abort.abort();dispose?.();observer.disconnect();};
 },[page]);
 if(error)return h('main',{style:{padding:'60px 30px'}},h('h1',null,'Page capture unavailable'),h('p',null,error),h(Link,{to:'/#'},'Return home'));
 return h('div',{ref:root,className:'reference-page',dangerouslySetInnerHTML:{__html:page?.html||''}});
}

function AppRoutes(){
  const location=useLocation();
  const canonical=canonicalPath(location.pathname);
  useEffect(()=>{
    // React Router normalizes an empty fragment away. Preserve the requested
    // visible /# URL without changing its route or resetting the document.
    if(location.pathname==='/'&&!window.location.hash&&!window.location.href.endsWith('#')) {
      window.history.replaceState(window.history.state,'','/'+location.search+'#');
    }
  },[location.pathname,location.search,location.hash]);
  if(canonical!==location.pathname)return h(Navigate,{to:{pathname:canonical,search:location.search,hash:location.hash||(canonical==='/'?'#':'')},replace:true});
  const query=new URLSearchParams(location.search);
  // Related work links in the original modal reload the page. Give React a
  // fresh page instance for that same URL change, preserving local navigation
  // while disposing the previous gallery's state and event listeners.
  const interactiveListing=/^\/(?:directory|search)\/?$/.test(location.pathname);
  const pageKey=location.pathname+':'+(interactiveListing?location.key:(query.get('featured-work-id')||query.get('work-id')||''));
  const patterns=['/','/directory','/directory/:territory/:talent/*','/work/:slug/*','/from-the-archive/*','/category/*','/talent-category/*','/author/*','/:page','*'];
  return h(Routes,null,...patterns.map(pattern=>h(Route,{key:pattern,path:pattern,element:h(ReferencePage,{key:pageKey})})));
}

window.ReactDOM.createRoot(document.getElementById('app')).render(h(BrowserRouter,null,h(AppRoutes)));
