import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBirthYear } from './age.ts';

test('parseBirthYear accepts plausible 4-digit years only', () => {
  const now = new Date(2026, 9, 23);
  assert.equal(parseBirthYear(' 2012 ', now), 2012);
  assert.equal(parseBirthYear('2023', now), 2023);
  for (const bad of ['', '12', '20120', '2024', '1925', 'abcd']) assert.equal(parseBirthYear(bad, now), null, bad);
});
