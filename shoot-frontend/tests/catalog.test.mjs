import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTalent, searchArchive, archive, talent } from '../src/catalog.mjs';
test('public talent catalog has entries and alphabetical filtering', () => {
  assert.ok(talent.length > 1000);
  assert.ok(filterTalent({ query: 'Anok Yai' }).some(person => /anok yai/i.test(person.name)));
});
test('territory/category filters narrow the directory', () => {
  const result = filterTalent({ territory: 'New York', category: 'model' });
  assert.ok(result.length > 0);
  assert.ok(result.every(person => (person.territories || []).some(x => /new[- ]york/i.test(x)) && (person.categories || []).includes('model')));
});
test('archive pagination fixture contains all captured public cards', () => {
  assert.equal(archive.length, 1020);
  assert.ok(searchArchive('Celine Spring 2027').some(item => item.title.toLowerCase().includes('celine')));
});
