import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mealTypeForHour } from './mealType.ts';

test('mealTypeForHour guesses the meal from the hour', () => {
  const byHour = Array.from({ length: 24 }, (_, h) => mealTypeForHour(h));
  assert.deepEqual(
    [byHour[4], byHour[5], byHour[9], byHour[10], byHour[14], byHour[15], byHour[17], byHour[21], byHour[22]],
    ['간식', '아침', '아침', '점심', '점심', '간식', '저녁', '저녁', '간식']
  );
});
