// Growth points (재형 님 점수 기준표, 2026-10-21). Mirrors day_points / sync_growth in
// supabase/005_growth.sql — the server is the source of truth; keep both in sync.

export const MEAL_SLOTS = ['아침', '오전 간식', '점심', '오후 간식', '저녁', '저녁 간식'] as const;

export type MealStatus = 'ate' | 'little' | 'hard' | 'skipped' | 'no_answer';
export type Emotion = 'very_good' | 'good' | 'okay' | 'tired' | 'very_hard' | 'unsure' | 'no_answer';
export type Situation = 'meal' | 'body' | 'school' | 'family' | 'sleep_health' | 'unknown' | 'custom';

export interface SleepRecord {
  bedTime: string; // 'HH:MM'
  wakeTime: string;
}
export interface MealRecord {
  slot: number; // index into MEAL_SLOTS
  status: MealStatus;
  menu: string;
  feeling: string;
  memo: string;
  photoPath: string | null;
}
export interface MindRecord {
  emotion: Emotion;
  situation: Situation | null;
  note: string;
}
export interface DayRecords {
  sleep: SleepRecord | null;
  meals: MealRecord[];
  minds: MindRecord[];
}

export interface DayPoints {
  sleep: number;
  meal: number;
  mind: number;
  goal: number;
  total: number;
}

/**
 * Cumulative points needed to reach each stage; the pet hatches at Lv.1 with 0.
 * Paced for the 100 days: quick first steps, then an average of 40 points a day reaches the last
 * stage on day 100. Mirrors sync_growth in supabase/013_stage_one.sql.
 */
export const STAGE_POINTS: Record<number, number> = { 1: 0, 2: 100, 3: 250, 4: 500, 5: 1800, 6: 4000 };
export const MAX_MIND_RECORDS = 3;
// Small goals start after this many observation days (SQL observe_days(): pilot 1, release 7).
// The app only estimates the goal part locally; the server's points replace it after each save.

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export interface SleepGuidance {
  ageLabel: string;
  durationLabel: string;
  minMinutes: number;
  maxMinutes: number;
  bedtimeStart: string;
  bedtimeEnd: string;
}

/** FoodyMon's age-based sleep rhythm guide. Duration follows established sleep guidance. */
export function sleepGuidance(birthYear: number | null, year: number): SleepGuidance {
  const age = birthYear === null ? 19 : year - birthYear;
  if (age <= 12) {
    return { ageLabel: '유아·어린이', durationLabel: '9~12시간', minMinutes: 540, maxMinutes: 720, bedtimeStart: '19:00', bedtimeEnd: '21:00' };
  }
  if (age <= 18) {
    return { ageLabel: '청소년', durationLabel: '8~10시간', minMinutes: 480, maxMinutes: 600, bedtimeStart: '21:00', bedtimeEnd: '22:00' };
  }
  return { ageLabel: '성인', durationLabel: '7~9시간', minMinutes: 420, maxMinutes: 540, bedtimeStart: '22:00', bedtimeEnd: '23:00' };
}

/** Minutes since 18:00, so after-midnight bedtimes remain later than evening bedtimes. */
const nightMinutes = (hhmm: string) => (toMinutes(hhmm) - 18 * 60 + 1440) % 1440;

export function bedtimeDistanceMinutes(bedTime: string, guidance: SleepGuidance): number {
  const value = nightMinutes(bedTime);
  const start = nightMinutes(guidance.bedtimeStart);
  const end = nightMinutes(guidance.bedtimeEnd);
  if (value >= start && value <= end) return 0;
  const circular = (a: number, b: number) => Math.min(Math.abs(a - b), 1440 - Math.abs(a - b));
  return Math.min(circular(value, start), circular(value, end));
}

export function isBedtimeRecommended(bedTime: string, guidance: SleepGuidance): boolean {
  return bedtimeDistanceMinutes(bedTime, guidance) === 0;
}

/** Minutes asleep from bed and wake times, across midnight. */
export function sleepMinutes(r: SleepRecord): number {
  return (((toMinutes(r.wakeTime) - toMinutes(r.bedTime)) % 1440) + 1440) % 1440;
}

const EATEN: MealStatus[] = ['ate', 'little', 'hard'];
const MEAL_POINTS = [0, 10, 20, 28, 34, 38, 40];

/** One day's growth points; `year` is the calendar year of that day. */
export function dayPoints(day: DayRecords, birthYear: number | null, year: number): DayPoints {
  let areas = 0;

  let sleep = 0;
  if (day.sleep) {
    areas++;
    const m = sleepMinutes(day.sleep);
    const guide = sleepGuidance(birthYear, year);
    sleep = m > guide.maxMinutes
      ? 24
      : m >= guide.minMinutes
        ? 30
        : m >= guide.minMinutes - 60
          ? 24
          : m >= guide.minMinutes - 120
            ? 18
            : 10;
    // Duration alone is not the whole rhythm. A far-late bedtime still earns credit,
    // but cannot receive the maximum sleep growth points.
    const bedtimeDistance = bedtimeDistanceMinutes(day.sleep.bedTime, guide);
    if (bedtimeDistance > 120) sleep = Math.min(sleep, 18);
    else if (bedtimeDistance > 0) sleep = Math.min(sleep, 24);
  }

  const eaten = day.meals.filter((r) => EATEN.includes(r.status)).length;
  const meal = MEAL_POINTS[Math.min(eaten, 6)];
  if (day.meals.length > 0) areas++;

  let mind = 0;
  for (const r of day.minds) {
    mind = Math.max(mind, r.emotion !== 'no_answer' && (r.situation !== null || r.note !== '') ? 10 : 5);
  }
  if (mind > 0) areas++;

  const goal = areas >= 2 ? 20 : areas === 1 ? 10 : 0;
  return { sleep, meal, mind, goal, total: Math.min(100, sleep + meal + mind + goal) };
}

/** Progress toward the next stage, for the home growth card. */
export function growthProgress(level: number, total: number) {
  const next = STAGE_POINTS[level + 1];
  if (next === undefined) return { next: null, remaining: 0, ratio: 1 };
  const from = STAGE_POINTS[level] ?? 0;
  return {
    next,
    remaining: Math.max(0, next - total),
    ratio: Math.min(1, Math.max(0, (total - from) / (next - from))),
  };
}

// Legacy daily summary (daily_logs) still drives streak, jelly, quests and the collection.
const EMOTION_LEGACY: Record<Emotion, number> = {
  very_good: 100, good: 80, okay: 60, tired: 40, very_hard: 20, unsure: 50, no_answer: 50,
};

/** The old per-day totals, derived from today's records. */
export function legacyToday(day: DayRecords, usualSleepHours: number) {
  const sleepHours = day.sleep ? Math.round((sleepMinutes(day.sleep) / 60) * 10) / 10 : null;
  const last = day.minds[day.minds.length - 1];
  return {
    sleepHours,
    sleepDiff: sleepHours === null ? null : Math.abs(usualSleepHours - sleepHours),
    mealCount: day.meals.filter((r) => EATEN.includes(r.status)).length,
    badMealCount: 0,
    emotion: last ? EMOTION_LEGACY[last.emotion] : null,
  };
}

export const EMPTY_DAY: DayRecords = { sleep: null, meals: [], minds: [] };
export const ZERO_POINTS: DayPoints = { sleep: 0, meal: 0, mind: 0, goal: 0, total: 0 };
