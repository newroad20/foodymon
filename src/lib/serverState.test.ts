/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUserState, toDailyLogRow, toDayRecords, toRolloverResult, type ProfileRow } from './serverState.ts';
import { calcDailyScore } from './score.ts';

const levels = [
  { level: 1, maxScore: 19 },
  { level: 2, maxScore: 39 },
  { level: 3, maxScore: 59 },
  { level: 4, maxScore: 79 },
  { level: 5, maxScore: 94 },
  { level: 6, maxScore: 100 },
];

const profile: ProfileRow = {
  nickname: '새길',
  onboarded: true,
  target_sleep: '7.0',
  target_meals: 3,
  usual_meal_size: '1.00',
  jelly_balance: 65,
  streak: 3,
  shields: 1,
  equipped_costume: 'crown',
  equipped_backgrounds: ['plant'],
  history_scores: [50, 77],
  last_checkin_date: '2026-10-11',
};

test('buildUserState maps rows and converts numeric strings', () => {
  const s = buildUserState(
    {
      profile,
      today: { sleep_hours: '6.5', sleep_diff: '0.5', meal_count: 2, bad_meal_count: 0, emotion: 80 },
      logs: [{ id: 'a', type: 'meal', content: '식사', created_at: '2026-10-11T03:05:00Z', photo_path: 'u1/1.jpg' }],
      items: [
        { item_type: 'costume', item_id: 'crown' },
        { item_type: 'background', item_id: 'plant' },
      ],
    }
  );
  assert.equal(s.targetSleep, 7);
  assert.equal(s.usualMealSize, 1);
  assert.equal(s.today.sleepHours, 6.5);
  assert.equal(s.today.sleepDiff, 0.5);
  assert.equal(s.currency, 65);
  assert.deepEqual(s.ownedCostumes, ['crown']);
  assert.deepEqual(s.ownedBackgrounds, ['plant']);
  assert.equal(s.lastActiveDate, '2026-10-11');
  assert.equal(s.logs[0].id, 'a');
  assert.equal(s.logs[0].photoPath, 'u1/1.jpg');
  assert.equal(s.level, 3); // no evolution_stage yet
});

test('buildUserState scores today from the records and takes the stage from the server', () => {
  const records = toDayRecords({
    sleep: { bed_time: '23:00:00', wake_time: '07:00:00' },
    meals: [{ slot: 0, status: 'ate', menu: '토스트', feeling: '', memo: '', photo_path: null }],
    minds: [{ emotion: 'very_hard', situation: 'school', note: '' }],
  });
  const s = buildUserState({ profile: { ...profile, evolution_stage: 4 }, today: null, logs: [], items: [], records, growthTotal: 75 });
  assert.equal(s.level, 4);
  assert.equal(s.growthTotal, 75);
  assert.deepEqual(records.sleep, { bedTime: '23:00', wakeTime: '07:00' });
  // sleep 30 (no birth year -> 13+ band, 8h) + meal 10 + mind 10 + goal 20
  assert.deepEqual(s.todayPoints, { sleep: 30, meal: 10, mind: 10, goal: 20, total: 70 });
  assert.equal(s.currentDailyScore, 70);
  assert.deepEqual(s.today, { sleepHours: 8, sleepDiff: 1, mealCount: 1, badMealCount: 0, emotion: 20 });
});

test('buildUserState handles a day without check-ins yet', () => {
  const s = buildUserState({ profile, today: null, logs: [], items: [] });
  assert.deepEqual(s.today, { sleepDiff: null, sleepHours: null, mealCount: 0, badMealCount: 0, emotion: null });
});

test('calcDailyScore weights sleep/meal/emotion and applies the streak bonus', () => {
  const today = { sleepDiff: 0, sleepHours: 7, mealCount: 3, badMealCount: 0, emotion: 100 };
  assert.deepEqual(calcDailyScore({ today, targetMeals: 3, streak: 0 }, levels), { score: 100, level: 6 });
  const half = { ...today, sleepDiff: 2, mealCount: 1, emotion: 50 };
  // 50*0.35 + 33.3*0.35 + 100*0.3 (any logged feeling) = 59.2 -> x1.05 = 62
  assert.deepEqual(calcDailyScore({ today: half, targetMeals: 3, streak: 3 }, levels), { score: 62, level: 4 });
});

test('toRolloverResult maps the close_days response', () => {
  const r = toRolloverResult({
    days_passed: 3,
    missed_days: 2,
    rewarded_jelly: 20,
    milestone_bonus: 0,
    shield_earned: false,
    shields_used: 1,
    streak_reset: true,
  });
  assert.deepEqual(r, {
    daysPassed: 3,
    missedDays: 2,
    rewardedJelly: 20,
    milestoneBonus: 0,
    shieldEarned: false,
    shieldsUsed: 1,
    shieldUsed: true,
    streakReset: true,
  });
});

test('toDailyLogRow writes the current day totals', () => {
  const s = buildUserState({ profile, today: null, logs: [], items: [] });
  const row = toDailyLogRow({ ...s, today: { ...s.today, mealCount: 1 } }, 'u1', '2026-10-11');
  assert.equal(row.user_id, 'u1');
  assert.equal(row.log_date, '2026-10-11');
  assert.equal(row.meal_count, 1);
  assert.equal(row.daily_score, s.currentDailyScore);
});

test('buildUserState exposes a backfillable yesterday', () => {
  const none = buildUserState({ profile, today: null, logs: [], items: [] });
  assert.equal(none.backfill, null);
  const s = buildUserState(
    { profile: { ...profile, missed_date: '2026-10-10', missed_prev_streak: 4 }, today: null, logs: [], items: [] }
  );
  assert.deepEqual(s.backfill, { date: '2026-10-10', prevStreak: 4 });
});

test('calcDailyScore starts an unlogged day at the neutral level', () => {
  const empty = { sleepDiff: null, sleepHours: null, mealCount: 0, badMealCount: 0, emotion: null };
  assert.deepEqual(calcDailyScore({ today: empty, targetMeals: 3, streak: 10 }, levels), { score: 40, level: 3 });
  // One low check-in still counts as a real score.
  assert.equal(calcDailyScore({ today: { ...empty, emotion: 20 }, targetMeals: 3, streak: 0 }, levels).score, 30);
  assert.equal(calcDailyScore({ today: { ...empty, emotion: 100 }, targetMeals: 3, streak: 0 }, levels).score, 30);
});
