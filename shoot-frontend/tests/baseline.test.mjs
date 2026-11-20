import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../server.mjs';

test('serves the accessible frontend shell and assets', async t => {
  const server = createAppServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /<main id="main"/);

  const css = await fetch(`${origin}/src/styles.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
});

test('returns 404 for unknown paths and blocks traversal', async t => {
  const server = createAppServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${origin}/missing-file`)).status, 404);
  assert.equal((await fetch(`${origin}/%2e%2e%2fREADME.md`)).status, 403);
});
