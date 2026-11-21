// Google is replaced with a unit stub here. These tests do not claim a real
// challenge or server-side verification succeeded and never contact Google.
import test from 'node:test';
import assert from 'node:assert/strict';
let testSequence = 0;
const testKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const tick = async () => {for (let i=0;i<12;i++) await Promise.resolve();};

async function harness(t, {config={siteKey:'unit-stub-site-key',configured:true}, width=350, loaded=false}={}) {
  const saved = Object.fromEntries(['window','document','fetch'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  const timers = new Map(), scripts = [], renders = [], resets = [], observers = [], changes = [], errors = [];
  let nextTimer = 0;
  class Element {
    constructor(tag='div', elementWidth=304) {this.tagName=tag;this.width=elementWidth;this.children=[];this.parentElement=null;this.isConnected=true;}
    getBoundingClientRect() {return {width:this.width};}
    append(element) {this.children.push(element);element.parentElement=this;if(element.tagName==='script')scripts.push(element);}
    replaceChildren(...elements) {for(const child of this.children){child.parentElement=null;child.isConnected=false;}this.children=[];elements.forEach(element=>this.append(element));}
    remove() {if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;this.isConnected=false;}
  }
  const head = new Element('head');
  const parent = new Element('section',width),container = new Element('div',304);parent.append(container);
  const stubApi = {render:(mount,options)=>{const id=renders.length;renders.push({mount,options,id});return id;},reset:id=>resets.push(id)};
  const win = {setTimeout:(callback,ms)=>{const id=++nextTimer;timers.set(id,{callback,ms});return id;},clearTimeout:id=>timers.delete(id),ResizeObserver:class {constructor(callback){this.callback=callback;observers.push(this);}observe(element){this.element=element;}disconnect(){this.disconnected=true;}}};
  if(loaded)win.grecaptcha=stubApi;
  globalThis.window=win;globalThis.document={head,createElement:tag=>new Element(tag)};
  const fetches=[];
  let fetchBehavior=async()=>({ok:true,json:async()=>config});
  globalThis.fetch=(...args)=>{fetches.push(args);return fetchBehavior(...args);};
  t.after(()=>{for(const [name,descriptor]of Object.entries(saved)){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}});
  const {setupRecaptcha}=await import('../src/recaptcha.mjs?unit='+ ++testSequence);
  const options={onChange:token=>changes.push(token),onError:error=>errors.push(error)};
  return {setupRecaptcha,options,container,parent,win,timers,scripts,renders,resets,observers,changes,errors,fetches,
    setConfig:value=>{config=value;},setFetch:callback=>{fetchBehavior=callback;},
    finishScript:(script=scripts.at(-1))=>{win.grecaptcha=stubApi;win[new URL(script.src).searchParams.get('onload')]();},
    expireTimer:ms=>{const found=[...timers.entries()].find(([,timer])=>timer.ms===ms);assert.ok(found,'Expected '+ms+'ms timeout');timers.delete(found[0]);found[1].callback();},
  };
}

test('unconfigured CAPTCHA blocks rendering and explains the phone alternative',async t=>{
  const h=await harness(t,{config:{siteKey:'',configured:false}}),dispose=h.setupRecaptcha(h.container,h.options);
  assert.equal(await dispose.ready,false);assert.equal(h.scripts.length,0);assert.equal(h.renders.length,0);
  assert.equal(h.errors[0].code,'RECAPTCHA_UNCONFIGURED');assert.match(h.errors[0].message,/phone option/);assert.ok(h.changes.every(value=>value===''));
  assert.equal(h.fetches[0][0],'/api/recaptcha/config');assert.equal(h.fetches[0][1].cache,'no-store');dispose();
});

test('Google public test key is rejected even when config says configured',async t=>{
  const h=await harness(t,{config:{siteKey:testKey,configured:true}}),dispose=h.setupRecaptcha(h.container,h.options);
  assert.equal(await dispose.ready,false);assert.equal(h.errors[0].code,'RECAPTCHA_TEST_KEY');assert.equal(h.scripts.length,0);dispose();
});

test('a supplied site key cannot override configured:false from the backend',async t=>{
  const h=await harness(t,{config:{siteKey:'unit-stub-site-key',configured:false}}),dispose=h.setupRecaptcha(h.container,h.options);
  assert.equal(await dispose.ready,false);assert.equal(h.errors[0].code,'RECAPTCHA_UNCONFIGURED');assert.equal(h.scripts.length,0);dispose();
});

test('configuration fetch timeout aborts and reports a recoverable load error',async t=>{
  const h=await harness(t);let aborted=false;
  h.setFetch((_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));})));
  const dispose=h.setupRecaptcha(h.container,h.options);h.expireTimer(10000);
  assert.equal(await dispose.ready,false);assert.equal(aborted,true);assert.equal(h.errors[0].code,'RECAPTCHA_CONFIG');assert.equal(h.timers.size,0);dispose();
});

test('configuration failure does not load Google and retry fetches fresh config',async t=>{
  const h=await harness(t);h.setFetch(async()=>{throw new Error('offline');});
  const dispose=h.setupRecaptcha(h.container,h.options);assert.equal(await dispose.ready,false);assert.equal(h.errors[0].code,'RECAPTCHA_CONFIG');
  h.setFetch(async()=>({ok:true,json:async()=>({configured:true,siteKey:'unit-stub-site-key'})}));
  const retry=dispose.retry();await tick();assert.equal(h.scripts.length,1);h.finishScript();assert.equal(await retry,true);assert.equal(h.fetches.length,2);dispose();
});

