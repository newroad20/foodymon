import test from 'node:test';
import assert from 'node:assert/strict';
import { filterHistory, groupHistoryByDate, historyCounts } from './history.ts';
import type { LogItem } from '../types/foodymon.ts';

const logs: LogItem[] = [
  { id: '1', time: '10월 27일 오후 1:00', type: 'meal', content: '점심' },
  { id: '2', time: '10월 27일 오전 9:00', type: 'skip', content: '아침 못 먹음' },
  { id: '3', time: '10월 26일 오후 11:00', type: 'sleep', content: '수면' },
  { id: '4', time: '10월 26일 오후 6:00', type: 'emotion', content: '마음' },
];

test('history filters skipped meals into the meal category', () => {
  assert.deepEqual(filterHistory(logs, 'meal').map((log) => log.id), ['1', '2']);
  assert.deepEqual(historyCounts(logs), { all: 4, meal: 2, sleep: 1, emotion: 1 });
});

test('history groups adjacent records by their displayed date', () => {
  assert.deepEqual(
    groupHistoryByDate(logs).map((group) => [group.date, group.logs.length]),
    [
      ['10월 27일', 2],
      ['10월 26일', 2],
    ]
  );
});
