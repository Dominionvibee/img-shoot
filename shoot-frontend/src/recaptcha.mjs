// reCAPTCHA is enabled only by the application's public site-key configuration.
// Google verifies tokens on the backend; no secret key belongs in this module.
const rejectedTestKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const containers = new WeakMap();
let configuration;
let loader;
let loadSequence = 0;

function failure(code, message) {
  return Object.assign(new Error(message), {code});
}

function validateSiteKey(value) {
  const key = typeof value === 'string' ? value.trim() : '';
  if (key === rejectedTestKey) {
    throw failure('RECAPTCHA_TEST_KEY', 'reCAPTCHA is unavailable because a public testing key is configured. Please use the phone option shown on this page.');
  }
  if (!key) {
    throw failure('RECAPTCHA_UNCONFIGURED', 'reCAPTCHA is unavailable because it has not been configured. Please use the phone option shown on this page.');
  }
  return key;
}

async function siteKey() {
  const buildKey = import.meta.env?.VITE_RECAPTCHA_SITE_KEY;
  if (typeof buildKey === 'string' && buildKey.trim()) return validateSiteKey(buildKey);
  if (configuration) return configuration;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  const request = (async () => {
    let response;
    let value;
    try {
      response = await fetch('/api/recaptcha/config', {
        headers:{Accept:'application/json'}, credentials:'same-origin', cache:'no-store', signal:controller.signal,
      });
      if (!response.ok) throw new Error('Configuration request failed');
      value = await response.json();
    } catch {
      throw failure('RECAPTCHA_CONFIG', 'reCAPTCHA configuration could not load. Please retry or use the phone option shown on this page.');
    }
    const key = validateSiteKey(value?.siteKey);
    if (value.configured !== true) {
      throw failure('RECAPTCHA_UNCONFIGURED', 'reCAPTCHA is unavailable because it has not been configured. Please use the phone option shown on this page.');
    }
    return key;
  })();
  configuration = request;
  try { return await request; }
  finally {
    window.clearTimeout(timeout);
    if (configuration === request) configuration = undefined;
  }
}

function apiReady() {
  return typeof window.grecaptcha?.render === 'function' && typeof window.grecaptcha?.reset === 'function';
}

function loadRecaptcha() {
  if (loader) return loader.promise;
  if (apiReady()) return Promise.resolve(window.grecaptcha);
  const script = document.createElement('script');
  const callback = `F01RecaptchaReady_${++loadSequence}`;
  let resolve;
  let reject;
  const state = {promise:new Promise((yes, no) => {resolve=yes;reject=no;}), script};
  loader = state;
  let settled = false;
  const finish = error => {
    if (settled || loader !== state) return;
    settled = true;
    window.clearTimeout(timeout);
    script.onload = script.onerror = null;
    // A timed-out script can still finish downloading after removal. Its unique
    // callback remains a no-op so it cannot resolve a newer loading attempt.
    window[callback] = () => {};
    loader = undefined;
    if (error) {script.remove();reject(error);}
    else resolve(window.grecaptcha);
  };
  const timeout = window.setTimeout(() => finish(failure('RECAPTCHA_LOAD', 'reCAPTCHA could not load. Please retry or use the phone option shown on this page.')), 20000);
  window[callback] = () => {
    finish(apiReady() ? null : failure('RECAPTCHA_LOAD', 'reCAPTCHA did not initialize. Please retry or use the phone option shown on this page.'));
  };
  script.id = 'f01-recaptcha-api';
  script.src = `https://www.google.com/recaptcha/api.js?onload=${callback}&render=explicit&hl=en`;
  script.async = true;
  script.defer = true;
  script.onerror = () => finish(failure('RECAPTCHA_LOAD', 'reCAPTCHA could not connect. Please retry or use the phone option shown on this page.'));
  document.head.append(script);
  return state.promise;
}