test('unit stub renders explicitly and token, expiry, reset and connection callbacks clear state',async t=>{
  const h=await harness(t),expired=[];
  const dispose=h.setupRecaptcha(h.container,{...h.options,onExpired:()=>expired.push(true)});await tick();
  assert.equal(h.scripts.length,1);assert.match(h.scripts[0].src,/render=explicit/);h.finishScript();assert.equal(await dispose.ready,true);
  const rendered=h.renders[0];assert.equal(rendered.options.sitekey,'unit-stub-site-key');assert.equal(rendered.options.size,'normal');assert.equal(rendered.options.theme,'light');
  rendered.options.callback('unit-stub-token');assert.equal(h.changes.at(-1),'unit-stub-token');
  rendered.options['expired-callback']();assert.equal(h.changes.at(-1),'');assert.equal(expired.length,1);
  rendered.options.callback('second-unit-stub-token');assert.equal(dispose.reset(),true);assert.equal(h.changes.at(-1),'');assert.ok(h.resets.includes(0));
  rendered.options['error-callback']();assert.equal(h.errors.at(-1).code,'RECAPTCHA_CONNECTION');assert.equal(h.changes.at(-1),'');dispose();
});

test('script error removes failed loader and stale callbacks cannot resolve retry',async t=>{
  const h=await harness(t),dispose=h.setupRecaptcha(h.container,h.options);await tick();
  const old=h.scripts[0],oldCallback=h.win[new URL(old.src).searchParams.get('onload')];old.onerror();
  assert.equal(await dispose.ready,false);assert.equal(old.parentElement,null);assert.equal(h.errors.at(-1).code,'RECAPTCHA_LOAD');
  const retry=dispose.retry();await tick();assert.equal(h.scripts.length,2);oldCallback();await tick();assert.equal(h.renders.length,0);
  h.finishScript(h.scripts[1]);assert.equal(await retry,true);assert.equal(h.renders.length,1);dispose();
});

test('script timeout is retryable and clears its failed script and timer',async t=>{
  const h=await harness(t),dispose=h.setupRecaptcha(h.container,h.options);await tick();h.expireTimer(20000);
  assert.equal(await dispose.ready,false);assert.equal(h.scripts[0].parentElement,null);assert.equal(h.timers.size,0);
  const retry=dispose.retry();await tick();h.finishScript();assert.equal(await retry,true);dispose();
});

test('two containers share one in-flight configuration and one Google loader',async t=>{
  const h=await harness(t);
  const other=new h.container.constructor('div',304);h.parent.append(other);
  const first=h.setupRecaptcha(h.container,h.options),next=h.setupRecaptcha(other,h.options);await tick();
  assert.equal(h.fetches.length,1);assert.equal(h.scripts.length,1);h.finishScript();assert.deepEqual(await Promise.all([first.ready,next.ready]),[true,true]);assert.equal(h.renders.length,2);first();next();
});

test('duplicate setup for a container disposes old widget and ignores its callbacks',async t=>{
  const h=await harness(t,{loaded:true}),oldChanges=[];
  const first=h.setupRecaptcha(h.container,{...h.options,onChange:token=>oldChanges.push(token)});assert.equal(await first.ready,true);const old=h.renders[0].options;
  const next=h.setupRecaptcha(h.container,h.options);assert.equal(await next.ready,true);old.callback('stale-unit-stub-token');old['error-callback']();
  assert.ok(!oldChanges.includes('stale-unit-stub-token'));assert.equal(h.errors.length,0);assert.equal(h.container.children.length,1);assert.ok(h.resets.includes(0));next();
});

test('disposing during load prevents widget and callback work after route removal',async t=>{
  const h=await harness(t),dispose=h.setupRecaptcha(h.container,h.options);await tick();dispose();h.finishScript();
  assert.equal(await dispose.ready,false);assert.equal(h.renders.length,0);assert.equal(h.errors.length,0);assert.equal(await dispose.retry(),false);assert.equal(dispose.reset(),false);
});

test('available width uses supported compact widget and resize invalidates token',async t=>{
  const h=await harness(t,{loaded:true,width:285}),dispose=h.setupRecaptcha(h.container,h.options);assert.equal(await dispose.ready,true);assert.equal(h.renders[0].options.size,'compact');
  h.renders[0].options.callback('unit-stub-token');h.parent.width=350;h.observers[0].callback();assert.equal(h.renders.at(-1).options.size,'normal');assert.equal(h.changes.at(-1),'');
  h.renders[0].options.callback('stale-unit-stub-token');assert.equal(h.changes.at(-1),'');dispose();assert.equal(h.observers[0].disconnected,true);
});

test('render failure is reported and retry creates a fresh mount',async t=>{
  const h=await harness(t,{loaded:true}),goodRender=h.win.grecaptcha.render;
  h.win.grecaptcha.render=()=>{throw new Error('Invalid key');};const dispose=h.setupRecaptcha(h.container,h.options);
  assert.equal(await dispose.ready,false);assert.equal(h.errors.at(-1).code,'RECAPTCHA_RENDER');assert.equal(h.container.children.length,0);
  h.win.grecaptcha.render=goodRender;assert.equal(await dispose.retry(),true);assert.equal(h.container.children.length,1);dispose();
});

test('missing container returns a safe lifecycle handle and accessible error',async t=>{
  const h=await harness(t),dispose=h.setupRecaptcha(null,h.options);assert.equal(await dispose.ready,false);assert.equal(await dispose.retry(),false);assert.equal(dispose.reset(),false);assert.equal(h.errors[0].code,'RECAPTCHA_CONTAINER');assert.equal(h.scripts.length,0);dispose();
});
