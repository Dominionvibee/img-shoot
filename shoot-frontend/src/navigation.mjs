const aliases = new Map([
  ['/', '/'], ['/home', '/'],
  ['/about-us', '/about-us'], ['/contact', '/contact'],
  ['/get-scouted', '/get-scouted'], ['/scouting', '/get-scouted'],
  ['/we-love-your-genes', '/get-scouted'],
  ['/recruitmentwarning', '/recruitment-warning'], ['/recruitment-warning', '/recruitment-warning'],
  ['/terms-of-use', '/term-of-use'], ['/term-of-use', '/term-of-use'],
  ['/legal/terms-of-use', '/term-of-use'],
  ['/privacy-policy-2', '/privacy-policy'], ['/privacy-policy', '/privacy-policy'],
  ['/legal/privacy-policy', '/privacy-policy'],
  ['/cookies', '/cookie-policy'], ['/cookie-policy', '/cookie-policy'], ['/legal/cookies', '/cookie-policy'],
  ['/the-incubator-terms', '/the-incubator-terms'],
  ['/under-18-faq', '/under-18-faq'], ['/faqunder18', '/under-18-faq'],
  ['/new-york-state-fashion-workers-act', '/new-york-state-fashion-workers-act'],
  ['/do-not-sell-my-personal-info', '/do-not-sell-my-personal-info'],
  ['/img-privacy-policy', '/img-privacy-policy'], ['/img-cookie-policy', '/img-cookie-policy'],
]);

export const canonicalPath = path => aliases.get(path.replace(/\/+$/, '') || '/') || path;

export function localRoute(href, currentUrl) {
  if (!href || href.startsWith('#')) return null;
  let url;
  try { url = new URL(href.replaceAll('&amp;', '&'), currentUrl); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  const current = new URL(currentUrl);
  const imgHost = ['imgmodels.com', 'www.imgmodels.com'].includes(url.hostname);
  const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && url.port === current.port;
  if (url.origin === current.origin || imgHost || localHost) {
    if (imgHost && /^\/(?:wp-content|wp-includes)\//.test(url.pathname)) return null;
    const path=canonicalPath(url.pathname);
    return path + url.search + (url.hash || (path==='/'?'#':''));
  }
  if (url.hostname === 'getscouted.imgmodels.com') return '/get-scouted' + url.hash;
  if (['img.com', 'www.img.com'].includes(url.hostname)) {
    const path=url.pathname.replace(/\/+$/, '');
    if (['/privacypolicy','/privacy-policy'].includes(path)) return '/img-privacy-policy'+url.hash;
    if (['/cookiepolicy','/cookies'].includes(path)) return '/img-cookie-policy'+url.hash;
  }
  if (['wmefashion.com', 'www.wmefashion.com'].includes(url.hostname)) {
    const path = canonicalPath(url.pathname);
    if (['/term-of-use', '/privacy-policy', '/cookie-policy', '/the-incubator-terms'].includes(path)) return path + url.hash;
  }
  if (['privacyportal.onetrust.com', 'privacyportal-cdn.onetrust.com'].includes(url.hostname) && url.pathname.startsWith('/webform/')) return '/do-not-sell-my-personal-info';
  return null;
}
