import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFrontendServer } from '../server.mjs';
import { referenceApi } from '../src/reference-api.mjs';

const server = createFrontendServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
after(() => new Promise(resolve => server.close(resolve)));

test('directory contract returns captured roster with independent gender filtering', async () => {
  const endpoint = '/wp-json/wme/v1/get_talent?territory=new-york&talent-category=4&gender=any&sort-by=az';
  const result = await referenceApi(endpoint);
  assert.equal(result.status, 200);
  assert.equal(result.body.length, 272);
  assert.equal(result.body[0].name, 'Aalyah Ross');
  assert.ok(result.body.every(item => item.thumbnail?.source && item.talent_id));
  const women = await referenceApi(endpoint.replace('gender=any', 'gender=woman'));
  const men = await referenceApi(endpoint.replace('gender=any', 'gender=man'));
  assert.ok(women.body.length > 0 && men.body.length > 0);
  assert.ok(women.body.length < result.body.length && men.body.length < result.body.length);
  assert.equal(new Set([...women.body, ...men.body].map(item => item.talent_id)).size, result.body.length);
});

test('search contracts support territory/category filters and modal-compatible identifiers', async () => {
  const directory = await referenceApi('/wp-json/wme/v1/get_search_directory_items?search-term=Anok&territory[]=new-york&categories[]=model');
  assert.ok(directory.body.some(item => item.name === 'Anok Yai'));
  assert.ok(directory.body.every(item => item.territorySelectorOptions.includes('new-york')));
  const work = await referenceApi('/wp-json/wme/v1/get_work?search-term=Anok&sort-by=az');
  assert.equal(work.body.length, 100);
  assert.equal(new Set(work.body.map(item => item.id)).size, 100);
  assert.ok(work.body.every(item => item.id && item.title && item.thumbnail));
  const detail = await referenceApi(`/wp-json/wme/v1/get_single_work?work-id=${encodeURIComponent(work.body[0].id)}`);
  assert.equal(detail.body.length, 1);
  assert.ok(detail.body[0].talentDetails && !Array.isArray(detail.body[0].talentDetails));
  const dropdown = await referenceApi('/wp-json/wme/v1/get_search_dropdown_items?search-term=Anok');
  assert.ok(dropdown.body.talent.length > 0 && dropdown.body.work.length > 0);
  assert.ok(dropdown.body.talent.length <= 10 && dropdown.body.work.length <= 10);
});

test('captured featured gallery preserves real media and uncaptured gallery discloses its limit', async () => {
  const result = await referenceApi('/wp-json/wme/v1/get_single_work?featured-work-id=30874');
  assert.equal(result.body[0].title, 'V Winter 2026');
  assert.equal(result.body[0].mediaItems.length, 10);
  assert.equal(result.body[0].talentDetails[0].name, 'Leticia Hall');
  const missing = await referenceApi('/wp-json/wme/v1/get_single_work?featured-work-id=99999999');
  assert.equal(missing.body[0].localSnapshotUnavailable, true);
  assert.match(missing.body[0].flexiLayouts, /outside the captured local snapshot/);
});

test('HTTP adapter rejects writes and missing assets while serving routed pages', async () => {
  const write = await fetch(`${origin}/wp-json/wme/v1/get_talent`, { method: 'POST' });
  assert.equal(write.status, 405);
  assert.equal(write.headers.get('allow'), 'GET, HEAD');
  const missing = await fetch(`${origin}/assets/original/missing-image.jpg`);
  assert.equal(missing.status, 404);
  const route = await fetch(`${origin}/contact/`);
  assert.equal(route.status, 200);
  assert.match(route.headers.get('content-type'), /text\/html/);
  const script = await fetch(`${origin}/src/app.mjs`, { method: 'HEAD' });
  assert.match(script.headers.get('content-type'), /text\/javascript/);
});

test('static streaming honors bounded, suffix and invalid byte ranges', async () => {
  const bytes = await readFile(new URL('../src/app.mjs', import.meta.url));
  const partial = await fetch(`${origin}/src/app.mjs`, { headers: { Range: 'bytes=2-15' } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('content-range'), `bytes 2-15/${bytes.length}`);
  assert.deepEqual(Buffer.from(await partial.arrayBuffer()), bytes.subarray(2, 16));
  const suffix = await fetch(`${origin}/src/app.mjs`, { headers: { Range: 'bytes=-10' } });
  assert.equal(suffix.status, 206);
  assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), bytes.subarray(-10));
  const invalid = await fetch(`${origin}/src/app.mjs`, { headers: { Range: `bytes=${bytes.length + 1}-` } });
  assert.equal(invalid.status, 416);
});
