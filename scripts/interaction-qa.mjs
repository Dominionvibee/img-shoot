import {connectBrowser}from'./browser.mjs';
import {writeFile,mkdir}from'node:fs/promises';
const b=await connectBrowser({newTab:true});const results=[];await mkdir('reference/qa/interactions',{recursive:true});
async function go(origin,path,width=1440){await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await b.send('Page.navigate',{url:origin+path});await new Promise(r=>setTimeout(r,1400));await b.eval('document.fonts.ready');await b.eval(`document.querySelector('#onetrust-reject-all-handler')?.click()`);}
async function note(label,test,expression){const value=await b.eval(expression);results.push({label,test,value});console.log(label,test,JSON.stringify(value));await writeFile('reference/qa/interactions/results.json',JSON.stringify(results,null,2));}
async function shot(label,state){await writeFile(`reference/qa/interactions/${label}-${state}.png`,Buffer.from((await b.send('Page.captureScreenshot',{format:'png'})).data,'base64'));}
for(const[label,origin]of[['reference','https://imgmodels.com'],['local','http://127.0.0.1:4173']]){
 await go(origin,'/');
 await b.eval(`document.querySelector('.workGrid__gridItem[data-featured-work="30801"]').click()`);await new Promise(r=>setTimeout(r,1800));
 await note(label,'open-editorial',`({open:document.body.classList.contains('workModalActive'),url:location.search,images:document.querySelectorAll('.workModal img').length,text:document.querySelector('.workModal')?.innerText.slice(0,1000)})`);await shot(label,'editorial');
 await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await note(label,'close-editorial',`({open:document.body.classList.contains('workModalActive'),url:location.search})`);
 await go(origin,'/directory/');
 await b.eval(`document.querySelectorAll('.territoryPicker__locationsWrapper')[0].querySelectorAll('a')[3].click();document.querySelectorAll('.territoryPicker__locationsWrapper')[1].querySelector('a').click();document.querySelector('.territoryPicker__go').click()`);await new Promise(r=>setTimeout(r,1500));
 await note(label,'directory-filter',`({picker:document.querySelector('.territoryPicker').className,cards:document.querySelectorAll('.directoryGrid__item').length,first:document.querySelector('.directoryGrid__itemName')?.textContent})`);await shot(label,'directory-filter');
 await b.eval(`document.querySelector('.talentFilters__view:not(.talentFilters__view--ghost) a').click()`);await new Promise(r=>setTimeout(r,300));
 await note(label,'directory-list',`({list:document.querySelector('.alphabeticalDirectory')?.className,names:document.querySelectorAll('.alphabeticalDirectory__talentName').length})`);
 await go(origin,'/search/');
 await b.eval(`sessionStorage.setItem('searchTerm','Anok')`);await go(origin,'/search/');await new Promise(r=>setTimeout(r,1500));
 await note(label,'search-results',`({text:document.querySelector('.search')?.innerText.slice(0,1600),inputs:[...document.querySelectorAll('input')].filter(e=>e.getClientRects().length).map(e=>({placeholder:e.placeholder,value:e.value}))})`);await shot(label,'search-results');
 await go(origin,'/',390);
 await b.eval(`document.querySelector('.JS--burgerToggle').click()`);await new Promise(r=>setTimeout(r,350));
 await note(label,'mobile-menu',`({body:document.body.className,visible:document.querySelector('.burgerMenu').getBoundingClientRect().toJSON(),text:document.querySelector('.burgerMenu').innerText.slice(0,800)})`);await shot(label,'mobile-menu');
 await b.eval(`document.querySelector('.JS--burgerToggle').click()`);
 await note(label,'mobile-menu-close',`document.body.className`);
}
await writeFile('reference/qa/interactions/errors.json',JSON.stringify(b.events.filter(e=>e.method==='Runtime.exceptionThrown'),null,2));b.close();
