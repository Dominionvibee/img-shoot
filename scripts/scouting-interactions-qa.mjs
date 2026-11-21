import assert from 'node:assert/strict';
import {connectBrowser} from './browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const browser=await connectBrowser();
const result={checks:[],exceptions:[],writes:[]};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(expression) {
  for(let i=0;i<200;i++){if(await browser.eval(expression))return;await pause(50);}
  throw Error('Timed out: '+expression);
}
async function open(age) {
  await browser.send('Page.navigate',{url:'http://localhost:4173/get-scouted'});
  await wait(`!!document.querySelector('[data-scout-age-toggle][aria-expanded]')`);
  await browser.eval(`document.querySelector('[data-scout-ack]').click();document.querySelector('[data-scout-age-toggle]').click();document.querySelector('[data-age-value="${age}"]').click()`);
  await pause(850);
}
try {
  await browser.send('Network.enable');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:false});
  await open(13);
  assert.ok(await browser.eval(`document.querySelector('[data-scout-age]').textContent.includes('Looking forward to your future application')`));
  assert.equal(await browser.eval(`new URL(document.querySelector('[data-scout-age] a').href).origin`),'http://localhost:4173');
  result.checks.push('Under-14 refusal and local home link');
  await open(18);
  assert.ok(await browser.eval(`Math.abs(document.querySelector('.modelForm').getBoundingClientRect().top-100)<2`));
  for(const [y,scale] of [[80,1],[100,.8472],[140,.625],[180,.5139],[200,.5]]) {
    const actual=await browser.eval(`(()=>{window.scrollTo(0,${y});window.dispatchEvent(new Event('scroll'));return Number(getComputedStyle(document.querySelector('svg.desktop')).transform.match(/matrix\\(([^,]+)/)[1]);})()`);
    assert.ok(Math.abs(actual-scale)<.000001,`Header scale at ${y}px: ${actual}`);
  }
  result.checks.push('Header shrink matches five independently measured source scroll positions');
  await browser.eval(`document.querySelector('#modelForm').requestSubmit()`);
  assert.equal(await browser.eval(`document.querySelector('#modelForm #email').getAttribute('aria-invalid')`),'true');
  assert.equal(await browser.eval(`document.querySelectorAll('.scout-invalid-image').length`),3);
  result.checks.push('Adult auto-scroll and source-style field/photo validation');
  await browser.eval(`(()=>{const input=document.querySelector('#modelForm input[type=file]');const data=new DataTransfer();data.items.add(new File(['local preview'],'preview.txt',{type:'text/plain'}));input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  assert.equal(await browser.eval(`document.querySelector('#modelForm input[type=file]').parentElement.querySelector('p').classList.contains('hidden')`),false);
  await browser.eval(`(()=>{const input=document.querySelector('#modelForm input[type=file]');const data=new DataTransfer();data.items.add(new File([new Uint8Array(31000000)],'preview.png',{type:'image/png'}));input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  assert.equal(await browser.eval(`document.querySelector('#modelForm input[type=file]').parentElement.querySelectorAll('p')[1].classList.contains('hidden')`),false);
  result.checks.push('Unsupported file and over-30MB source warnings');
  for(const [id,query] of [['height','170'],['nationality','French'],['location','London']]) {
    await browser.eval(`(()=>{const input=document.getElementById(${JSON.stringify(id)});input.value=${JSON.stringify(query)};input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await pause(400);
    await browser.eval(`(()=>{const input=document.getElementById(${JSON.stringify(id)});input.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})()`);
    assert.ok(await browser.eval(`document.getElementById(${JSON.stringify(id)}).value.includes(${JSON.stringify(query)})`));
    assert.equal(await browser.eval(`document.getElementById(${JSON.stringify(id)}).getAttribute('aria-invalid')`),'false');
  }
  result.checks.push('Height, nationality and location autocomplete with keyboard selection');
  await browser.eval(`(()=>{const form=document.querySelector('#modelForm');for(const [name,value] of Object.entries({'fields.fields_4':'preview@example.invalid',firstname:'Local',lastname:'Preview',birthdate:'2000-01-01'}))form.elements.namedItem(name).value=value;const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='),c=>c.charCodeAt(0));for(const input of form.querySelectorAll('input[type=file]')){const transfer=new DataTransfer();transfer.items.add(new File([bytes],'preview.png',{type:'image/png'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));}form.requestSubmit();})()`);
  assert.ok(await browser.eval(`document.querySelector('.scout-status').textContent.includes('has not been sent')`));
  assert.equal(await browser.eval(`[...document.querySelectorAll('#modelForm label img')].filter(i=>i.src.startsWith('blob:')).length`),3);
  result.checks.push('Three local photo previews and explicit unsent local application result');
  await open(16);
  assert.equal(await browser.eval(`document.querySelector('[name="guardian[0].title"]').value`),'');
  assert.equal(await browser.eval(`document.querySelector('[name="guardian[0].relationship"]').value`),'');
  await browser.eval(`document.querySelector('#myForm').requestSubmit();document.querySelector('#conf').click()`);
  assert.equal(await browser.eval(`document.querySelector('[name="guardian[1].firstname"]').closest('.flex.flex-col').hidden`),true);
  await browser.eval(`(()=>{const form=document.querySelector('#myForm');for(const input of form.querySelectorAll('input:not([type=checkbox]),select')){if(input.name.startsWith('guardian[1]'))continue;input.value=input.tagName==='SELECT'?(input.name.endsWith('title')?'mr':'parent'):/email/.test(input.name)?'preview@example.invalid':'Local preview';input.dispatchEvent(new Event('input',{bubbles:true}));}form.requestSubmit();})()`);
  assert.ok(await browser.eval(`document.querySelector('.scout-status').textContent.includes('No permission request has been sent')`));
  result.checks.push('Guardian validation, one-guardian option and unsent local result');
  await browser.eval(`[...document.querySelectorAll('svg')].find(e=>e.classList.contains('md:hidden')).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  assert.equal(await browser.eval(`!!document.querySelector('[data-scout-menu]')`),true);
  assert.ok(await browser.eval(`document.querySelector('[data-scout-menu]').textContent.includes('RECRUITMENT WARNING')`));
  await browser.eval(`[...document.querySelectorAll('svg')].find(e=>e.classList.contains('md:hidden')).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  assert.equal(await browser.eval(`!!document.querySelector('[data-scout-menu]')`),false);
  result.checks.push('Functional fullscreen mobile navigation and close');
  assert.equal(await browser.eval(`document.querySelectorAll('iframe[src*=recaptcha]').length`),0);
  result.checks.push('No reCAPTCHA added to source scouting forms that have none');
  result.exceptions=browser.events.filter(e=>e.method==='Runtime.exceptionThrown');
  result.writes=browser.events.filter(e=>e.method==='Network.requestWillBeSent'&&!['GET','HEAD'].includes(e.params.request.method));
  assert.equal(result.exceptions.length,0);assert.equal(result.writes.length,0);
  const dir=resolve(import.meta.dirname,'../shoot-frontend/docs/milestones/F01/qa');await mkdir(dir,{recursive:true});
  await writeFile(resolve(dir,'scouting-interactions.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({passed:result.checks.length,exceptions:0,networkWrites:0}));
}finally{await browser.send('Page.close');browser.close();}
