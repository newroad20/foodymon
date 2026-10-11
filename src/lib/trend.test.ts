/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, buildTrend, summarizeTrend } from './trend.ts';

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2027-01-02', -3), '2026-12-30');
});

test('buildTrend fills every day, oldest first, with gaps as null', () => {
  const points = buildTrend(
    [
      { log_date: '2026-10-09', daily_score: 70 },
      { log_date: '2026-10-11', daily_score: 10 },
    ],
    '2026-10-11',
    3,
    85
  );
  assert.deepEqual(points, [
    { date: '2026-10-09', score: 70, isToday: false },
    { date: '2026-10-10', score: null, isToday: false },
    // Today uses the app's live score, not the stored one.
    { date: '2026-10-11', score: 85, isToday: true },
  ]);
});

test('summarizeTrend ignores days without records', () => {
  const s = summarizeTrend([
    { date: 'a', score: 60, isToday: false },
    { date: 'b', score: null, isToday: false },
    { date: 'c', score: 91, isToday: true },
  ]);
  assert.equal(s.average, 76);
  assert.equal(s.best?.date, 'c');
  assert.equal(s.recordedDays, 2);
  assert.deepEqual(summarizeTrend([]), { average: null, best: null, recordedDays: 0 });
});
