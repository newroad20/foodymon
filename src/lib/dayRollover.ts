import type { UserState } from '../types/foodymon';

export interface DayCloseResult {
  rewardedJelly: number;
  shieldUsed: boolean;
  shieldEarned: boolean;
}

export interface RolloverResult extends DayCloseResult {
  state: UserState;
  /** Number of calendar days that passed (0 = still the same day). */
  daysPassed: number;
  /** Days skipped without any check-in, after the last active day. */
  missedDays: number;
  shieldsUsed: number;
  streakReset: boolean;
}

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Whole calendar days from `fromKey` to `toKey` (DST-safe). */
export function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

export function hasLoggedToday(state: UserState): boolean {
  return (
    state.today.sleepDiff !== null ||
    state.today.mealCount > 0 ||
    state.today.emotion !== null
  );
}

/**
 * Closes out the current day: updates streak/shields/jelly, pushes the score
 * into history, and clears today's check-ins.
 */
export function closeDay(state: UserState): { state: UserState } & DayCloseResult {
  let streak = state.streak;
  let shields = state.shields;
  let rewardedJelly = 0;
  let shieldUsed = false;
  let shieldEarned = false;

  if (!hasLoggedToday(state)) {
    if (shields > 0) {
      shields -= 1;
      shieldUsed = true;
    } else {
      streak = 0;
    }
  } else {
    streak += 1;
    rewardedJelly = 10 + Math.floor(streak / 3) * 5;
    if (streak % 7 === 0) {
      shields += 1;
      shieldEarned = true;
    }
  }

  const historyScores = [...state.historyScores, state.currentDailyScore];
  if (historyScores.length > 7) historyScores.shift();

  return {
    state: {
      ...state,
      streak,
      shields,
      currency: state.currency + rewardedJelly,
      historyScores,
      today: {
        sleepDiff: null,
        sleepHours: null,
        mealCount: 0,
        badMealCount: 0,
        emotion: null,
      },
      currentDailyScore: 40,
      level: 3,
    },
    rewardedJelly,
    shieldUsed,
    shieldEarned,
  };
}

/**
 * Brings the state up to `now`: closes the last active day, then treats every
 * fully skipped day in between as a day without check-ins (shield or reset).
 * A state without `lastActiveDate` is just stamped with today.
 */
export function rolloverToDate(state: UserState, now: Date): RolloverResult {
  const todayKey = toDateKey(now);
  const base: RolloverResult = {
    state,
    daysPassed: 0,
    missedDays: 0,
    shieldsUsed: 0,
    streakReset: false,
    rewardedJelly: 0,
    shieldUsed: false,
    shieldEarned: false,
  };

  if (!state.lastActiveDate) {
    return { ...base, state: { ...state, lastActiveDate: todayKey } };
  }

  const daysPassed = daysBetween(state.lastActiveDate, todayKey);
  // Same day, or the clock moved backwards: nothing to close.
  if (daysPassed <= 0) return base;

  const first = closeDay(state);
  let next = first.state;
  let shieldsUsed = first.shieldUsed ? 1 : 0;
  let streakReset = state.streak > 0 && next.streak === 0;

  const missedDays = daysPassed - 1;
  for (let i = 0; i < missedDays; i++) {
    const r = closeDay(next);
    if (r.shieldUsed) shieldsUsed += 1;
    if (next.streak > 0 && r.state.streak === 0) streakReset = true;
    next = r.state;
  }

  return {
    state: { ...next, lastActiveDate: todayKey },
    daysPassed,
    missedDays,
    shieldsUsed,
    streakReset,
    rewardedJelly: first.rewardedJelly,
    shieldUsed: shieldsUsed > 0,
    shieldEarned: first.shieldEarned,
  };
}
