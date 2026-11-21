import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalPath, localRoute} from '../src/navigation.mjs';

const base='http://localhost:4173/#';
test('every pictured footer link resolves to its canonical React route except the requested exclusions',async()=>{
  const home=JSON.parse(await readFile(new URL('../data/pages/home.json',import.meta.url),'utf8'));
  const footer=home.html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i)[0];
  const expected=['/about-us','/contact','/get-scouted','/recruitment-warning','/do-not-sell-my-personal-info',null,'/term-of-use','/privacy-policy','/cookie-policy','/under-18-faq','/new-york-state-fashion-workers-act',null,null];
  const hrefs=[...footer.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map(match=>match[1]);
  assert.deepEqual(hrefs.map(href=>localRoute(href,base)),expected);
  assert.match(footer,/<span[^>]*>Copyright IMG Worldwide, LLC<\/span>/);
});

test('both scouting links and legacy legal URLs use the same top-level routes',()=>{
  for(const href of ['https://getscouted.imgmodels.com','https://getscouted.imgmodels.com/','/get-scouted/','/scouting/'])assert.equal(localRoute(href,base),'/get-scouted');
  for(const path of ['/terms-of-use/','/legal/terms-of-use/','/term-of-use'])assert.equal(canonicalPath(path),'/term-of-use');
  assert.equal(localRoute('https://wmefashion.com/privacy-policy/#childreninfo',base),'/privacy-policy#childreninfo');
  assert.equal(localRoute('https://www.imgmodels.com/',base),'/#');
  assert.equal(localRoute('/home',base),'/#');
  assert.equal(localRoute('http://127.0.0.1:4173/contact/',base),'/contact');
  assert.equal(localRoute('/?featured-work-id=18798',base),'/?featured-work-id=18798#');
  assert.equal(localRoute('http://img.com/privacypolicy/',base),'/img-privacy-policy');
  assert.equal(localRoute('http://www.img.com/cookiepolicy/',base),'/img-cookie-policy');
  assert.equal(localRoute('https://www.img.com/about-us',base),null);
  assert.equal(localRoute('https://imgmodels.com/wp-content/uploads/example.jpg',base),null);
});
