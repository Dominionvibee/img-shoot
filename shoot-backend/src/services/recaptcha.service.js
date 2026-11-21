import {createHash} from 'node:crypto';

const endpoint = 'https://www.google.com/recaptcha/api/siteverify';
const failure = (status, code, message) => ({status, body: {code, message}});
const invalid = () => failure(403, 'CAPTCHA_INVALID', 'Complete a new reCAPTCHA challenge and try again.');
const unavailable = () => failure(503, 'CAPTCHA_UNAVAILABLE', 'reCAPTCHA verification is unavailable. Please try again later.');

// These bounded, expiring guards are per process. Multi-instance production
// deployments must replace them with shared atomic rate/replay storage.
export function createRecaptchaVerifier({config, fetchImpl = fetch, now = Date.now,
  timeoutMs = 5000, maxEntries = 10000, rateLimit = 10, rateWindowMs = 60000} = {}) {
  const tokens = new Map();
  const clients = new Map();
  function prune(map, timestamp) {
    for (const [key, value] of map) if (value.expires <= timestamp) map.delete(key);
  }
  return {
    async verify({token, origin, client}) {
      if (!config?.configured) return failure(503, 'CAPTCHA_NOT_CONFIGURED', 'reCAPTCHA verification is not configured.');
      if (!config.origins.has(origin)) return failure(403, 'ORIGIN_NOT_ALLOWED', 'This origin is not allowed to verify reCAPTCHA.');
      const timestamp = now();
      prune(tokens, timestamp); prune(clients, timestamp);
      const bucket = clients.get(client);
      if (bucket && bucket.count >= rateLimit) return failure(429, 'RATE_LIMITED', 'Too many verification attempts. Please try again later.');
      if (!bucket && clients.size >= maxEntries) return failure(429, 'RATE_LIMITED', 'Too many verification attempts. Please try again later.');
      if (bucket) bucket.count++;
      else clients.set(client, {count: 1, expires: timestamp + rateWindowMs});
      if (typeof token !== 'string' || !/^[\x21-\x7e]{20,8192}$/.test(token)) {
        return failure(400, 'CAPTCHA_TOKEN_REQUIRED', 'Provide a valid reCAPTCHA response token.');
      }
      const hash = createHash('sha256').update(token).digest('hex');
      if (tokens.has(hash)) return failure(409, 'CAPTCHA_REPLAYED', 'This reCAPTCHA response was already used. Complete a new challenge.');
      if (tokens.size >= maxEntries) return failure(429, 'RATE_LIMITED', 'Too many verification attempts. Please try again later.');
      // Reserve synchronously before any I/O to reject concurrent duplicates.
      // Retain failed attempts too: a timeout must not permit token reuse.
      tokens.set(hash, {expires: timestamp + 150000});
      const abort = new AbortController();
      let timer;
      try {
        const data = await Promise.race([
          (async () => {
            const response = await fetchImpl(endpoint, {
              method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store',
              headers: {'Content-Type': 'application/x-www-form-urlencoded'},
              body: new URLSearchParams({secret: config.secretKey, response: token}),
              signal: abort.signal,
            });
            if (!response.ok || Number(response.headers?.get('content-length')) > 16384) throw Error('Verification unavailable');
            const text = await response.text();
            if (text.length > 16384) throw Error('Verification unavailable');
            return JSON.parse(text);
          })(),
          new Promise((_, reject) => { timer = setTimeout(() => { abort.abort(); reject(Error('Verification timeout')); }, timeoutMs); }),
        ]);
        if (!data || typeof data !== 'object' || Array.isArray(data)) return unavailable();
        const errors = data['error-codes'];
        if (errors !== undefined && !Array.isArray(errors)) return invalid();
        if (errors?.some(code => ['invalid-input-secret', 'missing-input-secret'].includes(code))) return unavailable();
        if (data.success !== true || errors?.length) return invalid();
        if (typeof data.hostname !== 'string' || !config.hostnames.has(data.hostname)
          || data.hostname !== new URL(origin).hostname) return invalid();
        if (typeof data.challenge_ts !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(data.challenge_ts)) return invalid();
        const challenged = Date.parse(data.challenge_ts);
        const age = now() - challenged;
        if (!Number.isFinite(challenged) || age > 120000 || age < -5000) return invalid();
        return {status: 200, body: {verified: true}};
      } catch {
        return unavailable();
      } finally {
        clearTimeout(timer); abort.abort();
      }
    },
  };
}
