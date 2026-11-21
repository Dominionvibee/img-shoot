import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const port = 9331;
const base = resolve(import.meta.dirname, '../.browser-profile');
export async function connectBrowser({newTab=true}={}) {
  let running = await fetch(`http://127.0.0.1:${port}/json/version`).then(r=>r.json()).catch(()=>null);
  if (!running) {
    const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${base}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { detached:true, windowsHide:true, stdio:'ignore' });
    child.unref();
    for (let i=0;i<60;i++) {
      await new Promise(r=>setTimeout(r,250));
      running = await fetch(`http://127.0.0.1:${port}/json/version`).then(r=>r.json()).catch(()=>null);
      if (running) break;
    }
  }
  if (!running) throw new Error('Chrome debugging connection unavailable');
  const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
  const target = newTab ? await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'}).then(r=>r.json()) : tabs.find(t=>t.type==='page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no;});
  let id=0; const pending=new Map(), events=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}}else events.push(m);};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  return {send, events, close:()=>ws.close(), eval:async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}};
}

if (process.argv[1] === import.meta.filename) {
  const browser = await connectBrowser();
  const url=process.argv[2]||'https://imgmodels.com/';
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await browser.send('Page.navigate',{url});
  await new Promise(r=>setTimeout(r,10000));
  console.log(await browser.eval('JSON.stringify({title:document.title,url:location.href,text:document.body.innerText.slice(0,3000),html:document.documentElement.outerHTML.length})'));
  const dir=resolve(import.meta.dirname,'../reference');await mkdir(dir,{recursive:true});
  await writeFile(resolve(dir,'browser.html'),await browser.eval('document.documentElement.outerHTML'));
  const shot=await browser.send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(dir,'browser.png'),Buffer.from(shot.data,'base64'));
  browser.close();
}
