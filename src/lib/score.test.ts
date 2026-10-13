import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcScoreParts } from './score.ts';

test('portion size does not lower the meal score', () => {
  const today = { sleepDiff: null, sleepHours: null, mealCount: 2, badMealCount: 2, emotion: null };
  assert.equal(calcScoreParts({ today, targetMeals: 3, streak: 0 }).mealScore, (2 / 3) * 100);
  assert.equal(calcScoreParts({ today: { ...today, mealCount: 5 }, targetMeals: 3, streak: 0 }).mealScore, 100);
});
