// Questions that invite a look back, never "come and log". No grading, amounts or comparing with others.
const MORNING = [
  '🌿 어젯밤 잠은 내 몸에 어떤 느낌을 남겼을까?',
  '🌿 지금 몸과 마음 중 어디를 먼저 돌봐 주고 싶어?',
  '🌿 오늘 나에게 가장 필요한 건 뭘까?',
  '🌿 요즘 나를 편안하게 해 주는 습관은 뭐야?',
  '🌿 오늘 나를 위해 해 줄 수 있는 작은 일은 뭘까?',
  '🌿 요즘 언제 잠들 때 가장 편안했어?',
  '🌿 눈을 떴을 때 가장 먼저 든 생각은 뭐였어?',
];

const EVENING = [
  '🌙 요즘 나, 어떻게 지내고 있는 것 같아?',
  '🌙 오늘 먹은 것 중 가장 기억에 남는 맛은 뭐였어?',
  '🌙 오늘 내 마음은 어떤 날씨였을까?',
  '🌙 오늘 나를 웃게 한 작은 일은 뭐였어?',
  '🌙 오늘 식사 중 마음이 가장 편했던 순간은 언제였어?',
  '🌙 지친 순간이 있었다면, 그때 무엇이 도움이 됐어?',
  '🌙 오늘의 나에게 고맙다고 말한다면 무엇이 고마울까?',
  '🌙 이번 주의 나에게 한마디 해 준다면?',
];

const TIMES = [
  { hour: 9, pool: MORNING },
  { hour: 20, pool: EVENING },
];

/** The next reminders from `now`, a different question each day; times already passed are skipped. */
export function upcomingReminders(now: Date, days: number): { date: Date; body: string }[] {
  const result: { date: Date; body: string }[] = [];
  for (let d = 0; d < days; d++) {
    for (const { hour, pool } of TIMES) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hour);
      if (date <= now) continue;
      const dayNumber = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
      result.push({ date, body: pool[dayNumber % pool.length] });
    }
  }
  return result;
}
