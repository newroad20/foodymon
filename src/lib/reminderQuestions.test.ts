import assert from 'node:assert/strict';
import { test } from 'node:test';
import { upcomingReminders } from './reminderQuestions.ts';

test('skips times already passed today', () => {
  const list = upcomingReminders(new Date(2026, 10, 4, 12), 2);
  assert.deepEqual(
    list.map((r) => [r.date.getDate(), r.date.getHours()]),
    [[4, 20], [5, 9], [5, 20]]
  );
});

test('the question changes from day to day, across a month end', () => {
  const list = upcomingReminders(new Date(2026, 10, 29, 21), 3);
  assert.equal(list.length, 4);
  assert.equal(list[0].date.getMonth(), 10);
  assert.equal(list[2].date.getMonth(), 11);
  assert.notEqual(list[0].body, list[2].body);
  assert.notEqual(list[1].body, list[3].body);
});

test('stays under the iOS limit of 64 pending notifications', () => {
  assert.ok(upcomingReminders(new Date(2026, 10, 4, 0), 14).length <= 64);
});