function widgetSize(container) {
  const widths = [container.parentElement, container]
    .map(element => element?.getBoundingClientRect().width)
    .filter(width => Number.isFinite(width) && width > 0);
  return widths.length && Math.min(...widths) < 304 ? 'compact' : 'normal';
}

export function setupRecaptcha(container, {onChange = () => {}, onError = () => {}, onExpired = () => {}} = {}) {
  if (!container || typeof container.replaceChildren !== 'function') {
    const error = failure('RECAPTCHA_CONTAINER', 'reCAPTCHA is unavailable on this page. Please use the phone option shown on this page.');
    onChange('');onError(error);
    const empty = () => {};
    empty.ready = Promise.resolve(false);empty.retry = () => Promise.resolve(false);empty.reset = () => false;
    return empty;
  }
  containers.get(container)?.();
  let active = true;
  let generation = 0;
  let renderGeneration = 0;
  let api;
  let widget;
  let mount;
  let key;
  let size;
  let inFlight;
  let observer;
  const notify = token => {if (active) onChange(typeof token === 'string' ? token : '');};
  const report = error => {if (active) {notify('');onError(error);}};
  const clearWidget = () => {
    ++renderGeneration;
    if (api && widget !== undefined) {
      try {api.reset(widget);} catch { /* The previous route may be detached. */ }
    }
    widget = undefined;
    mount?.remove();mount = undefined;
  };
  const render = () => {
    clearWidget();
    if (!active || !container.isConnected) return false;
    size = widgetSize(container);
    mount = document.createElement('div');
    container.replaceChildren(mount);
    const current = ++renderGeneration;
    const currentWidget = () => active && current === renderGeneration && container.isConnected;
    try {
      widget = api.render(mount, {
        sitekey:key, theme:'light', size,
        callback:token => {if (currentWidget()) notify(token);},
        'expired-callback':() => {if (currentWidget()) {notify('');onExpired();}},
        'error-callback':() => {
          if (currentWidget()) report(failure('RECAPTCHA_CONNECTION', 'reCAPTCHA could not connect. Please retry or use the phone option shown on this page.'));
        },
      });
      return true;
    } catch {
      clearWidget();
      report(failure('RECAPTCHA_RENDER', 'reCAPTCHA could not display. Please retry or use the phone option shown on this page.'));
      return false;
    }
  };
  const start = () => {
    if (!active) return Promise.resolve(false);
    if (inFlight) return inFlight;
    const current = ++generation;
    notify('');clearWidget();
    const pending = (async () => {
      try {
        const configuredKey = await siteKey();
        if (!active || current !== generation || !container.isConnected) return false;
        const loaded = await loadRecaptcha();
        if (!active || current !== generation || !container.isConnected) return false;
        key = configuredKey;api = loaded;
        return render();
      } catch (error) {
        if (active && current === generation) report(error);
        return false;
      }
    })();
    inFlight = pending;
    pending.finally(() => {if (inFlight === pending) inFlight = undefined;});
    return pending;
  };
  const dispose = () => {
    if (!active) return;
    active = false;++generation;observer?.disconnect();clearWidget();
    if (containers.get(container) === dispose) containers.delete(container);
  };
  dispose.reset = () => {
    if (!active) return false;
    notify('');
    if (!api || widget === undefined) return false;
    try {api.reset(widget);return true;}
    catch {report(failure('RECAPTCHA_RESET', 'reCAPTCHA could not reset. Please retry or use the phone option shown on this page.'));return false;}
  };
  dispose.retry = () => {
    const pending = start();dispose.ready = pending;return pending;
  };
  containers.set(container, dispose);
  if (typeof window.ResizeObserver === 'function') {
    observer = new window.ResizeObserver(() => {
      if (!active || !api || widget === undefined || widgetSize(container) === size) return;
      notify('');render();
    });
    observer.observe(container.parentElement || container);
  }
  dispose.ready = start();
  return dispose;
}
