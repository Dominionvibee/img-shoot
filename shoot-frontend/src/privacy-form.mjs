// Form details remain local; submitting only displays the existing preview.
export function setupPrivacyForm(root) {
  const form = root.querySelector('form[data-local-preview]');
  if (!form) return () => {};
  const controller = new AbortController();
  const {signal} = controller;
  const on = (target, name, callback) => target?.addEventListener(name, callback, {signal});
  const first = root.querySelector('#firstNameDSARElement');
  const last = root.querySelector('#lastNameDSARElement');
  const email = root.querySelector('#emailDSARElement');
  const country = root.querySelector('#countryDSARElement');
  const phone = root.querySelector('#phoneNumberDSARElement');
  const prefix = root.querySelector('#vt-input-5');
  const button = root.querySelector('#dsar-webform-submit-button');
  const result = root.querySelector('.privacy-local-result');
  const clearCountry = root.querySelector('[title="Clear the Country field"]');
  const overlay = document.createElement('div');
  overlay.className = 'cdk-overlay-container';
  document.body.append(overlay);
  let submitting = false;
  let countries = [];
  let phoneCodes = [];
  let openInput;
  let selectedIndex = -1;
  let visibleOptions = [];
  const touched = new Set();
  const required = [first, last, email, country];
  const errorId = new Map([[first,'firstNameerror'],[last,'lastNameerror'],[email,'emailerror'],[country,'countryerror'],[phone,'phoneNumbererror']]);
  const validCountry = () => countries.includes(country.value);
  const valid = input => {
    if (input === country) return validCountry();
    if (input === phone) return !input.value || /^\d{1,15}$/.test(input.value);
    return input.validity.valid && Boolean(input.value.trim());
  };
  const update = () => {
    button.disabled = submitting || required.some(input => !valid(input)) || !valid(phone);
    button.setAttribute('aria-busy',String(submitting));
    clearCountry.setAttribute('aria-disabled', String(!country.value));
    for (const input of [...required, phone]) {
      const invalid = touched.has(input) && !valid(input);
      input.setAttribute('aria-invalid', String(invalid));
      input.classList.toggle('ng-invalid', !valid(input));
      input.classList.toggle('ng-valid', valid(input));
      input.classList.toggle('border-has-error', invalid);
      const error = root.querySelector('#'+errorId.get(input));
      // The captured form displays this text for empty required fields. Its
      // invalid email/phone state marks aria-invalid without a visible message.
      if (error) error.textContent = invalid && !input.value.trim() ? 'This field is required' : '';
    }
  };
  const close = () => {
    openInput?.setAttribute('aria-expanded','false');
    openInput?.removeAttribute('aria-activedescendant');
    overlay.replaceChildren();
    openInput = undefined;
    selectedIndex = -1;
  };
  const choose = value => {
    const input = openInput;
    if (!input) return;
    input.value = value;
    touched.add(input);
    close();
    input.focus();
    close();
    update();
  };
  const position = () => {
    if (!openInput) return;
    const pane = overlay.firstElementChild;
    if (!pane) return;
    const rect = openInput.getBoundingClientRect();
    pane.style.width = rect.width+'px';
    pane.style.left = rect.left+'px';
    pane.style.top = '';
    pane.style.bottom = '';
    const height = pane.getBoundingClientRect().height;
    if (innerHeight-rect.bottom < height && rect.top > height) pane.style.bottom = innerHeight-rect.top+'px';
    else pane.style.top = rect.bottom+'px';
  };
  const show = (input, filter = false) => {
    openInput = input;
    selectedIndex = -1;
    const all = input === country ? countries : phoneCodes;
    const query = filter ? input.value.trim().toLocaleLowerCase() : '';
    visibleOptions = all.filter(option => !query || option.toLocaleLowerCase().includes(query));
    const pane = document.createElement('div');pane.className = 'cdk-overlay-pane';
    const dropdown = document.createElement('div');dropdown.className = 'vt-autocomplete__dropdown vt-autocomplete-visible';
    const list = document.createElement('div');list.className = 'vt-autocomplete__listbox';list.role = 'listbox';list.id = 'privacy-options';list.setAttribute('aria-label',input.getAttribute('aria-label'));
    for (const [index, option] of visibleOptions.entries()) {
      const item = document.createElement('vt-option');item.className = 'vt-option';item.role = 'option';item.id = 'privacy-option-'+index;item.tabIndex = 0;item.setAttribute('aria-disabled','false');item.setAttribute('aria-label',option);
      const text = document.createElement('span');text.className = 'vt-option__text';text.textContent = option;item.append(text,document.createElement('div'));
      item.addEventListener('mousedown',event => {event.preventDefault();choose(option);});
      list.append(item);
    }
    dropdown.append(list);pane.append(dropdown);overlay.replaceChildren(pane);
    input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','true');position();
  };
  fetch('/assets/privacy/options.json', {signal}).then(response => {
    if (!response.ok) throw new Error('Country options are unavailable.');
    return response.json();
  }).then(options => {countries=options.countries;phoneCodes=options.phone;update();}).catch(error => {
    if (error.name !== 'AbortError') {result.hidden=false;result.textContent=error.message;}
  });
  for (const input of [...required, phone]) {
    on(input,'input',() => {input.classList.replace('ng-pristine','ng-dirty');update();});
    on(input,'blur',() => {
      touched.add(input);
      if (input === country && !validCountry()) input.value='';
      input.classList.replace('ng-untouched','ng-touched');update();
    });
  }
  for (const input of [country,prefix]) {
    on(input,'focus',() => show(input));
    on(input,'click',() => show(input));
    on(input,'input',() => show(input,true));
    on(input,'keydown',event => {
      if (event.key === 'Escape') {close();return;}
      if (event.key === 'Tab') {close();return;}
      if (!['ArrowDown','ArrowUp','Enter'].includes(event.key)) return;
      event.preventDefault();
      if (!openInput) show(input);
      if (event.key === 'Enter') {if(selectedIndex>=0)choose(visibleOptions[selectedIndex]);return;}
      if (!visibleOptions.length) return;
      selectedIndex = (selectedIndex+(event.key==='ArrowDown'?1:-1)+visibleOptions.length)%visibleOptions.length;
      const items=[...overlay.querySelectorAll('[role="option"]')];
      items.forEach((item,index)=>item.setAttribute('aria-selected',String(index===selectedIndex)));
      input.setAttribute('aria-activedescendant',items[selectedIndex].id);items[selectedIndex].scrollIntoView({block:'nearest'});
    });
  }
  on(clearCountry,'click',() => {country.value='';touched.add(country);update();country.focus();});
  on(document,'mousedown',event => {if(!overlay.contains(event.target)&&event.target!==openInput)close();});
  on(window,'resize',position);on(window,'scroll',position);
  result.id ||= 'privacy-verification-status';
  result.setAttribute('aria-live','polite');
  result.setAttribute('aria-atomic','true');
  const showMessage=(message,{focus=false}={})=>{
    result.hidden=false;result.replaceChildren();
    const text=document.createElement('p');text.textContent=message;result.append(text);
    if(focus)result.focus();
  };
  const preview = event => {
    event.preventDefault();
    if(submitting)return;
    required.forEach(input => touched.add(input));update();
    if (button.disabled) {required.find(input=>!valid(input))?.focus();return;}
    submitting=true;update();
    showMessage('Local preview only: no privacy request has been submitted or stored.',{focus:true});
    submitting=false;update();
  };
  on(form,'submit',preview);on(button,'click',preview);
  update();
  return () => {controller.abort();overlay.remove();};
}
