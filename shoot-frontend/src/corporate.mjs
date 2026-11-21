// Corporate IMG policy pages have their own navigation, newsletter and cookie
// presentation. No original analytics or subscription scripts execute locally.
export function setupCorporatePolicy(root) {
  const controller=new AbortController(),{signal}=controller;
  const on=(target,name,callback)=>target?.addEventListener(name,callback,{signal});
  const body=document.body,header=root.querySelector('.header'),navbar=root.querySelector('#navbar');
  const originalAos=[...body.attributes].filter(a=>a.name.startsWith('data-aos')).map(a=>[a.name,a.value]);
  body.setAttribute('data-aos-easing','ease');body.setAttribute('data-aos-duration','1000');body.setAttribute('data-aos-delay','0');
  const mailing=show=>{
    const menu=root.querySelector('#menuContent'),form=root.querySelector('#toggleSectionContent');
    if(menu)menu.style.display=show?'none':'';if(form)form.style.display=show?'':'none';
    root.querySelectorAll('.header__mailing-toggle .btn').forEach(button=>{button.style.display=show?'none':'';});
  };
  const menu=show=>{
    navbar?.classList.toggle('show',show);header?.classList.toggle('-nav-show',show);body.classList.toggle('nav-open',show);
    root.querySelectorAll('.navbar-toggler').forEach(button=>button.setAttribute('aria-expanded',String(show)));
    if(!show)mailing(false);
  };
  root.querySelectorAll('.navbar-toggler').forEach(button=>on(button,'click',()=>menu(!navbar?.classList.contains('show'))));
  for(const id of ['mailingToggle','mailingToggleDesktop'])on(root.querySelector('#'+id),'click',()=>mailing(true));
  on(root.querySelector('#mailingToggleBack'),'click',()=>mailing(false));
  on(root.querySelector('#mailingToggleFooter'),'click',()=>{menu(true);mailing(true);});
  root.querySelectorAll('.dropdown-toggle').forEach(button=>on(button,'click',event=>{
    event.preventDefault();const list=button.nextElementSibling;list?.classList.toggle('show');button.setAttribute('aria-expanded',String(list?.classList.contains('show')));
  }));
  const animations=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{if(isIntersecting){target.classList.add('aos-animate');animations.unobserve(target);}}));
  root.querySelectorAll('[data-aos]').forEach(element=>{element.classList.add('aos-init');animations.observe(element);});
  let lastScroll=window.scrollY;
  const scroll=()=>{
    const y=window.scrollY;body.classList.toggle('scrolled',y>100);
    if(Math.abs(y-lastScroll)>5&&!navbar?.classList.contains('show'))header?.classList.toggle('-fade-out',y>lastScroll&&y>(header?.offsetHeight||0));
    lastScroll=y;
    const back=root.querySelector('#back2top');if(back)back.style.display=y>300?'':'none';
  };
  on(window,'scroll',scroll);scroll();on(root.querySelector('#back2top'),'click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  root.querySelectorAll('form[data-corporate-preview]').forEach(form=>{
    form.querySelectorAll('.hs-form-required').forEach(marker=>{
      const label=marker.closest('label'),input=label?.htmlFor?form.querySelector('#'+CSS.escape(label.htmlFor)):null;
      if(input&&input.type!=='checkbox')input.required=true;
    });
    on(form,'submit',event=>{
      event.preventDefault();if(!form.reportValidity())return;
      const result=form.querySelector('.corporate-preview-result');result.hidden=false;result.textContent='Local preview only. No subscription or personal information has been submitted or stored.';result.focus();
    });
  });

  // The captured OneTrust interface stores choices only in this local preview.
  const banner=root.querySelector('#onetrust-banner-sdk'),panel=root.querySelector('#onetrust-pc-sdk'),shade=root.querySelector('.onetrust-pc-dark-filter');
  const cookieKey='img-corporate-cookie-preview';
  const details=fetch('/assets/corporate/cookie-details.json',{signal}).then(response=>{
    if(!response.ok)throw new Error('The captured cookie details could not be loaded.');
    return response.json();
  });
  // A rejected preload is handled only if the user opens the corresponding UI.
  details.catch(()=>{});
  let previousFocus;
  let panelOpen=false;
  let previousOverflow;
  const cookiePanel=show=>{
    if(show&&!panelOpen){previousOverflow=body.style.overflow;body.style.overflow='hidden';}
    if(!show&&panelOpen)body.style.overflow=previousOverflow;
    panelOpen=show;
    if(panel){panel.classList.toggle('ot-hide',!show);panel.style.display=show?'block':'none';panel.style.maxHeight='90vh';}
    if(shade)shade.style.display=show?'block':'none';
    if(show){previousFocus=document.activeElement;panel?.querySelector('button')?.focus();}else previousFocus?.focus();
  };
  const save=choice=>{
    try{localStorage.setItem(cookieKey,JSON.stringify({choice,groups:[...root.querySelectorAll('#onetrust-pc-sdk input[type="checkbox"]')].map(input=>({id:input.id,checked:input.checked}))}));}catch{ /* Choices can still apply for this view. */ }
    cookiePanel(false);if(banner)banner.style.display='none';
  };
  let saved;
  try{saved=JSON.parse(localStorage.getItem(cookieKey)||'null');}catch{ /* Start with the source banner. */ }
  if(saved){if(banner)banner.style.display='none';for(const state of saved.groups||[]){const input=root.querySelector('#'+CSS.escape(state.id));if(input)input.checked=state.checked;}}
  if(shade)shade.style.display='none';
  root.querySelectorAll('[data-corporate-cookie-settings],#onetrust-pc-btn-handler,.ot-sdk-show-settings').forEach(button=>on(button,'click',event=>{event.preventDefault();cookiePanel(true);}));
  on(root.querySelector('#close-pc-btn-handler'),'click',()=>cookiePanel(false));
  root.querySelectorAll('.onetrust-close-btn-handler:not(.save-preference-btn-handler),#onetrust-reject-all-handler,.ot-pc-refuse-all-handler').forEach(button=>on(button,'click',()=>save('rejected')));
  on(root.querySelector('#onetrust-accept-btn-handler'),'click',()=>save('accepted'));
  on(root.querySelector('#accept-recommended-btn-handler'),'click',()=>save('accepted'));
  root.querySelectorAll('.save-preference-btn-handler').forEach(button=>on(button,'click',()=>save('custom')));
  on(root,'click',event=>{
    const detailButton=event.target.closest('.category-host-list-handler');
    if(detailButton){
      const group=detailButton.getAttribute('data-parent-id');
      details.then(values=>{
        if(signal.aborted)return;const match=values.find(value=>value.group.id===group),list=root.querySelector('#ot-pc-lst');
        if(match&&list){list.innerHTML=match.html;list.classList.remove('ot-hide');root.querySelector('#ot-pc-content')?.classList.add('ot-hide');}
      }).catch(error=>{if(!signal.aborted){const list=root.querySelector('#ot-pc-lst');if(list){list.textContent=error.message;list.classList.remove('ot-hide');root.querySelector('#ot-pc-content')?.classList.add('ot-hide');}}});
      return;
    }
    if(event.target.closest('.back-btn-handler')){root.querySelector('#ot-pc-lst')?.classList.add('ot-hide');root.querySelector('#ot-pc-content')?.classList.remove('ot-hide');return;}
    const expand=event.target.closest('#onetrust-pc-sdk [aria-controls][aria-expanded]');
    if(expand){
      const target=root.querySelector('#'+CSS.escape(expand.getAttribute('aria-controls')));
      if(target?.classList.contains('ot-acc-txt')){const active=expand.getAttribute('aria-expanded')!=='true';expand.setAttribute('aria-expanded',String(active));target.style.display=active?'block':'none';}
    }
    if(event.target.closest('#filter-btn-handler')){const filter=root.querySelector('#ot-fltr-modal');if(filter)filter.style.display=filter.style.display==='block'?'none':'block';}
    if(event.target.closest('#filter-apply-handler,#filter-cancel-handler')){const filter=root.querySelector('#ot-fltr-modal');if(filter)filter.style.display='none';}
    if(event.target.closest('#filter-apply-handler')){
      const chosen=[...root.querySelectorAll('#ot-fltr-modal input:checked')].map(input=>input.closest('li')?.textContent.trim()).filter(Boolean);
      root.querySelectorAll('#ot-host-lst .ot-host-item').forEach(item=>{item.style.display=!chosen.length||chosen.some(label=>item.textContent.includes(label))?'':'none';});
    }
    if(event.target.closest('#clear-filters-handler')){root.querySelectorAll('#ot-fltr-modal input').forEach(input=>{input.checked=false;});root.querySelectorAll('#ot-host-lst .ot-host-item').forEach(item=>{item.style.display='';});}
  });
  on(root,'input',event=>{
    if(event.target.id!=='vendor-search-handler')return;
    const term=event.target.value.trim().toLocaleLowerCase();root.querySelectorAll('#ot-host-lst .ot-host-item').forEach(item=>{item.style.display=item.textContent.toLocaleLowerCase().includes(term)?'':'none';});
  });
  on(document,'keydown',event=>{
    if(event.key==='Escape'){menu(false);cookiePanel(false);}
    if(event.key==='Tab'&&panel&&!panel.classList.contains('ot-hide')){
      const focusable=[...panel.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]')].filter(e=>e.getBoundingClientRect().height>0),first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  });
  return()=>{controller.abort();animations.disconnect();if(panelOpen)body.style.overflow=previousOverflow;body.classList.remove('nav-open','scrolled');for(const a of [...body.attributes])if(a.name.startsWith('data-aos'))body.removeAttribute(a.name);for(const [name,value]of originalAos)body.setAttribute(name,value);};
}
