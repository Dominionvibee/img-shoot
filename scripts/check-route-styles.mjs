import assert from 'node:assert/strict';
import { connectBrowser } from './browser.mjs';

// Exercises presentation while all captured reference hosts are unavailable.
// Run from any directory: node .f01-work/scripts/check-route-styles.mjs
const origin = process.env.FRONTEND_URL || 'http://localhost:4173';
const browser = await connectBrowser();
const results = [];
const blockedReferenceHosts = [
  '*://imgmodels.com/*', '*://www.imgmodels.com/*', '*://getscouted.imgmodels.com/*',
  '*://wmefashion.com/*', '*://www.wmefashion.com/*', '*://privacyportal.onetrust.com/*',
];
let stylesheetFailureHandled = false;
const requiredStyles = {
  img: ['/src/reference.css', '/src/cookie.css', '/src/styles.css', '/src/local-pages.css'],
  legal: ['/assets/legal/wme-style.css', '/src/local-pages.css'],
  scouting: ['/src/scouting.css', '/src/local-pages.css'],
  privacy: ['/src/privacy-form.css', '/src/local-pages.css'],
};
const samples = [
  ['/about-us', 'img'],
  ['/directory', 'img'],
  ['/term-of-use', 'legal'],
  ['/get-scouted', 'scouting'],
  ['/do-not-sell-my-personal-info', 'privacy'],
];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const canonical = path => path === '/' ? '/' : path.replace(/\/+$/, '');

const monitor = `(() => {
  window.__routeStyleMonitor = {frames:0, imgFrames:0, failures:[]};
  const sample = () => {
    const monitor = window.__routeStyleMonitor;
    monitor.frames++;
    const header = document.querySelector('.JS--header');
    if (header) {
      monitor.imgFrames++;
      const position = getComputedStyle(header).position;
      const reference = document.querySelector('#reference-style');
      if (position !== 'fixed' && monitor.failures.length < 100) {
        monitor.failures.push({path:location.pathname, position,
          disabled:reference?.disabled, media:reference?.media, sheet:!!reference?.sheet});
      }
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
})()`;

