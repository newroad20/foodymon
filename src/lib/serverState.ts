import type { LogItem, UserState } from '../types/foodymon';
import type { RolloverResult } from './dayRollover';
import {
  dayPoints,
  EMPTY_DAY,
  legacyToday,
  type DayRecords,
  type Emotion,
  type MealStatus,
  type Situation,
} from './growth.ts';

export interface ProfileRow {
  nickname: string;
  onboarded: boolean;
  target_sleep: number | string;
  target_meals: number;
  usual_meal_size: number | string;
  birth_year?: number | null;
  journey_start?: string | null;
  jelly_balance: number;
  streak: number;
  shields: number;
  equipped_costume: string | null;
  equipped_backgrounds: string[];
  history_scores: number[];
  last_checkin_date: string | null;
  missed_date?: string | null;
  missed_prev_streak?: number | null;
  evolution_stage?: number;
}

export interface DailyLogRow {
  sleep_hours: number | string | null;
  sleep_diff: number | string | null;
  meal_count: number;
  bad_meal_count: number;
  emotion: number | null;
}

export interface CheckinLogRow {
  id: string;
  type: LogItem['type'];
  content: string;
  created_at: string;
  photo_path?: string | null;
}

export interface SleepRecordRow {
  bed_time: string; // 'HH:MM:SS'
  wake_time: string;
}
export interface MealRecordRow {
  slot: number;
  status: MealStatus;
  menu: string;
  feeling: string;
  memo: string;
  photo_path: string | null;
}
export interface MindRecordRow {
  emotion: Emotion;
  situation: Situation | null;
  note: string;
}

/** Today's records from their server rows. */
export function toDayRecords(rows: {
  sleep: SleepRecordRow | null;
  meals: MealRecordRow[];
  minds: MindRecordRow[];
}): DayRecords {
  return {
    sleep: rows.sleep
      ? { bedTime: rows.sleep.bed_time.slice(0, 5), wakeTime: rows.sleep.wake_time.slice(0, 5) }
      : null,
    meals: rows.meals.map((m) => ({
      slot: m.slot,
      status: m.status,
      menu: m.menu,
      feeling: m.feeling,
      memo: m.memo,
      photoPath: m.photo_path,
    })),
    minds: rows.minds.map((m) => ({ emotion: m.emotion, situation: m.situation, note: m.note })),
  };
}

/** Recomputes today's growth points and the legacy daily totals from the records. */
export function withDayPoints(state: UserState, year: number = new Date().getFullYear()): UserState {
  const todayPoints = dayPoints(state.records, state.birthYear, year);
  return {
    ...state,
    today: legacyToday(state.records, state.targetSleep),
    todayPoints,
    currentDailyScore: todayPoints.total,
  };
}

export interface UserItemRow {
  item_type: 'costume' | 'background';
  item_id: string;
}

export interface CloseDaysResponse {
  days_passed: number;
  missed_days: number;
  rewarded_jelly: number;
  milestone_bonus: number;
  shield_earned: boolean;
  shields_used: number;
  streak_reset: boolean;
}

// Postgres numeric columns arrive as strings through PostgREST.
const num = (v: number | string | null): number | null => (v === null ? null : Number(v));

/** Same format the app has always shown in the history list. */
export function formatLogTime(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  let hh = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = hh >= 12 ? '오후' : '오전';
  hh = hh % 12 || 12;
  return `${mm}월 ${dd}일 ${ampm} ${hh}:${min}`;
}

export function buildUserState(rows: {
  profile: ProfileRow;
  today: DailyLogRow | null;
  logs: CheckinLogRow[];
  items: UserItemRow[];
  records?: DayRecords;
  growthTotal?: number;
}): UserState {
  const { profile, today, logs, items } = rows;
  const state: UserState = {
    masterName: profile.nickname,
    onboarded: profile.onboarded,
    targetSleep: Number(profile.target_sleep),
    targetMeals: profile.target_meals,
    usualMealSize: Number(profile.usual_meal_size),
    birthYear: profile.birth_year ?? null,
    journeyStart: profile.journey_start ?? null,

    streak: profile.streak,
    shields: profile.shields,
    currency: profile.jelly_balance,
    ownedCostumes: items.filter((i) => i.item_type === 'costume').map((i) => i.item_id),
    ownedBackgrounds: items.filter((i) => i.item_type === 'background').map((i) => i.item_id),
    equippedCostume: profile.equipped_costume,
    equippedBackgrounds: profile.equipped_backgrounds ?? [],

    isFrozen: false,
    historyScores: profile.history_scores ?? [],

    today: {
      sleepDiff: num(today?.sleep_diff ?? null),
      sleepHours: num(today?.sleep_hours ?? null),
      mealCount: today?.meal_count ?? 0,
      badMealCount: today?.bad_meal_count ?? 0,
      emotion: today?.emotion ?? null,
    },

    records: rows.records ?? EMPTY_DAY,
    todayPoints: { sleep: 0, meal: 0, mind: 0, goal: 0, total: 0 },
    growthTotal: rows.growthTotal ?? 0,

    currentDailyScore: 0,
    averageScore: 50,
    level: profile.evolution_stage ?? 1,
    logs: logs.map((l) => ({
      id: l.id,
      time: formatLogTime(new Date(l.created_at)),
      type: l.type,
      content: l.content,
      photoPath: l.photo_path ?? null,
    })),
    lastActiveDate: profile.last_checkin_date,
    backfill: profile.missed_date
      ? { date: profile.missed_date, prevStreak: profile.missed_prev_streak ?? 0 }
      : null,
  };

  // Days before the record redesign only have daily_logs totals; keep those until records exist.
  if (!rows.records) return { ...state, currentDailyScore: 0 };
  return withDayPoints(state);
}

export function toRolloverResult(r: CloseDaysResponse): RolloverResult {
  return {
    daysPassed: r.days_passed,
    missedDays: r.missed_days,
    rewardedJelly: r.rewarded_jelly,
    milestoneBonus: r.milestone_bonus ?? 0,
    shieldEarned: r.shield_earned,
    shieldsUsed: r.shields_used,
    shieldUsed: r.shields_used > 0,
    streakReset: r.streak_reset,
  };
}

/** daily_logs row for the state's current day. */
export function toDailyLogRow(state: UserState, userId: string, logDate: string) {
  return {
    user_id: userId,
    log_date: logDate,
    sleep_hours: state.today.sleepHours,
    sleep_diff: state.today.sleepDiff,
    meal_count: state.today.mealCount,
    bad_meal_count: state.today.badMealCount,
    emotion: state.today.emotion,
    daily_score: state.currentDailyScore,
  };
}
