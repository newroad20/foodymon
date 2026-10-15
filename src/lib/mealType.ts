export const MEAL_TYPES = ['아침', '점심', '저녁', '간식'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

/** The meal the user most likely means at this hour; they can change it. */
export function mealTypeForHour(hour: number): MealType {
  if (hour >= 5 && hour < 10) return '아침';
  if (hour >= 10 && hour < 15) return '점심';
  if (hour >= 17 && hour < 22) return '저녁';
  return '간식';
}
