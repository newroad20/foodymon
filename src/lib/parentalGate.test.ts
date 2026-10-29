import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkGate, makeGateQuestion } from './parentalGate.ts';

test('gate questions stay in the adult range and only the product passes', () => {
  for (const r of [0, 0.5, 0.999]) {
    const q = makeGateQuestion(() => r);
    assert.ok(q.a >= 12 && q.a <= 19 && q.b >= 3 && q.b <= 8);
  }
  const q = { a: 13, b: 7 };
  assert.equal(checkGate(q, ' 91 '), true);
  for (const bad of ['', '90', 'abc', '20']) assert.equal(checkGate(q, bad), false, bad);
});
