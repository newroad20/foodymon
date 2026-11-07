// The 100-day journey: day 1 is the hatch day, and days pass on the calendar even when nothing is logged.
export const JOURNEY_DAYS = 100;

const parts = (key: string) => key.split('-').map(Number);

/** 1 on the start date; above JOURNEY_DAYS once the journey is over. Keys are 'YYYY-MM-DD'. */
export function journeyDay(start: string, today: string): number {
  const utc = (key: string) => {
    const [y, m, d] = parts(key);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(today) - utc(start)) / 86400000) + 1;
}

/** Local midnight right after the last day. */
export function journeyEnd(start: string): Date {
  const [y, m, d] = parts(start);
  return new Date(y, m - 1, d + JOURNEY_DAYS);
}
