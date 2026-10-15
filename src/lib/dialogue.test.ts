import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickDialogue, type DialogueLines } from './dialogue.ts';

const keys = ['good', 'normal', 'bad', 'morning', 'afternoon', 'evening', 'night', 'askSleep', 'askMeal', 'askEmotion', 'lowMood', 'streak'] as const;
const lines = Object.fromEntries(keys.map((k) => [k, [k === 'streak' ? 'streak {n}' : k]])) as unknown as DialogueLines;
const empty = { sleepDiff: null, sleepHours: null, mealCount: 0, badMealCount: 0, emotion: null };
const all = (state: Parameters<typeof pickDialogue>[0], hour: number) =>
  new Set(Array.from({ length: 50 }, (_, i) => pickDialogue(state, lines, hour, () => (i * 0.137) % 1)));

test('low mood gets company lines only', () => {
  const said = all({ today: { ...empty, emotion: 20 }, currentDailyScore: 90, streak: 10 }, 9);
  assert.deepEqual([...said].sort(), ['bad', 'lowMood']);
});

test('morning with nothing logged can ask about sleep and meals, and mentions the streak', () => {
  const said = all({ today: empty, currentDailyScore: 40, streak: 5 }, 9);
  for (const l of ['normal', 'morning', 'askSleep', 'askMeal', 'streak 5']) assert.ok(said.has(l), l);
  assert.ok(!said.has('askEmotion'));
});

test('logged items are not asked about again', () => {
  const today = { ...empty, sleepHours: 7, mealCount: 1, emotion: 80 };
  const said = all({ today, currentDailyScore: 85, streak: 0 }, 23);
  assert.deepEqual([...said].sort(), ['good', 'night']);
});
