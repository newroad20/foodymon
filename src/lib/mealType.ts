/** The meal slot (index into MEAL_SLOTS) the user most likely means at this hour; they can change it. */
export function mealSlotForHour(hour: number): number {
  if (hour >= 5 && hour < 10) return 0; // 아침
  if (hour === 10) return 1; // 오전 간식
  if (hour >= 11 && hour < 14) return 2; // 점심
  if (hour >= 14 && hour < 17) return 3; // 오후 간식
  if (hour >= 17 && hour < 21) return 4; // 저녁
  return 5; // 저녁 간식
}
