import { toDateKey } from './dayRollover.ts';

export interface TrendPoint {
  /** YYYY-MM-DD */
  date: string;
  /** null when nothing was recorded that day. */
  score: number | null;
  isToday: boolean;
}

/** Date key `days` days after `dateKey` (negative to go back). */
export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return toDateKey(new Date(y, m - 1, d + days));
}

/**
 * One point per calendar day for the last `days` days ending today, oldest
 * first. Today's score comes from the app (it may be ahead of the server).
 */
export function buildTrend(
  rows: readonly { log_date: string; daily_score: number | null }[],
  todayKey: string,
  days: number,
  todayScore: number | null
): TrendPoint[] {
  const byDate = new Map(rows.map((r) => [r.log_date, r.daily_score]));
  const points: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(todayKey, -i);
    const isToday = i === 0;
    points.push({ date, score: isToday ? todayScore : byDate.get(date) ?? null, isToday });
  }
  return points;
}

export function summarizeTrend(points: readonly TrendPoint[]) {
  const scored = points.filter((p): p is TrendPoint & { score: number } => p.score !== null);
  if (scored.length === 0) return { average: null, best: null, recordedDays: 0 };
  const average = Math.round(scored.reduce((sum, p) => sum + p.score, 0) / scored.length);
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
  return { average, best, recordedDays: scored.length };
}
