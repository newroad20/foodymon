import type { UserState } from '../types/foodymon';

export interface DayCloseResult {
  rewardedJelly: number;
  shieldUsed: boolean;
  shieldEarned: boolean;
}

/** What happened when the server closed out the days since the last check-in day. */
export interface RolloverResult extends DayCloseResult {
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

export function hasLoggedToday(state: UserState): boolean {
  return (
    state.today.sleepDiff !== null ||
    state.today.mealCount > 0 ||
    state.today.emotion !== null
  );
}

/**
 * Closes out the current day locally: updates streak/shields/jelly, pushes the
 * score into history, and clears today's check-ins. The real rollover runs on
 * the server (close_days in supabase/002_game_rpc.sql, same rules); this is
 * only used by the development "next day" simulation.
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
