import lookup from '../assets/scouting/lookup.json' with { type: 'json' };

// The captured scouting presentation runs locally. Validation and file previews
// do not send the applicant's details or photographs to a production service.
export function setupScouting(root) {
  const controller = new AbortController();
  const {signal} = controller;
  const on = (target, name, callback) => target?.addEventListener(name, callback, {signal});
  const disclaimer = root.querySelector('[data-scout-disclaimer]');
  const gate = root.querySelector('[data-scout-age]');
  const options = root.querySelector('[data-scout-age-options]');
  const toggle = root.querySelector('[data-scout-age-toggle]');
  const adult = root.querySelector('[data-scout-adult]');
  const minor = root.querySelector('[data-scout-minor]');
  const ack = root.querySelector('[data-scout-ack]');
  const header = root.firstElementChild;
  const logo = header.querySelector('svg.desktop');
  const originalOverflow = document.body.style.overflow;
  const objectUrls = new Set();
  let age = null, expanded = false, menuOpen = false;
  document.body.style.overflow = 'hidden';
  disclaimer.hidden = false;
  disclaimer.style.opacity = '1';
  gate.hidden = false;
  gate.style.opacity = '1';
  adult.hidden = true;
  minor.hidden = true;

  const acknowledge = focusAge => { disclaimer.hidden = true; if (focusAge) toggle.focus(); };
  on(ack, 'click', () => acknowledge(false));
  on(ack, 'keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); acknowledge(true); }
  });
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Select your age');
  const label = toggle.querySelector('p');
  function closeOptions() {
    options.replaceChildren();
    expanded = false;
    toggle.setAttribute('aria-expanded', 'false');
    label.classList.remove('mb-[10px]');
  }
  function selectAge(value) {
    age = value;
    closeOptions();
    if (age < 14) {
      document.body.style.overflow = '';
      gate.innerHTML = '<div class="flex flex-col items-center"><p class="text-center text-[16px] lg:text-[25px] text-white max-w-3xl leading-[35px] w-[90%]">Thank you for your interest in joining IMG Models. We are invested in protecting the privacy of our applicants. For this reason, we are unfortunately unable to accept applications for those who are under 14 years old. Looking forward to your future application</p><a class="cursor-pointer w-[206px] grid text-[18.75px] mt-[20px] font-[700] uppercase place-items-center bg-white h-[47px] text-center" href="/#">Back to home</a></div>';
      return;
    }
    gate.hidden = true;
    adult.hidden = age < 18;
    minor.hidden = age >= 18;
    document.body.style.overflow = '';
    const destination = age < 18 ? minor : adult.querySelector('.modelForm');
    window.scrollTo({top:destination.getBoundingClientRect().top + window.scrollY - (age < 18 ? 0 : 100), behavior:'smooth'});
  }
  on(toggle, 'click', event => {
    if (event.target.closest('[data-age-value]')) return;
    if (expanded) return;
    expanded = true;
    toggle.setAttribute('aria-expanded', 'true');
    label.classList.add('mb-[10px]');
    for (let value = 13; value <= 100; value++) {
      const option = document.createElement('span');
      option.className = 'border-b-[1px] cursor-pointer w-full h-full hover:bg-gray-100';
      option.dataset.ageValue = value;
      option.tabIndex = 0;
      option.setAttribute('role', 'option');
      option.textContent = value < 14 ? 'Under 14 years old' : value + ' yrs old';
      on(option, 'click', event => { event.stopPropagation(); selectAge(value); });
      on(option, 'keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); selectAge(value); }
        if (event.key === 'ArrowDown') { event.preventDefault(); option.nextElementSibling?.focus(); }
        if (event.key === 'ArrowUp') { event.preventDefault(); option.previousElementSibling?.focus(); }
      });
      options.append(option);
    }
  });
  on(document, 'keydown', event => { if (event.key === 'Escape') { closeOptions(); if (menuOpen) toggleMenu(); } });

  on(root.querySelector('[data-scout-hero]'), 'click', () => {
    if (gate.hidden) (age < 18 ? minor : adult).scrollIntoView({behavior: 'smooth'});
  });
  const home = root.querySelector('[data-scout-home]');
  on(home, 'click', () => window.F01Navigate('/home'));
  on(home, 'keydown', event => { if (event.key === 'Enter') window.F01Navigate('/home'); });
  const syncHeader = () => {
    const dark = root.querySelector('[data-scout-hero]').getBoundingClientRect().bottom <= innerHeight * .1 || menuOpen;
    header.style.background = dark ? '#fff' : 'transparent';
    for (const path of header.querySelectorAll('svg path')) path.setAttribute('fill', dark ? '#000' : '#fff');
    for (const link of header.querySelectorAll('a')) link.style.color = dark ? '#000' : '#fff';
    if (logo) {
      const progress = Math.min(1, Math.max(0, (window.scrollY - 80) / 120));
      const scale = menuOpen ? 1 : Math.round((1 - (1 - (1 - progress) ** 2) * .5) * 10000) / 10000;
      logo.style.transformOrigin = 'left center'; logo.style.transform = `scale(${scale})`;
      logo.setAttribute('width', menuOpen ? '144' : '282');
    }
  };
  on(window, 'scroll', syncHeader);
  on(window, 'resize', syncHeader);
  syncHeader();
  const burger = header.querySelector('svg.md\\:hidden');
  const headerClass = header.className;
  const toggleMenu = () => {
    menuOpen = !menuOpen;
    burger?.setAttribute('aria-expanded', String(menuOpen));
    const existing = header.querySelector('[data-scout-menu]');
    if (existing) { existing.remove(); header.className = headerClass; header.style.zIndex = ''; document.body.style.overflow = ''; syncHeader(); return; }
    header.classList.add('h-screen', 'flex-col', 'items-start', 'w-screen');
    header.style.zIndex = '100';
    const menu = document.createElement('nav');
    menu.dataset.scoutMenu = '';
    menu.className = 'flex py-[32px] h-full gap-[50px] items-start justify-start font-[600] uppercase w-full text-black text-[23px] flex-col';
    menu.innerHTML = '<div class="flex flex-col gap-[15px]"><a class="font-grotesk" href="/directory">Directory</a><a class="font-grotesk" href="/get-scouted">GET SCOUTED</a></div><div class="flex flex-col gap-[15px]"><a class="font-grotesk" href="https://www.instagram.com/imgmodels">INSTAGRAM</a><a class="font-grotesk" href="https://www.facebook.com/IMGmodels">FACEBOOK</a><a class="font-grotesk" href="https://x.com/imgmodels">X</a></div>';
    const columns = document.createElement('div');
    columns.className = 'font-grotesk font-[300] flex flex-col md:flex-row gap-[50px] overflow-scroll w-full min-h-[120px] justify-start items-start';
    // The source navigation repeats its policy/social columns below the menu.
    for (const source of root.querySelector('footer')?.children || []) columns.append(source.cloneNode(true));
    const [firstColumn, secondColumn] = columns.children;
    if (firstColumn && secondColumn) {
      [...firstColumn.querySelectorAll('a')].find(link => link.textContent.trim() === 'SITE CREDITS')?.remove();
      const copyright = document.createElement('span'); copyright.className = 'font-grotesk';
      copyright.textContent = 'COPYRIGHT IMG WORLDWIDE, INC'; firstColumn.append(copyright);
      secondColumn.querySelector('p')?.remove();
      [...secondColumn.querySelectorAll('a')].find(link => link.textContent.trim() === 'NEW YORK STATE FASHION WORKERS ACT')?.remove();
      const credits = document.createElement('a'); credits.className = 'font-grotesk'; credits.href = 'https://projectsimply.com/'; credits.textContent = 'SITE CREDITS'; secondColumn.append(credits);
    }
    menu.append(columns);
    header.insertBefore(menu, header.children[1]);
    document.body.style.overflow = 'hidden'; window.scrollTo(0, 0); syncHeader();
  };
  burger?.setAttribute('role', 'button'); burger?.setAttribute('tabindex', '0'); burger?.setAttribute('aria-label', 'Toggle navigation');
  on(burger, 'click', toggleMenu);
  on(burger, 'keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleMenu(); } });

  function status(form, text) {
    let output = form.querySelector('.scout-status');
    if (!output) { output = document.createElement('p'); output.className = 'scout-status'; output.setAttribute('role', 'status'); form.append(output); }
    output.textContent = text;
    output.scrollIntoView({behavior: 'smooth', block: 'center'});
  }
  function configureFields(form) {
    form.noValidate = true;
    for (const input of form.querySelectorAll('input,select')) {
      input.required = false;
      if (input.tagName === 'SELECT') input.value = '';
      if (!input.getAttribute('aria-label')) input.setAttribute('aria-label', input.placeholder || input.name);
    }
  }
  const form = adult.querySelector('form');
  configureFields(form);
  const date=form.querySelector('[name="birthdate"]');
  const updateDateError=()=>{
    const message=!date.value?'birthdate is a required field':new Date(date.value)>new Date(Date.now()-567648000000)?'You must be at least 18 years':'';
    let error=date.parentElement.querySelector('[data-scout-date-error]');
    if(!message){error?.remove();return;}
    if(!error){error=document.createElement('p');error.dataset.scoutDateError='';error.className='text-[12px] text-red-500';date.parentElement.append(error);}
    error.textContent=message;
  };
  on(form,'input',updateDateError);
  on(form,'change',updateDateError);
  const mark = (input, invalid) => {
    input.classList.toggle('scout-invalid', invalid);
    input.setAttribute('aria-invalid', String(invalid));
  };
  const selected = new WeakMap();
  const inches = cm => {
    const value = Math.round(.393700787 * parseInt(cm) * 2) / 2, feet = Math.floor(value / 12), remainder = value % 12;
    return `${feet}' ${remainder ? String(remainder).replace('.5', '½') : ''}`;
  };
  function autocomplete(input, rows, text, value) {
    let box;
    const close = () => { box?.remove(); box = null; input.setAttribute('aria-expanded', 'false'); };
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
    on(input, 'input', () => {
      close(); selected.delete(input);
      const query = input.value.toLowerCase();
      if (!query) return;
      box = document.createElement('div');
      box.className = 'scout-suggestions w-full lg:max-w-[449px] text-[11px] lg:text-[16px] h-full mt-[10px] lg:mt-[35px] gap-[5px] flex flex-col max-h-[100px] md:!max-h-[50px] lg:max-h-[220px] lg:absolute overflow-auto';
      box.setAttribute('role', 'listbox');
      const renderRows=values=>{
      box.replaceChildren();
      for (const row of values) {
        const option = document.createElement('div'); option.className = 'flex cursor-pointer hover:bg-gray-200';
        if (input.id === 'location') option.classList.add('min-h-[20px]');
        option.setAttribute('role', 'option'); option.tabIndex = -1;
        if (input.id === 'height') option.innerHTML = `<p class="w-[60px]">${row}cm</p><p class="w-[20px] flex items-center justify-center">|</p><p>${inches(row)}</p>`;
        else { const label = document.createElement('p'); label.className = 'w-full flex'; label.textContent = text(row); option.append(label); }
        on(option, 'mousedown', event => event.preventDefault());
        on(option, 'click', () => { input.value = value(row); selected.set(input, input.value); mark(input, false); close(); input.focus(); });
        on(option, 'keydown', event => {
          if (event.key === 'Enter') { event.preventDefault(); option.click(); }
          if (event.key === 'ArrowDown') { event.preventDefault(); option.nextElementSibling?.focus(); }
          if (event.key === 'ArrowUp') { event.preventDefault(); option.previousElementSibling?.focus(); }
        });
        box.append(option);
      }
      if (input.id === 'location' && box.childElementCount === 0) {
        const notice = document.createElement('p');
        notice.setAttribute('role', 'status');
        notice.textContent = 'Location search uses a local snapshot. This location is unavailable in the preview.';
        box.append(notice);
      }
      };
      const matches=rows.filter(row=>text(row).toLowerCase().includes(query));
      renderRows(input.id==='nationality'?rows:matches);
      if(input.id==='nationality'){
        // The source shows its preceding results while a 300ms debounced
        // nationality request completes, then displays the filtered list.
        const currentBox=box;
        setTimeout(()=>{if(!signal.aborted&&box===currentBox&&box.isConnected)renderRows(matches);},300);
      }
      input.parentElement.append(box); input.setAttribute('aria-expanded', 'true');
    });
    on(input, 'keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); box?.firstElementChild?.focus(); }
      if (event.key === 'Escape') close();
    });
    on(input, 'blur', () => setTimeout(() => {
      if (signal.aborted || box?.contains(document.activeElement)) return;
      if (!selected.has(input)) input.value = '';
      mark(input, !selected.has(input)); close();
    }, 200));
  }
  autocomplete(form.querySelector('#height'), Array.from({length:81}, (_, i) => String(160 + i * .5)), row => `${row} ${inches(row)}`, row => `${row} | ${inches(row)}`);
  autocomplete(form.querySelector('#nationality'), lookup.nationalities, row => row.name, row => row.name);
  const cityText = row => `${row.name}, ${row.adminName1 ? row.adminName1 + ',' : ''} ${row.countryName}`;
  autocomplete(form.querySelector('#location'), lookup.cities, cityText, cityText);
  function validateAdult(input) {
    let valid = /fields_9|fields_10/.test(input.name) || Boolean(input.value.trim());
    if (input.id === 'email') valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
    if (input.name === 'birthdate') valid = Boolean(input.value) && new Date(input.value) <= new Date(Date.now() - 567648000000);
    if (['height', 'nationality', 'location'].includes(input.id)) valid = selected.has(input);
    mark(input, !valid); return valid;
  }
  for (const input of form.querySelectorAll('input:not([type="file"])')) on(input, 'blur', () => validateAdult(input));
  for (const input of form.querySelectorAll('input[type="file"]')) {
    const preview = input.parentElement.querySelector('label img');
    const originalPreview = preview?.getAttribute('src');
    on(input, 'change', () => {
      const file = input.files?.[0];
      const [typeError, sizeError] = input.parentElement.querySelectorAll('p');
      typeError.classList.add('hidden'); sizeError.classList.add('hidden');
      if (!file) return;
      const validType = ['jpeg', 'webp', 'heic', 'tiff', 'avif', 'png'].includes(file.type.split('/')[1]);
      const validSize = Math.round(file.size / 1e6) <= 30;
      if (!validType || !validSize) {
        (validType ? sizeError : typeError).classList.remove('hidden'); input.dataset.valid = 'false';
        if (preview) preview.src = originalPreview;
        return;
      }
      const url = URL.createObjectURL(file);
      objectUrls.add(url);
      if (preview) { preview.src = url; preview.classList.remove('scout-invalid-image'); }
      input.dataset.valid = 'true';
    });
  }
  on(form, 'submit', event => {
    event.preventDefault();
    updateDateError();
    let valid = true;
    for (const input of form.querySelectorAll('input:not([type="file"])')) valid = validateAdult(input) && valid;
    for (const input of form.querySelectorAll('input[type="file"]')) {
      const missing = input.dataset.valid !== 'true';
      input.parentElement.querySelector('label img')?.classList.toggle('scout-invalid-image', missing); valid = !missing && valid;
    }
    if (!valid) return;
    status(form, 'Your application is ready in this local preview. It has not been sent to IMG Models.');
  });
  configureFields(minor);
  const oneGuardian = minor.querySelector('#conf');
  const guardian2 = minor.querySelector('[name="guardian[1].firstname"]')?.closest('.flex.flex-col');
  on(oneGuardian, 'change', () => {
    if (!guardian2) return;
    guardian2.hidden = oneGuardian.checked;
  });
  for (const input of minor.querySelectorAll('input:not([type="checkbox"]),select')) on(input, 'input', () => {
    const valid = /email/.test(input.name) ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value) : Boolean(input.value.trim());
    mark(input, !valid);
  });
  on(minor, 'submit', event => {
    event.preventDefault();
    let valid = true;
    for (const input of minor.querySelectorAll('input:not([type="checkbox"]),select')) {
      if (oneGuardian.checked && input.name.startsWith('guardian[1]')) continue;
      const current = /email/.test(input.name) ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value) : Boolean(input.value.trim());
      mark(input, !current); valid = current && valid;
    }
    if (!valid) return;
    status(minor, 'Guardian details are complete in this local preview. No permission request has been sent.');
  });
  for (const video of root.querySelectorAll('video')) video.play().catch(() => {});
  return () => {
    controller.abort();
    document.body.style.overflow = originalOverflow;
    for (const url of objectUrls) URL.revokeObjectURL(url);
    for (const video of root.querySelectorAll('video')) video.pause();
  };
}
