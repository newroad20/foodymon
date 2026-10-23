import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isContact, mayBeUnder14, parseBirthYear } from './age.ts';

test('parseBirthYear accepts plausible 4-digit years only', () => {
  const now = new Date(2026, 9, 23);
  assert.equal(parseBirthYear(' 2012 ', now), 2012);
  assert.equal(parseBirthYear('2023', now), 2023);
  for (const bad of ['', '12', '20120', '2024', '1925', 'abcd']) assert.equal(parseBirthYear(bad, now), null, bad);
});

test('mayBeUnder14 includes this year\'s 14-year-olds', () => {
  const now = new Date(2026, 9, 23);
  assert.equal(mayBeUnder14(2012, now), true); // 13 or 14
  assert.equal(mayBeUnder14(2016, now), true);
  assert.equal(mayBeUnder14(2011, now), false); // 14 or 15
});

test('isContact accepts emails and phone numbers', () => {
  for (const ok of ['mom@example.com', '010-1234-5678', '01012345678']) assert.equal(isContact(ok), true, ok);
  for (const bad of ['', 'mom', '1234', 'a@b']) assert.equal(isContact(bad), false, bad);
});
