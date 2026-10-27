import type { LogItem } from '../types/foodymon.ts';

export type HistoryCategory = 'all' | 'meal' | 'sleep' | 'emotion';

/** "못 먹음"도 사용자가 찾을 때는 식사 기록에 포함한다. */
export function historyCategoryFor(log: LogItem): Exclude<HistoryCategory, 'all'> {
  return log.type === 'skip' ? 'meal' : log.type;
}

export function filterHistory(logs: LogItem[], category: HistoryCategory): LogItem[] {
  if (category === 'all') return logs;
  return logs.filter((log) => historyCategoryFor(log) === category);
}

export function historyCounts(logs: LogItem[]): Record<HistoryCategory, number> {
  return logs.reduce(
    (counts, log) => {
      counts.all += 1;
      counts[historyCategoryFor(log)] += 1;
      return counts;
    },
    { all: 0, meal: 0, sleep: 0, emotion: 0 }
  );
}

export function groupHistoryByDate(logs: LogItem[]): { date: string; logs: LogItem[] }[] {
  const groups: { date: string; logs: LogItem[] }[] = [];
  for (const log of logs) {
    const date = log.time.match(/^\d{2}월 \d{2}일/)?.[0] ?? '날짜 미상';
    const current = groups[groups.length - 1];
    if (current?.date === date) current.logs.push(log);
    else groups.push({ date, logs: [log] });
  }
  return groups;
}
