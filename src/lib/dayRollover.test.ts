/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { UserState } from '../types/foodymon';
import { closeDay, streakMilestoneBonus, toDateKey } from './dayRollover.ts';

function makeState(overrides: Partial<UserState> = {}): UserState {
  return {
    masterName: '테스트',
    onboarded: true,
    targetSleep: 7,
    targetMeals: 3,
    usualMealSize: 1.0,
    birthYear: null,
    streak: 0,
    shields: 1,
    currency: 50,
    ownedCostumes: [],
    ownedBackgrounds: [],
    equippedCostume: null,
    equippedBackgrounds: [],
    isFrozen: false,
    historyScores: [50, 50, 50],
    today: { sleepDiff: null, sleepHours: null, mealCount: 0, badMealCount: 0, emotion: null },
    records: { sleep: null, meals: [], minds: [] },
    todayPoints: { sleep: 0, meal: 0, mind: 0, goal: 0, total: 0 },
    growthTotal: 0,
    currentDailyScore: 50,
    averageScore: 50,
    level: 3,
    logs: [],
    lastActiveDate: '2026-10-10',
    backfill: null,
    ...overrides,
  };
}

const logged = { sleepDiff: 0, sleepHours: 7, mealCount: 1, badMealCount: 0, emotion: 80 };
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h);

test('toDateKey uses local calendar date', () => {
  assert.equal(toDateKey(at(2026, 1, 5, 23)), '2026-01-05');
});

test('closeDay rewards a logged day and grants a shield every 7 days', () => {
  const r = closeDay(makeState({ streak: 6, today: logged }));
  assert.equal(r.state.streak, 7);
  assert.equal(r.milestoneBonus, 50);
  assert.equal(r.rewardedJelly, 10 + Math.floor(7 / 3) * 5 + 50);
  assert.equal(r.state.currency, 50 + r.rewardedJelly);
  assert.equal(r.shieldEarned, true);
  assert.equal(r.state.shields, 2);
  assert.equal(r.state.today.mealCount, 0);
});

test('streakMilestoneBonus pays at 3, 7, 14 and every 30 days', () => {
  const paid = Array.from({ length: 91 }, (_, i) => i).filter((s) => streakMilestoneBonus(s) > 0);
  assert.deepEqual(paid, [3, 7, 14, 30, 60, 90]);
  assert.equal(closeDay(makeState({ streak: 3, today: logged })).milestoneBonus, 0);
});

test('closeDay spends a shield on an empty day, then resets the streak', () => {
  const withShield = closeDay(makeState({ streak: 4, shields: 1 }));
  assert.equal(withShield.shieldUsed, true);
  assert.equal(withShield.state.streak, 4);
  assert.equal(withShield.state.shields, 0);

  const noShield = closeDay(withShield.state);
  assert.equal(noShield.state.streak, 0);
});

test('closeDay keeps at most 7 history scores', () => {
  const r = closeDay(makeState({ historyScores: [1, 2, 3, 4, 5, 6, 7], currentDailyScore: 88 }));
  assert.deepEqual(r.state.historyScores, [2, 3, 4, 5, 6, 7, 88]);
});
