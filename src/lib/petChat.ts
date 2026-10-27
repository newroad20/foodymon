import { sleepMinutes, type DayRecords } from './growth.ts';

export type ChatFocus = 'meal' | 'sleep' | 'mind' | 'day';

export interface PetChatOpening {
  focus: ChatFocus;
  message: string;
  suggestions: string[];
}

const LOW_MOODS = new Set(['tired', 'very_hard']);

/** Starts a small conversation from today's records without sending data to an AI service. */
export function buildPetChatOpening(
  name: string,
  records: DayRecords,
  hour: number
): PetChatOpening {
  const call = name ? `${name}, ` : '';
  const latestMind = records.minds[records.minds.length - 1];
  if (latestMind && LOW_MOODS.has(latestMind.emotion)) {
    return {
      focus: 'mind',
      message: `${call}오늘 마음이 조금 무거웠구나. 지금은 내가 어떻게 곁에 있어주면 좋을까?`,
      suggestions: ['그냥 같이 있어줘', '조금 얘기하고 싶어', '지금은 괜찮아'],
    };
  }

  const latestMeal = records.meals[records.meals.length - 1];
  if (latestMeal?.status === 'skipped') {
    return {
      focus: 'meal',
      message: `${call}식사를 챙기기 어려웠다고 했지. 어떤 점이 가장 힘들었어?`,
      suggestions: ['시간이 없었어', '입맛이 없었어', '챙길 여유가 없었어'],
    };
  }

  if (records.sleep && sleepMinutes(records.sleep) < 360) {
    return {
      focus: 'sleep',
      message: `${call}잠이 조금 짧았네. 지금 몸은 어떤 느낌이야?`,
      suggestions: ['조금 피곤해', '생각보다 괜찮아', '오늘은 일찍 쉴래'],
    };
  }

  if (!records.sleep && records.meals.length === 0 && records.minds.length === 0) {
    const timeGreeting = hour < 12 ? '좋은 아침이야' : hour < 18 ? '오늘 하루는 어때' : '오늘 하루는 어땠어';
    return {
      focus: 'day',
      message: `${call}${timeGreeting}? 기록하기 전에도 나랑 먼저 이야기해도 돼.`,
      suggestions: ['좋았던 일이 있었어', '조금 힘들었어', '그냥 평범했어'],
    };
  }

  return {
    focus: 'day',
    message: `${call}오늘 들려준 이야기 잘 듣고 있었어. 지금 가장 나누고 싶은 건 뭐야?`,
    suggestions: ['오늘 잘한 일이 있어', '조금 마음에 걸려', '그냥 같이 있고 싶어'],
  };
}

/** A safe, deterministic response for the first conversational pilot. */
export function replyToPetChat(text: string, focus: ChatFocus): string {
  const message = text.trim();
  if (/같이|곁에|여기까지/.test(message)) {
    return '응, 말하지 않아도 괜찮아. 내가 조용히 옆에 있을게. 🌿';
  }
  if (/힘들|속상|불안|걱정|울|지쳤|여유가 없/.test(message)) {
    return '그랬구나. 혼자 삼키지 않고 말해줘서 고마워. 지금 당장 다 해결하지 않아도 괜찮아.';
  }
  if (/피곤|졸려|잠/.test(message) || focus === 'sleep') {
    return '몸이 보내는 신호를 알려줘서 고마워. 오늘은 조금 천천히 가도 괜찮아. 내가 곁에 있을게.';
  }
  if (/시간|입맛|식사|먹/.test(message) || focus === 'meal') {
    return '그런 이유가 있었구나. 잘 먹고 못 먹고를 평가하지 않을게. 다음 기회에 챙길 수 있으면 그걸로 충분해.';
  }
  if (/좋|행복|신나|잘한|괜찮/.test(message)) {
    return '그 이야기를 들으니 나도 마음이 몽글몽글해! 오늘의 좋은 순간을 같이 기억하고 싶어. ✨';
  }
  return '응, 잘 듣고 있어. 네가 들려주는 이야기는 작아 보여도 나한테는 소중해.';
}
