import { addDays } from './trend.ts';

export interface DailyRecordRow {
  log_date: string;
  daily_score: number | null;
  meal_count: number;
  sleep_hours: number | string | null;
  emotion: number | null;
}

export interface BadgeDef {
  id: string;
  icon: string;
  name: string;
  description: string;
}

export interface CollectionStats {
  /** Level -> first date that look was seen (today's live level included). */
  seenLevels: Map<number, string>;
  recordedDays: number;
  /** Longest run of consecutive days with at least one check-in. */
  bestRun: number;
  bestScore: number | null;
  ownedCostumes: number;
  ownedBackgrounds: number;
  totalCostumes: number;
  totalBackgrounds: number;
}

export const badgeDefs: BadgeDef[] = [
  { id: 'first_step', icon: '🌱', name: '첫 걸음', description: '처음으로 체크인했어요' },
  { id: 'days_7', icon: '📅', name: '일주일 기록', description: '7일 동안 기록했어요' },
  { id: 'days_30', icon: '🗓️', name: '한 달 기록', description: '30일 동안 기록했어요' },
  { id: 'run_3', icon: '🔥', name: '3일 연속', description: '3일 연속으로 기록했어요' },
  { id: 'run_7', icon: '💪', name: '7일 연속', description: '7일 연속으로 기록했어요' },
  { id: 'run_30', icon: '🏆', name: '30일 연속', description: '30일 연속으로 기록했어요' },
  { id: 'score_95', icon: '🌟', name: '천상계 달성', description: '건강 지수 95점 이상을 받았어요' },
  { id: 'fashion_3', icon: '👗', name: '패셔니스타', description: '의상을 3개 모았어요' },
  { id: 'room_all', icon: '🏡', name: '마이룸 완성', description: '마이룸 소품을 모두 모았어요' },
];

const levelForScore = (score: number, levels: readonly { level: number; maxScore: number }[]) =>
  levels.find((l) => score <= l.maxScore)?.level ?? levels[levels.length - 1].level;

export function hasRecord(r: DailyRecordRow): boolean {
  return r.meal_count > 0 || r.sleep_hours !== null || r.emotion !== null;
}

export function computeCollection(input: {
  rows: readonly DailyRecordRow[];
  today: { date: string; score: number; logged: boolean };
  levels: readonly { level: number; maxScore: number }[];
  ownedCostumes: number;
  ownedBackgrounds: number;
  totalCostumes: number;
  totalBackgrounds: number;
}): CollectionStats {
  const { rows, today, levels } = input;

  // The server row for today may lag behind the app, so use the live values for today.
  const days = new Map<string, number | null>();
  for (const r of rows) {
    if (r.log_date !== today.date && hasRecord(r)) days.set(r.log_date, r.daily_score);
  }
  if (today.logged) days.set(today.date, today.score);

  const dates = [...days.keys()].sort();
  const seenLevels = new Map<number, string>();
  let bestScore: number | null = null;
  for (const date of dates) {
    const score = days.get(date);
    if (score === null || score === undefined) continue;
    const level = levelForScore(score, levels);
    if (!seenLevels.has(level)) seenLevels.set(level, date);
    if (bestScore === null || score > bestScore) bestScore = score;
  }

  let bestRun = 0;
  let run = 0;
  for (let i = 0; i < dates.length; i++) {
    run = i > 0 && addDays(dates[i - 1], 1) === dates[i] ? run + 1 : 1;
    bestRun = Math.max(bestRun, run);
  }

  return {
    seenLevels,
    recordedDays: dates.length,
    bestRun,
    bestScore,
    ownedCostumes: input.ownedCostumes,
    ownedBackgrounds: input.ownedBackgrounds,
    totalCostumes: input.totalCostumes,
    totalBackgrounds: input.totalBackgrounds,
  };
}

export function earnedBadges(s: CollectionStats): Set<string> {
  const earned = new Set<string>();
  if (s.recordedDays >= 1) earned.add('first_step');
  if (s.recordedDays >= 7) earned.add('days_7');
  if (s.recordedDays >= 30) earned.add('days_30');
  if (s.bestRun >= 3) earned.add('run_3');
  if (s.bestRun >= 7) earned.add('run_7');
  if (s.bestRun >= 30) earned.add('run_30');
  if (s.bestScore !== null && s.bestScore >= 95) earned.add('score_95');
  if (s.ownedCostumes >= 3) earned.add('fashion_3');
  if (s.totalBackgrounds > 0 && s.ownedBackgrounds >= s.totalBackgrounds) earned.add('room_all');
  return earned;
}
