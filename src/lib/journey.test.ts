import assert from 'node:assert/strict';
import { test } from 'node:test';
import { journeyCells, journeyDay, journeyEnd } from './journey.ts';

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

test('journey cells mark shared, rest, today and days ahead', () => {
  const cells = journeyCells('2026-11-28', '2026-12-02', new Set(['2026-11-28', '2026-12-01']));
  assert.equal(cells.length, 100);
  assert.deepEqual(cells.slice(0, 6).map((c) => [c.key, c.state]), [
    ['2026-11-28', 'shared'],
    ['2026-11-29', 'rest'],
    ['2026-11-30', 'rest'],
    ['2026-12-01', 'shared'],
    ['2026-12-02', 'today'],
    ['2026-12-03', 'ahead'],
  ]);
});
