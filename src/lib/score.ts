import type { UserState } from '../types/foodymon';

/** Daily health index: sleep 35% + meals 35% + emotion 30%, boosted by streak. */
export function calcDailyScore(
  state: Pick<UserState, 'today' | 'targetMeals' | 'streak'>,
  levels: readonly { level: number; maxScore: number }[]
): { score: number; level: number } {
  let sleepScore = 0;
  if (state.today.sleepDiff !== null) {
    if (state.today.sleepDiff <= 1) sleepScore = 100;
    else if (state.today.sleepDiff < 3) sleepScore = 50;
    else sleepScore = 0;
  }

  let mealScore = 0;
  if (state.today.mealCount > 0) {
    let base = (state.today.mealCount / state.targetMeals) * 100;
    if (base > 100) base = 100;
    base -= state.today.badMealCount * 20;
    mealScore = Math.max(0, base);
  }

  const emotionScore = state.today.emotion !== null ? state.today.emotion : 50;

  const baseScore = sleepScore * 0.35 + mealScore * 0.35 + emotionScore * 0.3;

  let multiplier = 1.0;
  if (state.streak >= 14) multiplier = 1.15;
  else if (state.streak >= 7) multiplier = 1.1;
  else if (state.streak >= 3) multiplier = 1.05;

  const score = Math.min(100, Math.round(baseScore * multiplier));

  let level = 3;
  for (const l of levels) {
    if (score <= l.maxScore) {
      level = l.level;
      break;
    }
  }

  return { score, level };
}
