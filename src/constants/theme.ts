// The one design standard. Every colour, corner and text size in src/ comes from here;
// src/lib/designTokens.test.ts fails on anything else. No react-native import, so node can load it.

export const color = {
  // The single accent (mint). White text on it is 4.9:1.
  accent: '#1B7F66',
  accentEdge: '#125A48', // 4px bottom edge under accent buttons
  accentTint: '#E3F6EF',
  accentTintEdge: '#B5E6D4',
  bg: '#F2F8F4', // every screen
  surface: '#FFFFFF',
  // One grey family: slate. Text ink → muted, borders line/lineSoft, fills fill/fillSoft.
  ink: '#1E293B',
  inkSoft: '#334155',
  inkMuted: '#475569',
  muted: '#64748B', // smallest text on white still 4.5:1; also placeholders
  line: '#CBD5E1',
  lineSoft: '#E2E8F0',
  fill: '#F1F5F9',
  fillSoft: '#F8FAFC',
  danger: '#DC2626',
  dangerEdge: '#FCA5A5',
  // Sync-failed banner on home.
  dangerTint: '#FEE2E2',
  dangerInk: '#991B1B',
  warn: '#B45309',
  streak: '#E8734A', // the flame
  // Sign-in buttons follow the providers' brand rules.
  kakao: '#FEE500',
  kakaoInk: '#191919',
  googleLine: '#DADCE0',
  googleInk: '#1F1F1F',
} as const;

// Record categories (home dock, summary, day detail, tutorial).
// 마음 is sky blue ("마음 날씨"); ink #286FA3 on bg is 4.7:1.
export const CATEGORY_COLORS: Record<'meal' | 'sleep' | 'mind' | 'goal', { ink: string; bg: string; edge: string }> = {
  meal: { ink: '#C97719', bg: '#FFF0D7', edge: '#F3D39C' },
  sleep: { ink: '#7566C9', bg: '#ECE9FF', edge: '#D6D0F5' },
  mind: { ink: '#286FA3', bg: '#E3F1FB', edge: '#C3DFF3' },
  goal: { ink: color.accent, bg: color.accentTint, edge: color.accentTintEdge },
};

// Shape rule: tags 8, chips/inputs 12, buttons 16, cards 20, sheet tops 28, circles/pills full.
// xs 4 is for hairline bars and grab handles.
export const radius = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, sheet: 28, full: 999 } as const;

// iOS type ramp. `display` is the one huge number (the score on the summary tab).
export const font = {
  caption: 12,
  footnote: 13,
  subhead: 15,
  body: 17,
  title3: 20,
  title2: 22,
  title1: 28,
  large: 34,
  display: 52,
} as const;

// One elevation system: resting cards and things that float over content.
export const shadow = {
  card: '0px 4px 12px rgba(30, 41, 59, 0.08)',
  floating: '0px 10px 24px rgba(30, 41, 59, 0.14)',
} as const;
