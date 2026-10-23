/** A 4-digit birth year from user input, or null when it isn't a plausible one. */
export function parseBirthYear(text: string, now: Date = new Date()): number | null {
  if (!/^\d{4}$/.test(text.trim())) return null;
  const year = Number(text.trim());
  const thisYear = now.getFullYear();
  return year >= thisYear - 100 && year <= thisYear - 3 ? year : null;
}
