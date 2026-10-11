/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCollection, earnedBadges, type DailyRecordRow } from './collection.ts';

const levels = [
  { level: 1, maxScore: 19 },
  { level: 2, maxScore: 39 },
  { level: 3, maxScore: 59 },
  { level: 4, maxScore: 79 },
  { level: 5, maxScore: 94 },
  { level: 6, maxScore: 100 },
];

const row = (log_date: string, daily_score: number | null, meal_count = 1): DailyRecordRow => ({
  log_date,
  daily_score,
  meal_count,
  sleep_hours: null,
  emotion: null,
});

const base = { levels, ownedCostumes: 0, ownedBackgrounds: 0, totalCostumes: 6, totalBackgrounds: 4 };

test('computeCollection records the first date each look was seen', () => {
  const s = computeCollection({
    ...base,
    rows: [row('2026-10-01', 45), row('2026-10-02', 85), row('2026-10-03', 50)],
    today: { date: '2026-10-11', score: 96, logged: true },
  });
  assert.deepEqual([...s.seenLevels.entries()], [
    [3, '2026-10-01'],
    [5, '2026-10-02'],
    [6, '2026-10-11'],
  ]);
  assert.equal(s.bestScore, 96);
});

test('computeCollection ignores empty rows and uses live values for today', () => {
  const s = computeCollection({
    ...base,
    rows: [row('2026-10-10', 40, 0), row('2026-10-11', 30)],
    today: { date: '2026-10-11', score: 70, logged: true },
  });
  assert.equal(s.recordedDays, 1);
  assert.deepEqual([...s.seenLevels.keys()], [4]);
});

test('computeCollection finds the longest consecutive run across months', () => {
  const s = computeCollection({
    ...base,
    rows: [
      row('2026-09-29', 50),
      row('2026-09-30', 50),
      row('2026-10-01', 50),
      row('2026-10-03', 50),
    ],
    today: { date: '2026-10-11', score: 40, logged: false },
  });
  assert.equal(s.bestRun, 3);
  assert.equal(s.recordedDays, 4);
});

test('earnedBadges', () => {
  const s = computeCollection({
    ...base,
    ownedCostumes: 3,
    ownedBackgrounds: 4,
    rows: [row('2026-10-01', 95), row('2026-10-02', 50), row('2026-10-03', 50)],
    today: { date: '2026-10-11', score: 0, logged: false },
  });
  assert.deepEqual(
    [...earnedBadges(s)].sort(),
    ['fashion_3', 'first_step', 'room_all', 'run_3', 'score_95']
  );
  const empty = computeCollection({ ...base, rows: [], today: { date: '2026-10-11', score: 0, logged: false } });
  assert.equal(earnedBadges(empty).size, 0);
});
