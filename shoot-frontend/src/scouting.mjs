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
  const originalOverflow = document.body.style.overflow;
  const objectUrls = new Set();
  let age = null, expanded = false;
  document.body.style.overflow = 'hidden';
  disclaimer.hidden = false;
  disclaimer.style.opacity = '1';
  gate.hidden = false;
  gate.style.opacity = '1';
  adult.hidden = true;
  minor.hidden = true;

  const acknowledge = () => { disclaimer.hidden = true; toggle.focus(); };
  on(ack, 'click', acknowledge);
  on(ack, 'keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); acknowledge(); }
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
    label.textContent = age < 14 ? 'Under 14 years old' : age + ' yrs old';
    closeOptions();
    if (age < 14) return;
    gate.hidden = true;
    adult.hidden = age < 18;
    minor.hidden = age >= 18;
    document.body.style.overflow = '';
    window.scrollTo(0, 0);
  }
  on(toggle, 'click', event => {
    if (event.target.closest('[data-age-value]')) return;
    if (expanded) { closeOptions(); return; }
    expanded = true;
    toggle.setAttribute('aria-expanded', 'true');
    label.classList.add('mb-[10px]');
    for (let value = 13; value <= 100; value++) {
      const option = document.createElement('span');
      option.className = 'scout-age-option';
      option.dataset.ageValue = value;
      option.tabIndex = 0;
      option.setAttribute('role', 'option');
      option.textContent = value < 14 ? 'Under 14 years old' : value + ' yrs old';
      on(option, 'click', event => { event.stopPropagation(); selectAge(value); });
      on(option, 'keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); selectAge(value); }
      });
      options.append(option);
    }
  });

  on(root.querySelector('[data-scout-hero]'), 'click', () => {
    if (gate.hidden) (age < 18 ? minor : adult).scrollIntoView({behavior: 'smooth'});
  });
  const home = root.querySelector('[data-scout-home]');
  on(home, 'click', () => window.F01Navigate('/home'));
  on(home, 'keydown', event => { if (event.key === 'Enter') window.F01Navigate('/home'); });
  const syncHeader = () => {
    const dark = window.scrollY > innerHeight - 70;
    header.style.background = dark ? '#fff' : 'transparent';
    for (const path of header.querySelectorAll('svg path')) path.setAttribute('fill', dark ? '#161616' : '#fff');
    for (const link of header.querySelectorAll('a')) link.style.color = dark ? '#161616' : '#fff';
  };
  on(window, 'scroll', syncHeader);
  syncHeader();
  const burger = header.querySelector('svg.md\\:hidden');
  on(burger, 'click', () => {
    const existing = root.querySelector('.scout-mobile-menu');
    if (existing) { existing.remove(); return; }
    const menu = document.createElement('nav');
    menu.className = 'scout-mobile-menu';
    menu.innerHTML = '<a href="/directory">Directory</a><a href="/get-scouted">Get Scouted</a><a href="/contact">Contact</a><a href="/home">Home</a>';
    root.append(menu);
  });

  function status(form, text) {
    let output = form.querySelector('.scout-status');
    if (!output) { output = document.createElement('p'); output.className = 'scout-status'; output.setAttribute('role', 'status'); form.append(output); }
    output.textContent = text;
    output.scrollIntoView({behavior: 'smooth', block: 'center'});
  }
  function configureFields(form) {
    for (const input of form.querySelectorAll('input,select')) {
      if (!['checkbox', 'file'].includes(input.type) && !/fields_9|fields_10/.test(input.name)) input.required = true;
      if (/email/i.test(input.name + input.id)) input.type = 'email';
      if (/phone/i.test(input.name)) input.type = 'tel';
      if (!input.getAttribute('aria-label')) input.setAttribute('aria-label', input.placeholder || input.name);
    }
  }
  const form = adult.querySelector('form');
  configureFields(form);
  const birthdate = form.querySelector('[name="birthdate"]');
  if (birthdate) birthdate.max = new Date().toISOString().slice(0, 10);
  for (const input of form.querySelectorAll('input[type="file"]')) {
    input.required = true;
    on(input, 'change', () => {
      input.setCustomValidity('');
      const file = input.files?.[0];
      if (!file) return;
      if (!/\.(webp|png|jpe?g|avif|tiff?|heic)$/i.test(file.name)) input.setCustomValidity('We do not support this image type');
      if (file.size > 30 * 1024 * 1024) input.setCustomValidity('Images cannot be over 30 MB');
      if (!input.reportValidity()) return;
      const url = URL.createObjectURL(file);
      objectUrls.add(url);
      const preview = input.parentElement.querySelector('label img');
      if (preview) preview.src = url;
    });
  }
  on(form, 'submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    status(form, 'Your application is ready in this local preview. It has not been sent to IMG Models.');
  });
  configureFields(minor);
  const oneGuardian = minor.querySelector('#conf');
  const guardian2 = minor.querySelector('[name="guardian[1].firstname"]')?.closest('.flex.flex-col');
  on(oneGuardian, 'change', () => {
    if (!guardian2) return;
    guardian2.hidden = oneGuardian.checked;
    for (const input of guardian2.querySelectorAll('input,select')) input.required = !oneGuardian.checked;
  });
  on(minor, 'submit', event => {
    event.preventDefault();
    if (!minor.reportValidity()) return;
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
