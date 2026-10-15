import type { UserState } from '../types/foodymon';

export interface DialogueLines {
  good: string[];
  normal: string[];
  bad: string[];
  morning: string[];
  afternoon: string[];
  evening: string[];
  night: string[];
  askSleep: string[];
  askMeal: string[];
  askEmotion: string[];
  lowMood: string[];
  streak: string[];
}

type DialogueState = Pick<UserState, 'today' | 'currentDailyScore' | 'streak'>;

function timePool(lines: DialogueLines, hour: number) {
  if (hour >= 5 && hour < 11) return lines.morning;
  if (hour >= 11 && hour < 17) return lines.afternoon;
  if (hour >= 17 && hour < 22) return lines.evening;
  return lines.night;
}

/** Picks what FoodyMon says now, from today's check-ins, the hour and the streak. */
export function pickDialogue(
  state: DialogueState,
  lines: DialogueLines,
  hour: number,
  rand: () => number = Math.random
): string {
  const pick = <T,>(pool: T[]) => pool[Math.floor(rand() * pool.length)];

  // A low mood gets company only, no cheering or nudges.
  if (state.today.emotion !== null && state.today.emotion <= 40) return pick([...lines.lowMood, ...lines.bad]);

  const score = state.currentDailyScore;
  const pools = [score >= 80 ? lines.good : score < 40 ? lines.bad : lines.normal, timePool(lines, hour)];
  if (state.today.sleepHours === null && hour >= 5 && hour < 14) pools.push(lines.askSleep);
  if (state.today.mealCount === 0 && hour >= 8) pools.push(lines.askMeal);
  if (state.today.emotion === null && hour >= 12) pools.push(lines.askEmotion);
  if (state.streak >= 3) pools.push(lines.streak.map((l) => l.replace('{n}', String(state.streak))));

  return pick(pick(pools));
}
