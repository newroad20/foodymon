import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foodEmoji } from './foodEmoji.ts';

test('foodEmoji maps common Korean menus and falls back to a plate', () => {
  assert.equal(foodEmoji('김밥, 우유'), '🍙');
  assert.equal(foodEmoji('라면'), '🍜');
  assert.equal(foodEmoji('김치볶음밥'), '🍚');
  assert.equal(foodEmoji('된장찌개'), '🍲');
  assert.equal(foodEmoji(''), '🍽️');
});
