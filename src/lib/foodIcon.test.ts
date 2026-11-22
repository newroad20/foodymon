import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foodIcon } from './foodIcon.ts';

test('foodIcon maps common Korean menus and falls back to a plate', () => {
  assert.equal(foodIcon('김밥, 우유'), 'restaurant');
  assert.equal(foodIcon('피자'), 'pizza');
  assert.equal(foodIcon('우유'), 'cafe');
  assert.equal(foodIcon('딸기'), 'nutrition');
  assert.equal(foodIcon(''), 'restaurant');
});
