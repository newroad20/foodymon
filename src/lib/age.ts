/** A 4-digit birth year from user input, or null when it isn't a plausible one. */
export function parseBirthYear(text: string, now: Date = new Date()): number | null {
  if (!/^\d{4}$/.test(text.trim())) return null;
  const year = Number(text.trim());
  const thisYear = now.getFullYear();
  return year >= thisYear - 100 && year <= thisYear - 3 ? year : null;
}

/**
 * True when someone born in `birthYear` may still be under 14 (Korean law asks a guardian's consent).
 * With only the year we can't tell before or after the birthday, so this year's 14-year-olds count too.
 */
export function mayBeUnder14(birthYear: number, now: Date = new Date()): boolean {
  return now.getFullYear() - birthYear <= 14;
}

/** A guardian contact that looks like an email or a phone number. */
export function isContact(text: string): boolean {
  const t = text.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) || t.replace(/\D/g, '').length >= 9;
}