async function waitForPage(path, kind) {
  const deadline = Date.now() + 30000;
  let state;
  do {
    state = await browser.eval(`(() => {
      const paths = ${JSON.stringify(requiredStyles[kind])};
      const ready = paths.every(path => [...document.querySelectorAll('link[rel="stylesheet"]')]
        .some(link => new URL(link.href).pathname === path && !link.disabled &&
          (!link.media || matchMedia(link.media).matches) && link.sheet && link.sheet.cssRules.length));
      return {path:location.pathname, ready,
        content:document.querySelector('.reference-page')?.innerHTML.length || 0,
        error:document.body?.innerText.includes('Page capture unavailable') || false,
        navigate:typeof window.F01Navigate === 'function'};
    })()`);
    if (canonical(state.path) === canonical(path) && state.ready && state.content > 1000 && state.navigate) break;
    await delay(50);
  } while (Date.now() < deadline);
  assert.equal(canonical(state.path), canonical(path), `Wrong route for ${path}`);
  assert.ok(state.ready && state.content > 1000 && state.navigate, `Page/styles not ready: ${JSON.stringify(state)}`);
  // Permit a full frame after the final commit before checking style invariants.
  await browser.eval('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
}

async function inspect(path, kind, viewport, action) {
  await waitForPage(path, kind);
  const result = await browser.eval(`(() => {
    const header = document.querySelector('.JS--header');
    return {path:location.pathname, width:innerWidth,
      overflow:Math.max(0, document.documentElement.scrollWidth - innerWidth),
      position:header ? getComputedStyle(header).position : null,
      monitor:window.__routeStyleMonitor,
      styles:[...document.querySelectorAll('link[rel="stylesheet"]')].map(link => ({
        path:new URL(link.href).pathname, disabled:link.disabled, media:link.media,
        sheet:!!link.sheet, rules:link.sheet?.cssRules.length || 0
      }))};
  })()`);
  assert.equal(result.monitor.failures.length, 0, `Unstyled IMG frame: ${JSON.stringify(result.monitor.failures)}`);
  assert.ok(result.overflow <= 1, `Horizontal overflow at ${viewport}/${path}: ${result.overflow}px`);
  if (kind === 'img') assert.equal(result.position, 'fixed', `Unstyled IMG header at ${path}`);
  results.push({viewport, action, ...result});
}

try {
  await browser.send('Network.enable');
  await browser.send('Network.setCacheDisabled', {cacheDisabled:true});
  await browser.send('Network.setBlockedURLs', {urls:blockedReferenceHosts});
  await browser.send('Page.addScriptToEvaluateOnNewDocument', {source:monitor});
  await browser.send('Emulation.setDeviceMetricsOverride', {width:1440,height:900,deviceScaleFactor:1,mobile:false});
  // A failed initial stylesheet request must withhold the raw page, display a
  // useful error, and remain recoverable through local navigation after retry.
  await browser.send('Network.setBlockedURLs', {urls:[...blockedReferenceHosts,'*/src/reference.css']});
  await browser.send('Page.navigate', {url:origin+'/about-us'});
  let failure;
  const failureDeadline = Date.now()+30000;
  do {
    failure = await browser.eval(`({error:document.body?.innerText.includes('Unable to load page styles') || false,
      header:!!document.querySelector('.JS--header'), monitor:window.__routeStyleMonitor})`);
    if (failure.error) break;
    await delay(50);
  } while (Date.now() < failureDeadline);
  assert.equal(failure.error,true,'Blocked initial stylesheet did not produce a useful error');
  assert.equal(failure.header,false,'Raw IMG markup rendered despite the missing stylesheet');
  assert.equal(failure.monitor.failures.length,0,'Initial stylesheet failure exposed an unstyled frame');
  stylesheetFailureHandled = true;
  await browser.send('Network.setBlockedURLs', {urls:blockedReferenceHosts});
  await browser.eval("window.F01Navigate('/directory')");
  await inspect('/directory','img','desktop','stylesheet failure recovery');
  for (const [viewport, width, height] of [['desktop',1440,900], ['mobile',390,844]]) {
    await browser.send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:viewport==='mobile'});
    for (const [path,kind] of samples) {
      await browser.send('Page.navigate', {url:origin+path});
      await inspect(path,kind,viewport,'direct');
    }
    await browser.send('Network.emulateNetworkConditions', {
      offline:false,latency:700,downloadThroughput:500000,uploadThroughput:500000,
    });
    // Reproduce the original CSS refetch race on isolated -> IMG transitions.
    for (const [path,kind] of [
      ['/about-us','img'], ['/term-of-use','legal'], ['/contact','img'],
      ['/get-scouted','scouting'], ['/about-us','img'],
      ['/do-not-sell-my-personal-info','privacy'], ['/directory','img'],
    ]) {
      await browser.eval(`window.F01Navigate(${JSON.stringify(path)})`);
      await inspect(path,kind,viewport,'throttled navigation');
    }
    // Rapid route changes leave multiple page/style fetches in flight. The last
    // request must win without exposing stale content under the wrong styles.
    await browser.eval(`new Promise(resolve => {
      const paths = ['/term-of-use','/about-us','/get-scouted','/contact','/do-not-sell-my-personal-info','/about-us'];
      let index = 0;
      const step = () => {window.F01Navigate(paths[index++]); if(index < paths.length) setTimeout(step,80); else resolve();};
      step();
    })`);
    await inspect('/about-us','img',viewport,'rapid throttled navigation');
    await browser.send('Network.emulateNetworkConditions', {
      offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1,
    });
  }
  const exceptions = browser.events.filter(event => event.method === 'Runtime.exceptionThrown');
  assert.equal(exceptions.length, 0, `Browser exceptions: ${JSON.stringify(exceptions)}`);
  console.log(JSON.stringify({passed:results.length+Number(stylesheetFailureHandled), blockedReferenceHosts:true,
    stylesheetFailureHandled,
    unstyledFrames:results.reduce((sum,result) => sum+result.monitor.failures.length,0),
    maxOverflow:Math.max(...results.map(result=>result.overflow)), exceptions:exceptions.length,
    results:results.map(({viewport,action,path,monitor})=>({viewport,action,path,frames:monitor.frames,imgFrames:monitor.imgFrames}))},null,2));
} finally {
  await browser.send('Page.close');
  browser.close();
}
