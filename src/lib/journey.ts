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

export type JourneyCellState = 'shared' | 'rest' | 'today' | 'ahead';

/** One cell per day of the journey; a day without records is a rest day, never a failure. */
export function journeyCells(start: string, today: string, sharedDays: ReadonlySet<string>) {
  const [y, m, d] = parts(start);
  const todayNo = journeyDay(start, today);
  return Array.from({ length: JOURNEY_DAYS }, (_, i) => {
    const day = i + 1;
    const dt = new Date(y, m - 1, d + i);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const state: JourneyCellState =
      day === todayNo ? 'today' : day > todayNo ? 'ahead' : sharedDays.has(key) ? 'shared' : 'rest';
    return { day, key, state };
  });
}
