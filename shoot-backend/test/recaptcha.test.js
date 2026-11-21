import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {readRecaptchaConfig} from '../src/config/recaptcha.js';
import {createRecaptchaVerifier} from '../src/services/recaptcha.service.js';

const timestamp = Date.parse('2026-11-21T12:00:00.000Z');
const origin = 'http://localhost:4173';
const env = {
  NODE_ENV: 'development', RECAPTCHA_SITE_KEY: '6LcAbCdEfGhIjKlMnOpQrStUvWxYz01234567890',
  RECAPTCHA_SECRET_KEY: '6LdAbCdEfGhIjKlMnOpQrStUvWxYz09876543210',
  RECAPTCHA_ALLOWED_HOSTNAMES: 'localhost,127.0.0.1',
  RECAPTCHA_ALLOWED_ORIGINS: origin + ',http://127.0.0.1:4173',
};
const token = suffix => 'valid-response-token-0123456789-' + suffix.replaceAll(' ', '-');
const payload = overrides => ({success: true, hostname: 'localhost', challenge_ts: new Date(timestamp - 5000).toISOString(), ...overrides});
const response = data => new Response(JSON.stringify(data), {status: 200});
function fixture(options = {}) {
  const calls = [];
  const config = readRecaptchaConfig({...env, ...options.env});
  const fetchImpl = options.fetchImpl || (async (...args) => {calls.push(args); return response(payload(options.payload));});
  const dependencies = {config, fetchImpl, now: () => timestamp, timeoutMs: 10, ...options};
  return {app: createApp(dependencies), verifier: createRecaptchaVerifier(dependencies), config, calls};
}
const post = (app, body, requestOrigin = origin) => {
  const req = request(app).post('/api/privacy-requests/verify');
  if (requestOrigin !== null) req.set('Origin', requestOrigin);
  return req.send(body);
};

describe('reCAPTCHA configuration', () => {
  it('keeps the secret private and returns only a configured public key', async () => {
    const {app} = fixture();
    const result = await request(app).get('/api/recaptcha/config').expect(200);
    assert.deepEqual(result.body, {siteKey: env.RECAPTCHA_SITE_KEY, configured: true});
    assert.equal(result.headers['cache-control'], 'no-store');
    assert.equal(JSON.stringify(result.body).includes(env.RECAPTCHA_SECRET_KEY), false);
  });
  for (const [name, override] of [
    ['missing secret', {RECAPTCHA_SECRET_KEY: ''}],
    ['missing site key', {RECAPTCHA_SITE_KEY: ''}],
    ['Google test secret', {RECAPTCHA_SECRET_KEY: '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'}],
    ['Google test site key', {RECAPTCHA_SITE_KEY: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}],
    ['placeholder key', {RECAPTCHA_SECRET_KEY: 'replace-with-your-private-recaptcha-secret'}],
    ['missing hostnames', {RECAPTCHA_ALLOWED_HOSTNAMES: ''}],
    ['wildcard hostname', {RECAPTCHA_ALLOWED_HOSTNAMES: '*.example.com'}],
    ['origin containing a path', {RECAPTCHA_ALLOWED_ORIGINS: origin + '/page'}],
    ['origin outside hostname list', {RECAPTCHA_ALLOWED_ORIGINS: 'https://evil.example'}],
    ['insecure remote origin', {RECAPTCHA_ALLOWED_HOSTNAMES: 'example.com', RECAPTCHA_ALLOWED_ORIGINS: 'http://example.com'}],
    ['localhost in production', {NODE_ENV: 'production'}],
  ]) it(`fails closed for ${name}`, async () => {
    const {app, calls} = fixture({env: override});
    assert.deepEqual((await request(app).get('/api/recaptcha/config').expect(200)).body, {siteKey: '', configured: false});
    const result = await post(app, {recaptchaToken: token(name)}).expect(503);
    assert.equal(result.body.code, 'CAPTCHA_NOT_CONFIGURED');
    assert.equal(calls.length, 0);
  });
  it('accepts separately configured HTTPS production keys and hosts', () => {
    assert.equal(readRecaptchaConfig({...env, NODE_ENV: 'production', RECAPTCHA_ALLOWED_HOSTNAMES: 'privacy.example.com', RECAPTCHA_ALLOWED_ORIGINS: 'https://privacy.example.com'}).configured, true);
  });
  it('accepts genuine key formats containing incidental test or mock substrings', () => {
    assert.equal(readRecaptchaConfig({...env,
      RECAPTCHA_SITE_KEY: '6LctestAbCdEfGhIjKlMnOpQrStUvWxYz012345',
      RECAPTCHA_SECRET_KEY: '6LdmockAbCdEfGhIjKlMnOpQrStUvWxYz098765',
    }).configured, true);
  });
});

