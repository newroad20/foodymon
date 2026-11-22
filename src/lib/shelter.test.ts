import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NIBBLE_FOODS, NIBBLE_BITES, SURF_MS, mmss, surfState } from './shelter.ts';

const BANNED = ['과식', '결식', '참아', '야식', '배달', '살 빼', '살찌', '다이어트', '먹지 마'];
const T0 = 1_700_000_000_000;

test('surfing starts with the full 15 minutes on a breath in', () => {
  assert.deepEqual(surfState(T0, T0), { phase: 'surfing', remainingMs: SURF_MS, breath: 'in' });
  assert.equal(mmss(surfState(T0, T0).remainingMs), '15:00');
});

test('breath goes 4s in, 6s out, and repeats', () => {
  const breath = (s: number) => surfState(T0, T0 + s * 1000).breath;
  assert.deepEqual([0, 3.9, 4, 9.9, 10, 14, 20].map(breath), ['in', 'in', 'out', 'out', 'in', 'out', 'in']);
});

test('time left counts down from timestamps, even after a long background gap', () => {
  assert.equal(surfState(T0, T0 + 61_000).remainingMs, SURF_MS - 61_000);
  assert.equal(mmss(surfState(T0, T0 + 61_000).remainingMs), '13:59');
  // Came back 10 minutes later: no ticks were missed.
  const back = surfState(T0, T0 + 10 * 60_000 + 2_000);
  assert.equal(back.phase, 'surfing');
  assert.equal(mmss(back.remainingMs), '04:58');
  // Came back an hour later: done, never negative.
  assert.deepEqual(surfState(T0, T0 + 60 * 60_000).phase, 'done');
  assert.equal(surfState(T0, T0 + 60 * 60_000).remainingMs, 0);
});

test('the wave ends at exactly 15:00, not a moment before', () => {
  assert.equal(surfState(T0, T0 + SURF_MS - 1).phase, 'surfing');
  assert.equal(mmss(surfState(T0, T0 + SURF_MS - 1).remainingMs), '00:01');
  assert.deepEqual(surfState(T0, T0 + SURF_MS), { phase: 'done', remainingMs: 0, breath: 'in' });
  assert.equal(mmss(0), '00:00');
});

test('a clock set backwards never adds time', () => {
  assert.equal(surfState(T0, T0 - 5_000).remainingMs, SURF_MS);
  assert.equal(surfState(T0, T0, 30_000).remainingMs, 30_000);
});

test('nibble foods have unique ids, an icon, and no blaming or diet words', () => {
  assert.equal(new Set(NIBBLE_FOODS.map((f) => f.id)).size, NIBBLE_FOODS.length);
  assert.equal(NIBBLE_FOODS.length, 6);
  assert.equal(NIBBLE_BITES, 10);
  for (const f of NIBBLE_FOODS) {
    assert.ok(f.icon && f.label, f.id);
    for (const word of BANNED) assert.ok(!f.label.includes(word), `${f.label} contains ${word}`);
  }
});
