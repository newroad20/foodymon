import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mealSlotForHour } from './mealType.ts';

test('mealSlotForHour guesses the slot from the hour', () => {
  const pick = [4, 5, 9, 10, 11, 13, 14, 16, 17, 20, 21, 23].map(mealSlotForHour);
  assert.deepEqual(pick, [5, 0, 0, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
});