describe('reCAPTCHA verification route', () => {
  it('verifies with Google using a fixed HTTPS endpoint and token-only body', async () => {
    const {app, calls} = fixture();
    const result = await post(app, {recaptchaToken: token('success')}).expect(200);
    assert.deepEqual(result.body, {verified: true});
    assert.equal(calls.length, 1);
    const [url, options] = calls[0];
    assert.equal(url, 'https://www.google.com/recaptcha/api/siteverify');
    assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'error');
    assert.deepEqual(Object.fromEntries(options.body), {secret: env.RECAPTCHA_SECRET_KEY, response: token('success')});
    assert.equal(result.body.requestAccepted, undefined);
    assert.equal(result.headers['x-content-type-options'], 'nosniff');
  });
  it('passes opaque printable tokens unchanged through URL encoding', async () => {
    const {app, calls} = fixture();
    const opaque = 'opaque+response/token=0123456789&x=y?z:;!';
    await post(app, {recaptchaToken: opaque}).expect(200);
    assert.equal(calls[0][1].body.get('response'), opaque);
    assert.equal(new URLSearchParams(calls[0][1].body.toString()).get('response'), opaque);
  });
  for (const value of [undefined, '', 'short', 23, null, {}, ['token'], 'a'.repeat(8193), 'valid-token-with whitespace-123456789']) {
    it(`rejects malformed tokens (${typeof value}, length ${value?.length || 0}) without contacting Google`, async () => {
      const {app, calls} = fixture();
      await post(app, {recaptchaToken: value}).expect(400);
      assert.equal(calls.length, 0);
    });
  }
  it('rejects extra fields/PII rather than forwarding them', async () => {
    const {app, calls} = fixture();
    await post(app, {recaptchaToken: token('pii'), email: 'person@example.com'}).expect(400);
    assert.equal(calls.length, 0);
  });
  it('rejects malformed/oversized JSON and non-JSON input', async () => {
    const {app} = fixture();
    for (const body of ['{bad', JSON.stringify({recaptchaToken: 'a'.repeat(14000)})]) {
      const result = await request(app).post('/api/privacy-requests/verify').set('Content-Type', 'application/json').set('Origin', origin).send(body).expect(400);
      assert.equal(result.body.code, 'INVALID_BODY');
    }
    await request(app).post('/api/privacy-requests/verify').set('Origin', origin).type('form').send({recaptchaToken: token('form')}).expect(400);
  });
  for (const badOrigin of [null, 'null', 'http://localhost:4174', 'https://evil.example', 'http://localhost:4173.evil.example']) {
    it(`requires exact browser origin (${badOrigin})`, async () => {
      const {app, calls} = fixture();
      await post(app, {recaptchaToken: token('origin')}, badOrigin).expect(403);
      assert.equal(calls.length, 0);
    });
  }
  for (const [name, data] of [
    ['false result', {success: false}], ['nonboolean success', {success: 'true'}],
    ['wrong host', {hostname: 'evil.example'}], ['suffix host', {hostname: 'localhost.evil.example'}],
    ['missing host', {hostname: undefined}], ['expired challenge', {challenge_ts: new Date(timestamp - 120001).toISOString()}],
    ['other allowed host than requesting browser', {hostname: '127.0.0.1'}],
    ['future challenge', {challenge_ts: new Date(timestamp + 5001).toISOString()}],
    ['invalid timestamp', {challenge_ts: 'yesterday'}], ['missing timestamp', {challenge_ts: undefined}],
    ['Google token timeout', {success: false, 'error-codes': ['timeout-or-duplicate']}],
    ['success with errors', {'error-codes': ['invalid-input-response']}],
    ['success with malformed errors', {'error-codes': 0}],
  ]) it(`rejects ${name}`, async () => {
    const {app} = fixture({payload: data});
    const result = await post(app, {recaptchaToken: token(name)}).expect(403);
    assert.equal(result.body.code, 'CAPTCHA_INVALID');
  });
  it('treats an invalid configured secret from Google as unavailable', async () => {
    const {app} = fixture({payload: {success: false, 'error-codes': ['invalid-input-secret']}});
    const result = await post(app, {recaptchaToken: token('invalidsecret')}).expect(503);
    assert.equal(result.body.code, 'CAPTCHA_UNAVAILABLE');
    assert.equal(JSON.stringify(result.body).includes(env.RECAPTCHA_SECRET_KEY), false);
  });
  for (const [name, fetchImpl] of [
    ['network failure', async () => {throw Error('secret could appear in upstream error');}],
    ['network timeout', async () => new Promise(() => {})],
    ['JSON parse failure', async () => new Response('{bad')],
    ['nonobject response', async () => response(null)],
    ['HTTP error', async () => new Response('failure', {status: 502})],
    ['oversized response', async () => new Response('x'.repeat(17000))],
  ]) it(`fails closed for ${name}`, async () => {
    const {app} = fixture({fetchImpl});
    const result = await post(app, {recaptchaToken: token(name)}).expect(503);
    assert.equal(result.body.code, 'CAPTCHA_UNAVAILABLE');
    assert.equal(JSON.stringify(result.body).includes('secret could'), false);
  });
  it('rejects replays and concurrent duplicates before a second Google request', async () => {
    let finish; let count = 0;
    const {verifier} = fixture({fetchImpl: () => {count++; return new Promise(resolve => {finish = resolve;});}, timeoutMs: 1000});
    const input = {token: token('concurrent'), origin, client: 'one'};
    const pending = verifier.verify(input);
    assert.equal((await verifier.verify(input)).status, 409);
    finish(response(payload()));
    assert.equal((await pending).status, 200);
    assert.equal((await verifier.verify(input)).status, 409);
    assert.equal(count, 1);
  });
  it('consumes tokens even after upstream failure', async () => {
    let count = 0;
    const {verifier} = fixture({fetchImpl: async () => {count++; throw Error('offline');}});
    const input = {token: token('network-replay'), origin, client: 'one'};
    assert.equal((await verifier.verify(input)).status, 503);
    assert.equal((await verifier.verify(input)).status, 409);
    assert.equal(count, 1);
  });
  it('times out a stalled response body as well as the initial connection', async () => {
    const {verifier} = fixture({fetchImpl: async () => ({ok: true, headers: new Headers(), text: async () => new Promise(() => {})})});
    assert.equal((await verifier.verify({token: token('stalledbody'), origin, client: 'one'})).status, 503);
  });
  it('rate limits all token attempts per socket IP and ignores spoofed forwarding headers', async () => {
    const {app, calls} = fixture({rateLimit: 2});
    await post(app, {recaptchaToken: ''}).expect(400);
    await post(app, {recaptchaToken: token('one')}).expect(200);
    const result = await post(app, {recaptchaToken: token('two')}).set('X-Forwarded-For', '192.0.2.1').expect(429);
    assert.equal(result.headers['retry-after'], '60'); assert.equal(calls.length, 1);
  });
  it('bounds replay/client memory and expires guard entries', async () => {
    let clock = timestamp;
    const {verifier} = fixture({maxEntries: 1, now: () => clock, fetchImpl: async () => response(payload({challenge_ts: new Date(clock).toISOString()}))});
    const input = {token: token('memory-one'), origin, client: 'one'};
    assert.equal((await verifier.verify(input)).status, 200);
    assert.equal((await verifier.verify({...input, token: token('memory-two')})).status, 429);
    assert.equal((await verifier.verify({...input, client: 'two'})).status, 429);
    clock += 150001;
    assert.equal((await verifier.verify({...input, token: token('after-expiry'), client: 'two'})).status, 200);
  });
});
