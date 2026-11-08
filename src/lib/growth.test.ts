import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bedtimeDistanceMinutes,
  dayPoints,
  growthProgress,
  isBedtimeRecommended,
  sleepGuidance,
  sleepMinutes,
  type DayRecords,
  type MealRecord,
} from './growth.ts';

const meal = (slot: number, status: MealRecord['status']): MealRecord => ({
  slot, status, menu: '', feeling: '', memo: '', photoPath: null,
});
const empty: DayRecords = { sleep: null, meals: [], minds: [] };

test('sleepMinutes crosses midnight', () => {
  assert.equal(sleepMinutes({ bedTime: '23:00', wakeTime: '07:00' }), 480);
  assert.equal(sleepMinutes({ bedTime: '01:00', wakeTime: '06:30' }), 330);
});

test('sleep guidance considers both duration and age-based bedtime', () => {
  const child = sleepGuidance(2016, 2026);
  const teen = sleepGuidance(2011, 2026);
  const adult = sleepGuidance(1990, 2026);
  assert.deepEqual([child.bedtimeStart, child.bedtimeEnd, child.durationLabel], ['19:00', '21:00', '9~12시간']);
  assert.deepEqual([teen.bedtimeStart, teen.bedtimeEnd, teen.durationLabel], ['21:00', '22:00', '8~10시간']);
  assert.deepEqual([adult.bedtimeStart, adult.bedtimeEnd, adult.durationLabel], ['22:00', '23:00', '7~9시간']);
  assert.equal(isBedtimeRecommended('22:30', adult), true);
  assert.equal(bedtimeDistanceMinutes('03:00', adult), 240);
  assert.equal(dayPoints({ ...empty, sleep: { bedTime: '03:00', wakeTime: '11:00' } }, 1990, 2026).sleep, 18);
});

test('dayPoints matches the SQL rules (same cases as supabase/tests/growth.test.mjs)', () => {
  assert.deepEqual(dayPoints(empty, null, 2026), { sleep: 0, meal: 0, mind: 0, goal: 0, total: 0 });
  const night = { bedTime: '23:00', wakeTime: '07:00' };
  assert.deepEqual(dayPoints({ ...empty, sleep: night }, null, 2026), { sleep: 30, meal: 0, mind: 0, goal: 10, total: 40 });
  assert.equal(dayPoints({ ...empty, sleep: night }, 2016, 2026).sleep, 24); // 10 years old, 8h
  assert.equal(dayPoints({ ...empty, sleep: { bedTime: '21:30', wakeTime: '05:30' } }, 2011, 2026).sleep, 30);
  assert.equal(dayPoints({ ...empty, sleep: { bedTime: '01:00', wakeTime: '06:30' } }, 2011, 2026).sleep, 10);

  const day: DayRecords = {
    sleep: { bedTime: '01:00', wakeTime: '06:30' },
    meals: [meal(0, 'ate'), meal(2, 'little'), meal(4, 'hard'), meal(1, 'skipped'), meal(5, 'no_answer')],
    minds: [
      { emotion: 'very_hard', situation: null, note: '' },
      { emotion: 'very_hard', situation: 'school', note: '' },
    ],
  };
  assert.deepEqual(dayPoints(day, 2011, 2026), { sleep: 10, meal: 28, mind: 10, goal: 20, total: 68 });
  // every feeling scores the same
  assert.equal(dayPoints({ ...empty, minds: [{ emotion: 'very_good', situation: null, note: '' }] }, null, 2026).mind, 5);
  assert.equal(dayPoints({ ...empty, minds: [{ emotion: 'no_answer', situation: 'school', note: '' }] }, null, 2026).mind, 5);
  // capped at 100
  const full = { sleep: night, meals: [0, 1, 2, 3, 4, 5].map((s) => meal(s, 'ate')), minds: [{ emotion: 'okay' as const, situation: null, note: '그냥' }] };
  assert.equal(dayPoints(full, null, 2026).total, 100);
});

test('growthProgress shows the distance to the next stage', () => {
  assert.deepEqual(growthProgress(1, 50), { next: 100, remaining: 50, ratio: 0.5 });
  assert.deepEqual(growthProgress(3, 375), { next: 500, remaining: 125, ratio: 0.5 });
  assert.deepEqual(growthProgress(4, 1150), { next: 1800, remaining: 650, ratio: 0.5 });
  assert.deepEqual(growthProgress(6, 4100), { next: null, remaining: 0, ratio: 1 });
});
