/** 마음 쉼터 A (냠냠) and B (15분 파도타기). Client-only, nothing saved. No react-native import, so node can load it. */

// A 냠냠: imagine eating a food slowly, one bite at a time (Morewedge 2010: imagined bites habituate the urge).
// Ionicons has no cake glyph; the label carries the meaning.
export const NIBBLE_FOODS: readonly { id: string; label: string; icon: string }[] = [
  { id: 'cake', label: '케이크', icon: 'gift' },
  { id: 'snack', label: '과자', icon: 'fast-food' },
  { id: 'tteokbokki', label: '떡볶이', icon: 'flame' },
  { id: 'pizza', label: '피자', icon: 'pizza' },
  { id: 'icecream', label: '아이스크림', icon: 'ice-cream' },
  { id: 'sweetdrink', label: '달콤한 음료', icon: 'cafe' },
];
export const NIBBLE_BITES = 10;

// B 파도타기: an urge rises and falls like a wave; stay with it for 15 minutes, breathing 4s in / 6s out.
export const SURF_MS = 15 * 60_000;
const BREATH_IN_MS = 4_000;
const BREATH_MS = 10_000;

export type SurfState = { phase: 'surfing' | 'done'; remainingMs: number; breath: 'in' | 'out' };

/** Everything from timestamps, so a phone that slept in the background shows the right time on return. */
export function surfState(startedAt: number, now: number, durationMs = SURF_MS): SurfState {
  const elapsed = Math.max(0, now - startedAt);
  const remainingMs = Math.max(0, durationMs - elapsed);
  return {
    phase: remainingMs === 0 ? 'done' : 'surfing',
    remainingMs,
    breath: elapsed % BREATH_MS < BREATH_IN_MS ? 'in' : 'out',
  };
}

/** 14:59.2 left reads 15:00 — rounds up so the clock never shows 00:00 while still surfing. */
export function mmss(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
