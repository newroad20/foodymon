// One source for the record-category colours (home dock, summary, day detail, tutorial).
// 마음 is sky blue ("마음 날씨"); ink #286FA3 on bg is 4.7:1.
export const CATEGORY_COLORS: Record<'meal' | 'sleep' | 'mind' | 'goal', { ink: string; bg: string; edge: string }> = {
  meal: { ink: '#C97719', bg: '#FFF0D7', edge: '#F3D39C' },
  sleep: { ink: '#7566C9', bg: '#ECE9FF', edge: '#D6D0F5' },
  mind: { ink: '#286FA3', bg: '#E3F1FB', edge: '#C3DFF3' },
  goal: { ink: '#1B7F66', bg: '#E3F6EF', edge: '#B5E6D4' },
};
