// The captured consent interface is a local simulation. Choices are stored only
// in this browser; this module never enables analytics or contacts consent APIs.
const STORAGE_KEY = 'f01-cookie-consent';
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const readSaved = (key = STORAGE_KEY) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
};
const writeSaved = (value, key = STORAGE_KEY) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* The interface also works when browser storage is unavailable. */ }
};
const visible = element => Boolean(element.getClientRects().length)
  && getComputedStyle(element).visibility !== 'hidden'
  && !element.closest('[inert], [aria-hidden="true"]');

let currentConsent;
let generation = 0;
export function clearConsent(retainVariant) {
  if (retainVariant && currentConsent?.variant === retainVariant) return;
  generation++;
  currentConsent?.dispose();
  currentConsent = null;
}

export async function setupConsent({variant = 'img'} = {}) {
  if (currentConsent?.variant === variant && currentConsent.root.isConnected) return currentConsent;
  clearConsent();
  const version = generation;
  const source = variant === 'wme' ? '/data/pages/cookie-wme.json' : '/data/pages/cookie.json';
  const {html, hostDetails = {}} = await fetch(source).then(response => response.json());
  if (version !== generation) return;
  const storageKey = variant === 'wme' ? `${STORAGE_KEY}-wme` : STORAGE_KEY;
  const events = new AbortController();
  const listen = (target, name, handler, options = {}) => target?.addEventListener(name, handler, {
    ...(typeof options === 'boolean' ? {capture: options} : options), signal: events.signal,
  });
  const fragment = document.createElement('template'); fragment.innerHTML = html;
  // OneTrust's blank text measurement frame is unnecessary for the local
  // consent controller, which sizes the captured dialog itself.
  fragment.content.querySelectorAll('iframe.ot-text-resize').forEach(frame => frame.remove());
  document.body.append(fragment.content);
  const root = document.querySelector('#onetrust-consent-sdk');
  if (!root) return;
  root.dataset.localConsentReady = 'true';
  const find = selector => root.querySelector(selector);
  const banner = find('#onetrust-banner-sdk');
  const panel = find('#onetrust-pc-sdk');
  const backdrop = find('.onetrust-pc-dark-filter') || document.querySelector('.onetrust-pc-dark-filter');
  const content = find('#ot-pc-content');
  const list = find('#ot-pc-lst');
  const filter = find('#ot-fltr-modal');
  const filterAnchor = find('#ot-anchor');
  const hostList = find('#ot-host-lst');
  const search = find('#vendor-search-handler');
  const status = find('.ot-search-cntr [role="status"]');
  const switches = [...root.querySelectorAll('.category-switch-handler')];
  const groups = [...root.querySelectorAll('.ot-cat-item[data-optanongroupid]')].map(element => ({
    id: element.dataset.optanongroupid,
    name: element.querySelector('.ot-cat-header')?.textContent.trim() || '',
    element,
  }));
  let saved = readSaved(storageKey);
  let isOpen = false, listOpen = false, filterOpen = false;
  let returnFocus = null, detailsTrigger = null, selectedGroup = '';
  let activeFilters = new Set();
  let previousOverflow = '';
  let previousHtmlOverflow = '';
  const inertStates = new Map();
  const hasCapturedHosts = Object.keys(hostDetails).length > 0;

  function display(element, show, value = 'block') {
    if (!element) return;
    element.classList.toggle('ot-hide', !show);
    element.style.display = show ? value : 'none';
    element.setAttribute('aria-hidden', String(!show));
  }
  function syncSwitch(input) {
    input.setAttribute('aria-checked', String(input.checked));
    // The native checkbox is the accessible switch; the copied knob is visual.
    const knob = input.parentElement.querySelector('.ot-switch-nob');
    if (knob) { knob.setAttribute('aria-checked', String(input.checked)); knob.setAttribute('aria-hidden', 'true'); }
  }
  function restoreChoices() {
    for (const input of switches) {
      const id = input.dataset.optanongroupid;
      input.checked = saved?.value === 'all' || (saved?.value === 'custom' && saved.choices?.[id] === true);
      syncSwitch(input);
    }
    display(find('.ot-optout-signal'), saved?.value === 'essential'
      || (saved?.value === 'custom' && switches.every(input => !input.checked))
      || navigator.globalPrivacyControl === true);
  }
  function filterChoices() {
    return [...root.querySelectorAll('.category-filter-handler')];
  }
  function applyHostFilters(announce = false) {
    const query = search?.value.trim().toLocaleLowerCase() || '';
    let count = 0;
    if (hasCapturedHosts && hostList) {
      // The SDK groups first-party cookies from the selected categories under
      // one host. Keep the actual public host/cookie records from the capture.
      const hosts = new Map();
      for (const [category, html] of Object.entries(hostDetails)) {
        if (activeFilters.size && !activeFilters.has(category)) continue;
        const template = document.createElement('template');
        template.innerHTML = html;
        for (const item of template.content.children) {
          const name = item.querySelector('.ot-host-name')?.textContent.trim() || '';
          // OneTrust searches host labels, rather than cookie descriptions.
          if (query && !name.toLocaleLowerCase().includes(query)) continue;
          const existing = hosts.get(name);
          if (existing) {
            const cookies = existing.querySelector('.ot-host-opt');
            for (const cookie of item.querySelectorAll('.ot-host-info')) {
              if (![...cookies.children].some(row => row.textContent === cookie.textContent)) cookies.append(cookie);
            }
          } else hosts.set(name, item);
        }
      }
      hostList.replaceChildren(...hosts.values());
      hostList.style.display = 'block';
      for (const [index, item] of [...hostList.children].entries()) {
        const button = item.querySelector('.ot-host-box');
        const region = item.querySelector('.ot-acc-txt');
        if (!button || !region) continue;
        button.id = `f01-cookie-host-${index}`;
        region.id = `f01-cookie-host-details-${index}`;
        button.setAttribute('aria-controls', region.id);
        button.setAttribute('aria-expanded', 'false');
        region.setAttribute('aria-labelledby', button.id);
        region.setAttribute('aria-hidden', 'true');
      }
      count = hosts.size;
      find('#no-results')?.remove();
      if (!count && query) {
        const empty = document.createElement('div'); empty.id = 'no-results';
        const text = document.createElement('p');
        const value = document.createElement('span'); value.id = 'user-text'; value.textContent = search.value.trim();
        text.append(value, ' did not match any Hosts.'); empty.append(text);
        find('#ot-lst-cnt')?.append(empty);
      }
      display(find('#ot-sel-blk'), Boolean(hostList.querySelector('input[type="checkbox"]')));
      if (status) status.textContent = announce && count ? `${count} ${count === 1 ? 'host' : 'hosts'} returned.` : '';
      return;
    }
    for (const item of hostList?.children || []) {
      const category = item.dataset.optanongroupid || item.dataset.parentId || selectedGroup;
      const show = (!query || item.textContent.toLocaleLowerCase().includes(query))
        && (!activeFilters.size || activeFilters.has(category));
      item.hidden = !show;
      if (show) count++;
    }
    if (status) status.textContent = hostList?.children.length
      ? `${count} results`
      : 'Cookie host details were not captured in this local snapshot.';
  }
  function showFilter(open, restoreFocus = true) {
    filterOpen = open;
    display(filter, open);
    if (filterAnchor) filterAnchor.style.display = open ? 'block' : 'none';
    panel?.classList.toggle('ot-shw-fltr', open);
    find('#filter-btn-handler')?.setAttribute('aria-expanded', String(open));
    if (open) {
      if (hasCapturedHosts) find('#clear-filters-handler').textContent = 'Clear Filters';
      for (const input of filterChoices()) input.checked = activeFilters.has(input.value);
      find('#clear-filters-handler')?.focus();
    } else if (restoreFocus && isOpen && listOpen) find('#filter-btn-handler')?.focus();
  }
  function showDetails(open, trigger = null, restoreFocus = true) {
    showFilter(false, false);
    listOpen = open;
    display(content, !open);
    display(list, open);
    if (open) {
      detailsTrigger = trigger || detailsTrigger;
      selectedGroup = detailsTrigger?.dataset.parentId || '';
      activeFilters = new Set(selectedGroup ? [selectedGroup] : []);
      if (search) search.value = '';
      list.classList.toggle('ot-hosts-ui', hasCapturedHosts);
      list.dataset.localSnapshot = hasCapturedHosts || hostList?.children.length ? 'captured' : 'host-details-unavailable';
      display(find('#ot-sel-blk'), false);
      applyHostFilters();
      (hasCapturedHosts ? search : find('.back-btn-handler'))?.focus();
    } else if (restoreFocus && isOpen) detailsTrigger?.focus();
  }
  function setBackgroundInert(open) {
    if (open) {
      previousOverflow = document.body.style.overflow;
      previousHtmlOverflow = document.documentElement.style.overflow;
      // The reference keeps the page scrollbar in its full-screen mobile
      // preference center, and removes it for the floating desktop dialog.
      if (variant === 'wme' || !mobileLayout()) {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
      }
      for (const child of document.body.children) {
        if (child === root || child.contains(panel) || child === backdrop) continue;
        inertStates.set(child, child.inert); child.inert = true;
      }
      if (banner) { inertStates.set(banner, banner.inert); banner.inert = true; }
    } else {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      for (const [element, inert] of inertStates) element.inert = inert;
      inertStates.clear();
    }
  }
  function mobileLayout() {
    return matchMedia('(max-width: 600px), (max-width: 896px) and (max-height: 425px) and (orientation: landscape)').matches;
  }
  function sizePreferences() {
    if (!panel) return;
    if (mobileLayout()) panel.style.height = '100%';
    else if (variant === 'wme' && content) {
      // OneTrust sizes the WME dialog to its intrinsic body, header and footer,
      // capped at 80vh. Its content is otherwise absolutely stretched, so first
      // measure without the bottom constraint, then restore the captured CSS.
      const bottom = content.style.bottom;
      const height = content.style.height;
      content.style.bottom = 'auto';
      content.style.height = 'auto';
      const natural = content.scrollHeight + (find('.ot-pc-header')?.clientHeight || 0)
        + (find('.ot-pc-footer')?.clientHeight || 0) + 20;
      content.style.bottom = bottom;
      content.style.height = height;
      panel.style.height = `${Math.min(innerHeight * 0.8, natural)}px`;
    } else panel.style.height = `${innerHeight * 0.8}px`;
    panel.classList.toggle('ot-ftr-stacked', innerWidth <= 476);
  }
  function openPreferences() {
    if (!panel || isOpen) return;
    saved = readSaved(storageKey); restoreChoices();
    returnFocus = document.activeElement;
    isOpen = true;
    showDetails(false, null, false);
    setBackgroundInert(true);
    display(panel, true);
    sizePreferences();
    display(backdrop, true);
    panel.querySelector('[role="alertdialog"]')?.setAttribute('aria-modal', 'true');
    find('#accept-recommended-btn-handler')?.focus();
  }
  function closePreferences() {
    if (!isOpen) return;
    showFilter(false, false);
    isOpen = false;
    display(panel, false); display(backdrop, false);
    setBackgroundInert(false);
    if (returnFocus?.isConnected && returnFocus !== document.body && visible(returnFocus)) returnFocus.focus();
    else {
      const main = document.querySelector('main');
      if (main) { main.tabIndex = -1; main.focus({preventScroll: true}); }
    }
  }
  function save(value) {
    const choices = {'1': true};
    for (const input of switches) {
      if (value !== 'custom') input.checked = value === 'all';
      syncSwitch(input); choices[input.dataset.optanongroupid] = input.checked;
    }
    saved = {value, choices, at: new Date().toISOString(), source: 'local-simulation'};
    writeSaved(saved, storageKey);
    display(banner, false);
    closePreferences();
  }

  // Build category filters from labels already present in the captured dialog.
  const filterOptions = find('.ot-fltr-opts');
  const optionTemplate = filterOptions?.querySelector('.ot-fltr-opt');
  if (filterOptions && optionTemplate) {
    filterOptions.replaceChildren();
    for (const group of groups) {
      const option = optionTemplate.cloneNode(true);
      const input = option.querySelector('input');
      input.id = `f01-cookie-filter-${group.id}`; input.value = group.id; input.checked = false;
      input.dataset.optanongroupid = group.id;
      option.querySelector('label')?.setAttribute('for', input.id);
      option.querySelector('.ot-label-txt').textContent = group.name;
      const labelStatus = option.querySelector('.ot-label-status'); if (labelStatus) labelStatus.textContent = '';
      filterOptions.append(option);
    }
  }
  for (const button of root.querySelectorAll('[ot-accordion="true"]')) {
    const region = document.getElementById(button.getAttribute('aria-controls'));
    region?.setAttribute('aria-hidden', String(button.getAttribute('aria-expanded') !== 'true'));
  }
  filter?.setAttribute('role', 'dialog'); filter?.setAttribute('aria-label', 'Filter');
  find('#filter-btn-handler')?.setAttribute('aria-controls', 'ot-fltr-modal');
  restoreChoices(); display(panel, false); display(backdrop, false); showFilter(false, false);
  display(banner, !saved);

  window.OneTrust = {...window.OneTrust, ToggleInfoDisplay: openPreferences};
  window.Optanon = {...window.Optanon, ToggleInfoDisplay: openPreferences};
  listen(document, 'click', event => {
    const target = event.target.closest('button,a'); if (!target) return;
    if (target.matches('#onetrust-pc-btn-handler, .ot-sdk-show-settings, .optanon-show-settings')) {
      event.preventDefault(); openPreferences(); return;
    }
    if (!root.contains(target)) return;
    if (target.matches('#onetrust-accept-btn-handler, #accept-recommended-btn-handler')) { event.preventDefault(); save('all'); }
    else if (target.matches('#onetrust-reject-all-handler, .ot-pc-refuse-all-handler')) { event.preventDefault(); save('essential'); }
    else if (target.matches('.save-preference-btn-handler')) { event.preventDefault(); save('custom'); }
    else if (target.matches('#close-pc-btn-handler')) { event.preventDefault(); closePreferences(); }
    else if (target.matches('.banner-close-button')) { event.preventDefault(); display(banner, false); }
    else if (target.matches('[ot-accordion="true"], .ot-host-box')) {
      event.preventDefault();
      const expanded = target.getAttribute('aria-expanded') !== 'true';
      target.setAttribute('aria-expanded', String(expanded));
      document.getElementById(target.getAttribute('aria-controls'))?.setAttribute('aria-hidden', String(!expanded));
    } else if (target.matches('.category-host-list-handler')) { event.preventDefault(); showDetails(true, target); }
    else if (target.matches('.back-btn-handler')) { event.preventDefault(); showDetails(false); }
    else if (target.matches('#filter-btn-handler')) { event.preventDefault(); showFilter(!filterOpen); }
    else if (target.matches('#clear-filters-handler')) {
      event.preventDefault(); for (const input of filterChoices()) input.checked = false;
    } else if (target.matches('#filter-apply-handler')) {
      event.preventDefault(); activeFilters = new Set(filterChoices().filter(input=>input.checked).map(input=>input.value));
      applyHostFilters(true); showFilter(false);
    } else if (target.matches('#filter-cancel-handler')) { event.preventDefault(); showFilter(false); }
  });
  listen(root, 'change', event => {
    if (event.target.matches('.category-switch-handler')) syncSwitch(event.target);
    if (event.target.matches('#select-all-hosts-groups-handler, #select-all-vendor-groups-handler, #select-all-vendor-leg-handler')) {
      for (const input of hostList?.querySelectorAll('input[type="checkbox"]') || []) {
        input.checked = event.target.checked; input.dispatchEvent(new Event('change', {bubbles: true}));
      }
    }
  });
  listen(search, 'input', () => applyHostFilters(true));
  listen(document, 'keydown', event => {
    if (!isOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation();
      if (filterOpen) showFilter(false); else if (listOpen) showDetails(false); else closePreferences();
      return;
    }
    if (event.key !== 'Tab') return;
    const scope = filterOpen ? filter : panel;
    const controls = [...scope.querySelectorAll(FOCUSABLE)].filter(visible);
    const first = controls[0], last = controls.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || !scope.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !scope.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }, true);
  listen(document, 'focusin', event => {
    if (!isOpen || panel.contains(event.target)) return;
    (filterOpen ? find('#clear-filters-handler') : find('#close-pc-btn-handler'))?.focus();
  });
  listen(window, 'resize', () => { if (isOpen) sizePreferences(); });
  for (const name of ['wheel', 'touchmove']) listen(document, name, event => {
    if (isOpen && !panel.contains(event.target)) event.preventDefault();
  }, {passive: false});
  currentConsent = {variant, root, open: openPreferences, close: closePreferences, dispose: () => {
    closePreferences();
    events.abort();
    root.remove();
    if (window.OneTrust?.ToggleInfoDisplay === openPreferences) delete window.OneTrust.ToggleInfoDisplay;
    if (window.Optanon?.ToggleInfoDisplay === openPreferences) delete window.Optanon.ToggleInfoDisplay;
  }};
  return currentConsent;
}
