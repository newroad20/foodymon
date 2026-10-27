import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emotionFollowUp, mealFollowUp } from './followUp.ts';

test('meal follow-up responds to the selected meal status', () => {
  assert.equal(mealFollowUp('skipped').question, '왜 식사를 챙기는 게 어려웠어?');
  assert.match(mealFollowUp('little').question, /조금만 먹게 된 이유/);
  assert.match(mealFollowUp('ate').question, /몸이나 기분/);
});

test('emotion follow-up responds to both emotion and situation', () => {
  assert.match(emotionFollowUp('tired', null).question, /마음이 지쳤어/);
  assert.match(emotionFollowUp('very_good', 'school').question, /좋게 만든 순간/);
  assert.match(emotionFollowUp('very_good', 'school').placeholder, /학교나 공부/);
});
