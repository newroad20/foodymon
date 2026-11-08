import type { Emotion, MealStatus, Situation } from './growth.ts';

export interface FollowUpCopy {
  question: string;
  placeholder: string;
}

const MEAL_FOLLOW_UPS: Record<MealStatus, FollowUpCopy> = {
  ate: {
    question: '먹고 나서 몸이나 기분은 어떻게 달라졌어?',
    placeholder: '예: 든든해졌어, 기분이 편안해졌어',
  },
  much: {
    question: '많이 먹고 나서 몸이나 기분은 어땠어?',
    placeholder: '예: 든든했어, 맛있어서 더 먹었어',
  },
  little: {
    question: '조금만 먹게 된 이유가 있었어?',
    placeholder: '예: 시간이 부족했어, 입맛이 없었어',
  },
  hard: {
    question: '먹는 동안 어떤 점이 가장 어려웠어?',
    placeholder: '예: 냄새가 낯설었어, 삼키기 어려웠어',
  },
  skipped: {
    question: '왜 식사를 챙기는 게 어려웠어?',
    placeholder: '예: 바빴어, 먹고 싶은 마음이 없었어',
  },
  no_answer: {
    question: '지금은 자세히 말하기 어렵구나. 다음 식사를 위해 바라는 게 있을까?',
    placeholder: '말하고 싶은 만큼만 적어도 괜찮아',
  },
};

const EMOTION_QUESTIONS: Record<Emotion, string> = {
  very_good: '오늘 마음을 아주 좋게 만든 순간은 뭐였어?',
  good: '기분이 좋아진 계기가 있었어?',
  okay: '평범한 하루에서 기억에 남는 순간은 뭐였어?',
  tired: '오늘 무엇 때문에 마음이 지쳤어?',
  very_hard: '지금 가장 힘든 건 무엇이야? 말하고 싶은 만큼만 들려줘.',
  unsure: '마음을 잘 모르겠을 때, 몸은 어떤 느낌이야?',
  no_answer: '지금은 답하지 않아도 괜찮아.',
};

const SITUATION_PLACEHOLDERS: Partial<Record<Situation, string>> = {
  meal: '식사 전후에 어떤 일이 있었는지 적어 줘',
  body: '몸에서 느껴지는 변화를 적어 줘',
  school: '학교나 공부 중 어떤 일이 있었는지 적어 줘',
  family: '가족과 지내며 어떤 일이 있었는지 적어 줘',
  sleep_health: '잠이나 건강과 관련해 어떤 일이 있었는지 적어 줘',
  unknown: '이유를 몰라도 괜찮아. 지금 느낌을 적어 줘',
  custom: '어떤 일이었는지 편하게 적어 줘',
};

export function mealFollowUp(status: MealStatus): FollowUpCopy {
  return MEAL_FOLLOW_UPS[status];
}

export function emotionFollowUp(emotion: Emotion, situation: Situation | null): FollowUpCopy {
  return {
    question: EMOTION_QUESTIONS[emotion],
    placeholder:
      (situation && SITUATION_PLACEHOLDERS[situation]) ||
      '무슨 일이 있었고, 어떤 마음이 들었는지 적어 줘 (선택)',
  };
}
