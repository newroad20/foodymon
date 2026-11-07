import assert from 'node:assert/strict';
import { test } from 'node:test';
import { journeyDay, journeyEnd } from './journey.ts';

test('the start date is day 1 and skipped days still pass', () => {
  assert.equal(journeyDay('2026-11-07', '2026-11-07'), 1);
  assert.equal(journeyDay('2026-11-07', '2026-12-01'), 25);
});

test('day 100 is the last day, across months and a daylight-saving-free calendar', () => {
  assert.equal(journeyDay('2026-11-07', '2027-02-14'), 100);
  assert.equal(journeyDay('2026-11-07', '2027-02-15'), 101);
  const end = journeyEnd('2026-11-07');
  assert.deepEqual([end.getFullYear(), end.getMonth(), end.getDate(), end.getHours()], [2027, 1, 15, 0]);
});
