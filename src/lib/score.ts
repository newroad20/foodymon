import type { UserState } from '../types/foodymon';

export interface ScoreParts {
  sleepScore: number;
  mealScore: number;
  emotionScore: number;
  /** Streak bonus multiplier (1.0 – 1.15). */
  multiplier: number;
}

/** Per-category scores (0–100) behind the daily health index. */
export function calcScoreParts(state: Pick<UserState, 'today' | 'targetMeals' | 'streak'>): ScoreParts {
  let sleepScore = 0;
  if (state.today.sleepDiff !== null) {
    if (state.today.sleepDiff <= 1) sleepScore = 100;
    else if (state.today.sleepDiff < 3) sleepScore = 50;
    else sleepScore = 0;
  }

  let mealScore = 0;
  if (state.today.mealCount > 0) {
    // Portion size never lowers the score: the app notices meals, it doesn't judge them.
    mealScore = Math.min(100, (state.today.mealCount / state.targetMeals) * 100);
  }

  // Any feeling the user shares counts the same: an honest hard day must not lower the pet.
  const emotionScore = state.today.emotion !== null ? 100 : 50;

  let multiplier = 1.0;
  if (state.streak >= 14) multiplier = 1.15;
  else if (state.streak >= 7) multiplier = 1.1;
  else if (state.streak >= 3) multiplier = 1.05;

  return { sleepScore, mealScore, emotionScore, multiplier };
}

/** Score shown before any check-in today (level 3, the neutral look); matches closeDay's reset. */
export const DAY_START_SCORE = 40;

/**
 * Legacy daily health index (sleep 35% + meals 35% + emotion 30%, streak bonus). Growth points
 * (lib/growth.ts) replaced it; only the yesterday backfill still uses it.
 */
export function calcDailyScore(
  state: Pick<UserState, 'today' | 'targetMeals' | 'streak'>,
  levels: readonly { level: number; maxScore: number }[]
): { score: number; level: number } {
  const { sleepScore, mealScore, emotionScore, multiplier } = calcScoreParts(state);
  const baseScore = sleepScore * 0.35 + mealScore * 0.35 + emotionScore * 0.3;

  // Before the first check-in of the day the pet starts at the neutral look, not the sickest one.
  const nothingLogged =
    state.today.sleepDiff === null && state.today.mealCount === 0 && state.today.emotion === null;
  const score = nothingLogged ? DAY_START_SCORE : Math.min(100, Math.round(baseScore * multiplier));

  let level = 3;
  for (const l of levels) {
    if (score <= l.maxScore) {
      level = l.level;
      break;
    }
  }

  return { score, level };
}
