import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPetChatOpening, replyToPetChat } from './petChat.ts';
import { EMPTY_DAY } from './growth.ts';

test('pet chat asks gently about a skipped meal', () => {
  const opening = buildPetChatOpening(
    '새길',
    {
      ...EMPTY_DAY,
      meals: [{ slot: 0, status: 'skipped', menu: '', feeling: '', memo: '', photoPath: null }],
    },
    12
  );
  assert.equal(opening.focus, 'meal');
  assert.match(opening.message, /식사를 챙기기 어려웠/);
});

test('a low mood takes priority over other records', () => {
  const opening = buildPetChatOpening(
    '새길',
    {
      ...EMPTY_DAY,
      meals: [{ slot: 0, status: 'skipped', menu: '', feeling: '', memo: '', photoPath: null }],
      minds: [{ emotion: 'very_hard', situation: 'school', note: '' }],
    },
    18
  );
  assert.equal(opening.focus, 'mind');
  assert.match(opening.message, /어떻게 곁에/);
});

test('pet chat responses stay supportive and non-judgmental', () => {
  assert.match(replyToPetChat('오늘 너무 힘들었어', 'mind'), /고마워/);
  assert.match(replyToPetChat('입맛이 없었어', 'meal'), /평가하지 않을게/);
});
