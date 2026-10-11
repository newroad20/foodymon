/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { UserState } from '../types/foodymon';
import { closeDay, daysBetween, rolloverToDate, toDateKey } from './dayRollover.ts';

function makeState(overrides: Partial<UserState> = {}): UserState {
  return {
    masterName: '테스트',
    onboarded: true,
    targetSleep: 7,
    targetMeals: 3,
    usualMealSize: 1.0,
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
    currentDailyScore: 50,
    averageScore: 50,
    level: 3,
    logs: [],
    lastActiveDate: '2026-10-10',
    ...overrides,
  };
}

const logged = { sleepDiff: 0, sleepHours: 7, mealCount: 1, badMealCount: 0, emotion: 80 };
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h);

test('toDateKey uses local calendar date', () => {
  assert.equal(toDateKey(at(2026, 1, 5, 23)), '2026-01-05');
});

test('daysBetween counts calendar days across month/year boundaries', () => {
  assert.equal(daysBetween('2026-10-10', '2026-10-10'), 0);
  assert.equal(daysBetween('2026-10-31', '2026-11-01'), 1);
  assert.equal(daysBetween('2026-12-30', '2027-01-02'), 3);
});

test('closeDay rewards a logged day and grants a shield every 7 days', () => {
  const r = closeDay(makeState({ streak: 6, today: logged }));
  assert.equal(r.state.streak, 7);
  assert.equal(r.rewardedJelly, 10 + Math.floor(7 / 3) * 5);
  assert.equal(r.state.currency, 50 + r.rewardedJelly);
  assert.equal(r.shieldEarned, true);
  assert.equal(r.state.shields, 2);
  assert.equal(r.state.today.mealCount, 0);
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

test('rolloverToDate does nothing on the same day', () => {
  const s = makeState({ today: logged });
  const r = rolloverToDate(s, at(2026, 10, 10, 23));
  assert.equal(r.daysPassed, 0);
  assert.equal(r.state, s);
});

test('rolloverToDate ignores a clock that moved backwards', () => {
  const s = makeState();
  assert.equal(rolloverToDate(s, at(2026, 10, 9)).state, s);
});

test('rolloverToDate stamps today when there is no last active date', () => {
  const r = rolloverToDate(makeState({ lastActiveDate: null, streak: 3 }), at(2026, 10, 11));
  assert.equal(r.state.lastActiveDate, '2026-10-11');
  assert.equal(r.state.streak, 3);
  assert.equal(r.daysPassed, 0);
});

test('rolloverToDate closes yesterday with a reward', () => {
  const r = rolloverToDate(makeState({ streak: 2, today: logged }), at(2026, 10, 11));
  assert.equal(r.daysPassed, 1);
  assert.equal(r.missedDays, 0);
  assert.equal(r.state.streak, 3);
  assert.equal(r.rewardedJelly, 15);
  assert.equal(r.state.lastActiveDate, '2026-10-11');
});

test('rolloverToDate uses shields for skipped days before resetting', () => {
  // Logged on the 10th, opened again on the 13th: 11th and 12th were skipped.
  const r = rolloverToDate(makeState({ streak: 5, shields: 1, today: logged }), at(2026, 10, 13));
  assert.equal(r.daysPassed, 3);
  assert.equal(r.missedDays, 2);
  assert.equal(r.shieldsUsed, 1);
  assert.equal(r.streakReset, true);
  assert.equal(r.state.streak, 0);
  assert.equal(r.state.shields, 0);
  assert.equal(r.rewardedJelly, 10 + Math.floor(6 / 3) * 5);
});

test('rolloverToDate keeps the streak when shields cover every skipped day', () => {
  const r = rolloverToDate(makeState({ streak: 5, shields: 2, today: logged }), at(2026, 10, 13));
  assert.equal(r.state.streak, 6);
  assert.equal(r.shieldsUsed, 2);
  assert.equal(r.streakReset, false);
});
