import { CostumeItem, BackgroundItem, QuizQuestion, LevelInfo } from '@/types/foodymon';
import type { ImageSourcePropType } from 'react-native';
import type { Emotion, MealStatus, Situation } from '@/lib/growth';

export const levelsData: LevelInfo[] = [
  { level: 1, maxScore: 19, name: '푹 쉬는 푸디몬', image: require('@/assets/images/level1.png') },
  { level: 2, maxScore: 39, name: '졸린 푸디몬', image: require('@/assets/images/level2.png') },
  { level: 3, maxScore: 59, name: '기본 푸디몬', image: require('@/assets/images/level3.png') },
  { level: 4, maxScore: 79, name: '건강한 푸디몬', image: require('@/assets/images/level4.png') },
  { level: 5, maxScore: 94, name: '생기발랄 푸디몬', image: require('@/assets/images/level5.png') },
  { level: 6, maxScore: 100, name: '천상계 푸디몬', image: require('@/assets/images/level6.png') },
];

// Lifestyle goal choices shared by onboarding and My Page.
export const sleepTargetOptions = [5, 6, 7, 8, 9];
export const mealTargetOptions = [1, 2, 3, 4];

export const emotionOptions = [
  { score: 100, label: '매우 좋음', desc: '기운이 넘치고 행복해요!' },
  { score: 80, label: '좋음', desc: '평온하고 기분 좋은 하루예요.' },
  { score: 60, label: '보통', desc: '무난하고 평범한 일상이에요.' },
  { score: 40, label: '조금 지침', desc: '스트레스나 피로감이 있어요.' },
  { score: 20, label: '매우 힘듦', desc: '지치고 위로가 필요해요...' },
];

// Faces for check-in reactions, per stage (same body, only the face changes). Stages without
// art act reactions out with motion only. eat = [mouth open, chewing, swallowed and happy].
// Faces are drawn over level1–6.png by scripts/pet-faces.py (face only, same body).
export const petStateArt: Record<
  number,
  {
    sleep?: ImageSourcePropType;
    eat?: [ImageSourcePropType, ImageSourcePropType, ImageSourcePropType];
    mood?: Partial<Record<Emotion, ImageSourcePropType>>;
    /** Face-only crops of the mood faces, for the mood picker. */
    face: Record<Emotion, ImageSourcePropType>;
  }
> = {
  1: {
    sleep: require('@/assets/images/pet/level1/sleep.png'),
    eat: [require('@/assets/images/pet/level1/eat_open.png'), require('@/assets/images/pet/level1/eat_chew.png'), require('@/assets/images/pet/level1/eat_yum.png')],
    mood: {
      very_good: require('@/assets/images/pet/level1/very_good.png'),
      good: require('@/assets/images/pet/level1/good.png'),
      okay: require('@/assets/images/pet/level1/okay.png'),
      tired: require('@/assets/images/pet/level1/tired.png'),
      very_hard: require('@/assets/images/pet/level1/very_hard.png'),
      unsure: require('@/assets/images/pet/level1/unsure.png'),
      no_answer: require('@/assets/images/pet/level1/no_answer.png'),
    },
    face: {
      very_good: require('@/assets/images/pet/level1/face/very_good.png'),
      good: require('@/assets/images/pet/level1/face/good.png'),
      okay: require('@/assets/images/pet/level1/face/okay.png'),
      tired: require('@/assets/images/pet/level1/face/tired.png'),
      very_hard: require('@/assets/images/pet/level1/face/very_hard.png'),
      unsure: require('@/assets/images/pet/level1/face/unsure.png'),
      no_answer: require('@/assets/images/pet/level1/face/no_answer.png'),
    },
  },
  2: {
    sleep: require('@/assets/images/pet/level2/sleep.png'),
    eat: [require('@/assets/images/pet/level2/eat_open.png'), require('@/assets/images/pet/level2/eat_chew.png'), require('@/assets/images/pet/level2/eat_yum.png')],
    mood: {
      very_good: require('@/assets/images/pet/level2/very_good.png'),
      good: require('@/assets/images/pet/level2/good.png'),
      okay: require('@/assets/images/pet/level2/okay.png'),
      tired: require('@/assets/images/pet/level2/tired.png'),
      very_hard: require('@/assets/images/pet/level2/very_hard.png'),
      unsure: require('@/assets/images/pet/level2/unsure.png'),
      no_answer: require('@/assets/images/pet/level2/no_answer.png'),
    },
    face: {
      very_good: require('@/assets/images/pet/level2/face/very_good.png'),
      good: require('@/assets/images/pet/level2/face/good.png'),
      okay: require('@/assets/images/pet/level2/face/okay.png'),
      tired: require('@/assets/images/pet/level2/face/tired.png'),
      very_hard: require('@/assets/images/pet/level2/face/very_hard.png'),
      unsure: require('@/assets/images/pet/level2/face/unsure.png'),
      no_answer: require('@/assets/images/pet/level2/face/no_answer.png'),
    },
  },
  3: {
    sleep: require('@/assets/images/pet/level3/sleep.png'),
    eat: [require('@/assets/images/pet/level3/eat_open.png'), require('@/assets/images/pet/level3/eat_chew.png'), require('@/assets/images/pet/level3/eat_yum.png')],
    mood: {
      very_good: require('@/assets/images/pet/level3/very_good.png'),
      good: require('@/assets/images/pet/level3/good.png'),
      okay: require('@/assets/images/pet/level3/okay.png'),
      tired: require('@/assets/images/pet/level3/tired.png'),
      very_hard: require('@/assets/images/pet/level3/very_hard.png'),
      unsure: require('@/assets/images/pet/level3/unsure.png'),
      no_answer: require('@/assets/images/pet/level3/no_answer.png'),
    },
    face: {
      very_good: require('@/assets/images/pet/level3/face/very_good.png'),
      good: require('@/assets/images/pet/level3/face/good.png'),
      okay: require('@/assets/images/pet/level3/face/okay.png'),
      tired: require('@/assets/images/pet/level3/face/tired.png'),
      very_hard: require('@/assets/images/pet/level3/face/very_hard.png'),
      unsure: require('@/assets/images/pet/level3/face/unsure.png'),
      no_answer: require('@/assets/images/pet/level3/face/no_answer.png'),
    },
  },
  4: {
    sleep: require('@/assets/images/pet/level4/sleep.png'),
    eat: [require('@/assets/images/pet/level4/eat_open.png'), require('@/assets/images/pet/level4/eat_chew.png'), require('@/assets/images/pet/level4/eat_yum.png')],
    mood: {
      very_good: require('@/assets/images/pet/level4/very_good.png'),
      good: require('@/assets/images/pet/level4/good.png'),
      okay: require('@/assets/images/pet/level4/okay.png'),
      tired: require('@/assets/images/pet/level4/tired.png'),
      very_hard: require('@/assets/images/pet/level4/very_hard.png'),
      unsure: require('@/assets/images/pet/level4/unsure.png'),
      no_answer: require('@/assets/images/pet/level4/no_answer.png'),
    },
    face: {
      very_good: require('@/assets/images/pet/level4/face/very_good.png'),
      good: require('@/assets/images/pet/level4/face/good.png'),
      okay: require('@/assets/images/pet/level4/face/okay.png'),
      tired: require('@/assets/images/pet/level4/face/tired.png'),
      very_hard: require('@/assets/images/pet/level4/face/very_hard.png'),
      unsure: require('@/assets/images/pet/level4/face/unsure.png'),
      no_answer: require('@/assets/images/pet/level4/face/no_answer.png'),
    },
  },
  5: {
    sleep: require('@/assets/images/pet/level5/sleep.png'),
    eat: [require('@/assets/images/pet/level5/eat_open.png'), require('@/assets/images/pet/level5/eat_chew.png'), require('@/assets/images/pet/level5/eat_yum.png')],
    mood: {
      very_good: require('@/assets/images/pet/level5/very_good.png'),
      good: require('@/assets/images/pet/level5/good.png'),
      okay: require('@/assets/images/pet/level5/okay.png'),
      tired: require('@/assets/images/pet/level5/tired.png'),
      very_hard: require('@/assets/images/pet/level5/very_hard.png'),
      unsure: require('@/assets/images/pet/level5/unsure.png'),
      no_answer: require('@/assets/images/pet/level5/no_answer.png'),
    },
    face: {
      very_good: require('@/assets/images/pet/level5/face/very_good.png'),
      good: require('@/assets/images/pet/level5/face/good.png'),
      okay: require('@/assets/images/pet/level5/face/okay.png'),
      tired: require('@/assets/images/pet/level5/face/tired.png'),
      very_hard: require('@/assets/images/pet/level5/face/very_hard.png'),
      unsure: require('@/assets/images/pet/level5/face/unsure.png'),
      no_answer: require('@/assets/images/pet/level5/face/no_answer.png'),
    },
  },
  6: {
    sleep: require('@/assets/images/pet/level6/sleep.png'),
    eat: [require('@/assets/images/pet/level6/eat_open.png'), require('@/assets/images/pet/level6/eat_chew.png'), require('@/assets/images/pet/level6/eat_yum.png')],
    mood: {
      very_good: require('@/assets/images/pet/level6/very_good.png'),
      good: require('@/assets/images/pet/level6/good.png'),
      okay: require('@/assets/images/pet/level6/okay.png'),
      tired: require('@/assets/images/pet/level6/tired.png'),
      very_hard: require('@/assets/images/pet/level6/very_hard.png'),
      unsure: require('@/assets/images/pet/level6/unsure.png'),
      no_answer: require('@/assets/images/pet/level6/no_answer.png'),
    },
    face: {
      very_good: require('@/assets/images/pet/level6/face/very_good.png'),
      good: require('@/assets/images/pet/level6/face/good.png'),
      okay: require('@/assets/images/pet/level6/face/okay.png'),
      tired: require('@/assets/images/pet/level6/face/tired.png'),
      very_hard: require('@/assets/images/pet/level6/face/very_hard.png'),
      unsure: require('@/assets/images/pet/level6/face/unsure.png'),
      no_answer: require('@/assets/images/pet/level6/face/no_answer.png'),
    },
  },
};

// Mind record (재형 피드백): every feeling counts the same; none of these is better than another.
export const mindEmotions: { id: Emotion; label: string }[] = [
  { id: 'very_good', label: '매우 좋음' },
  { id: 'good', label: '좋음' },
  { id: 'okay', label: '보통' },
  { id: 'tired', label: '조금 지침' },
  { id: 'very_hard', label: '매우 힘듦' },
  { id: 'unsure', label: '잘 모르겠음' },
  { id: 'no_answer', label: '답하고 싶지 않음' },
];

export const mindSituations: { id: Situation; label: string }[] = [
  { id: 'meal', label: '식사' },
  { id: 'body', label: '몸·외모' },
  { id: 'school', label: '학교·친구' },
  { id: 'family', label: '가족' },
  { id: 'sleep_health', label: '수면·건강' },
  { id: 'unknown', label: '이유를 모르겠음' },
  { id: 'custom', label: '직접 입력' },
];

// Meal status per slot; skipping or finding it hard is recorded without judgement.
export const mealStatuses: { id: MealStatus; label: string }[] = [
  { id: 'ate', label: '먹었어' },
  { id: 'much', label: '많이 먹었어' },
  { id: 'little', label: '조금 먹었어' },
  { id: 'hard', label: '먹기 어려웠어' },
  { id: 'skipped', label: '건너뛰었어' },
  { id: 'no_answer', label: '답하고 싶지 않아' },
];

// Jelly cost to fill in a missed yesterday (must match backfill_yesterday in supabase/002_game_rpc.sql).
export const BACKFILL_COST = 20;
// Must match `cost` in open_gift_box (supabase/002_game_rpc.sql).
export const GIFT_BOX_COST = 30;

// The "감각의 숲" world, told on first launch. Nothing here judges how much or how well the user did.
export const prologuePages = [
  {
    title: '감각의 숲',
    line: '아주 먼 곳에 "감각의 숲"이 있어.\n사람들이 알아차린 맛과 색, 따뜻한 마음이\n그곳에 이슬처럼 맺혀.',
  },
  {
    title: '나는 푸디몬이야',
    line: '나는 그 숲에서 왔어.\n누군가 자기 하루를 다정하게 알아차려 줄 때,\n그 마음을 먹고 자라.',
  },
  {
    title: '잘하지 않아도 괜찮아',
    line: '많이 먹었는지, 적게 먹었는지는 중요하지 않아.\n느낀 걸 그대로 알려주기만 하면 돼.\n힘든 날엔 나도 옆에서 같이 쉴게.',
  },
  {
    title: '함께해 줄래?',
    line: '숲 밖은 처음이라 조금 떨려.\n오늘부터 나랑 같이 지내 줄래?',
  },
];

export const tutorialPages = [
  {
    icon: 'calendar',
    color: '#1B7F66',
    title: '우리의 100일',
    line: '오늘부터 100일 동안 함께할 거야.\n쉬어 가는 날이 있어도 괜찮아.\n100일이 지나면 같이 돌아보자.',
  },
  {
    icon: 'restaurant',
    color: '#FF9600',
    title: '식사 = 감각 나누기',
    line: '먹고 나서 "식사"를 눌러 줘.\n어떤 색이었는지, 어떤 식감이었는지\n작은 질문에 답하면 그 감각이 내 먹이가 돼.',
  },
  {
    icon: 'moon',
    color: '#8E7CF0',
    title: '수면 = 숲의 밤',
    line: '일어나면 "수면"에 몇 시간 잤는지 알려 줘.\n네가 푹 쉬면 숲에도 고요한 밤이 와.',
  },
  {
    icon: 'happy',
    color: '#FF6FA8',
    title: '감정 = 마음 날씨',
    line: '"감정"에서 오늘 마음 날씨를 골라 줘.\n흐린 날도 소중한 기록이야.\n어떤 날씨든 나는 곁에 있을게.',
  },
  {
    icon: 'water',
    color: '#1B7F66',
    title: '이슬방울과 퀘스트',
    line: '매일 작은 퀘스트를 하고 꾸준히 기록하면\n숲의 이슬방울이 맺혀.\n하루쯤 쉬어도 방패가 우리 기록을 지켜 줘.',
  },
  {
    icon: 'shirt',
    color: '#1CB0F6',
    title: '우리만의 방',
    line: '모은 이슬방울로 "꾸미기"에서\n옷과 소품을 골라 봐.\n자, 이제 숲 생활을 시작하자!',
  },
] as const;

export const costumesData: CostumeItem[] = [
  { id: 'crown', name: '왕관', price: 50 },
  { id: 'ribbon', name: '리본', price: 30 },
  { id: 'glasses', name: '선글라스', price: 40 },
  { id: 'flower', name: '꽃장식', price: 20 },
  { id: 'wizard', name: '마법사 모자', price: 60 },
  { id: 'bunny', name: '토끼 귀', price: 50 },
];

// FoodyMon wearing each costume, per stage (team art, 2026-10). Shown instead of the stage image
// while that costume is on.
export const costumeArt: Record<number, Record<string, ImageSourcePropType>> = {
  1: {
    crown: require('@/assets/images/costume/level1/crown.png'),
    ribbon: require('@/assets/images/costume/level1/ribbon.png'),
    glasses: require('@/assets/images/costume/level1/glasses.png'),
    flower: require('@/assets/images/costume/level1/flower.png'),
    wizard: require('@/assets/images/costume/level1/wizard.png'),
    bunny: require('@/assets/images/costume/level1/bunny.png'),
  },
  2: {
    crown: require('@/assets/images/costume/level2/crown.png'),
    ribbon: require('@/assets/images/costume/level2/ribbon.png'),
    glasses: require('@/assets/images/costume/level2/glasses.png'),
    flower: require('@/assets/images/costume/level2/flower.png'),
    wizard: require('@/assets/images/costume/level2/wizard.png'),
    bunny: require('@/assets/images/costume/level2/bunny.png'),
  },
  3: {
    crown: require('@/assets/images/costume/level3/crown.png'),
    ribbon: require('@/assets/images/costume/level3/ribbon.png'),
    glasses: require('@/assets/images/costume/level3/glasses.png'),
    flower: require('@/assets/images/costume/level3/flower.png'),
    wizard: require('@/assets/images/costume/level3/wizard.png'),
    bunny: require('@/assets/images/costume/level3/bunny.png'),
  },
  4: {
    crown: require('@/assets/images/costume/level4/crown.png'),
    ribbon: require('@/assets/images/costume/level4/ribbon.png'),
    glasses: require('@/assets/images/costume/level4/glasses.png'),
    flower: require('@/assets/images/costume/level4/flower.png'),
    wizard: require('@/assets/images/costume/level4/wizard.png'),
    bunny: require('@/assets/images/costume/level4/bunny.png'),
  },
  5: {
    crown: require('@/assets/images/costume/level5/crown.png'),
    ribbon: require('@/assets/images/costume/level5/ribbon.png'),
    glasses: require('@/assets/images/costume/level5/glasses.png'),
    flower: require('@/assets/images/costume/level5/flower.png'),
    wizard: require('@/assets/images/costume/level5/wizard.png'),
    bunny: require('@/assets/images/costume/level5/bunny.png'),
  },
  6: {
    crown: require('@/assets/images/costume/level6/crown.png'),
    ribbon: require('@/assets/images/costume/level6/ribbon.png'),
    glasses: require('@/assets/images/costume/level6/glasses.png'),
    flower: require('@/assets/images/costume/level6/flower.png'),
    wizard: require('@/assets/images/costume/level6/wizard.png'),
    bunny: require('@/assets/images/costume/level6/bunny.png'),
  },
};

/** The pet picture for a stage, wearing `costumeId` when there is art for it. */
export function petImage(level: number, costumeId: string | null) {
  const stage = levelsData.find((l) => l.level === level) ?? levelsData[2];
  return (costumeId && costumeArt[level]?.[costumeId]) || stage.image;
}

export const backgroundsData: BackgroundItem[] = [
  { id: 'carpet', name: '포근한 카펫', price: 30, type: 'carpet', image: require('@/assets/images/room/carpet.jpg') },
  { id: 'bookshelf', name: '미니 책장', price: 50, type: 'bookshelf', image: require('@/assets/images/room/bookshelf.jpg') },
  { id: 'plant', name: '미니 화분', price: 40, type: 'plant', image: require('@/assets/images/room/plant.jpg') },
  { id: 'plushie', name: '곰인형', price: 60, type: 'plushie', image: require('@/assets/images/room/plushie.jpg') },
];

export const quizzesData: QuizQuestion[] = [
  { type: 'text', q: '오늘 먹은 음식 중에서 가장 인상 깊었던 색깔은 무슨 색이었어?' },
  { type: 'words3', q: '방금 먹은 메뉴를 세 가지의 단어로 표현한다면 어떻게 될까? (띄어쓰기로 구분해줘!)' },
  { type: 'yesno', q: '음식을 먹으면서 천천히 씹고 맛을 음미하려고 노력했어?' },
  { type: 'yesno', q: '먹으면서 스마트폰이나 영상을 보지 않고 식사에만 집중해봤어?' },
  { type: 'text', q: '오늘 첫 입을 먹었을 때 어떤 기분이 들었어?' },
  { type: 'text', q: '이 음식을 먹으며 혹시 떠오른 행복한 추억이나 사람이 있어?' },
  { type: 'text', q: '음식에서 가장 바삭하거나 부드러웠던 식감은 뭐였어?' },
  { type: 'yesno', q: '배가 적당히 불렀을 때 수저를 내려놓을 수 있었어?' },
  { type: 'text', q: '나를 위해 차려진 이 음식에게 고마운 점 하나를 말해본다면?' },
];

export const dialoguesData = {
  bad: [
    '오늘은 나도 조금 지쳤어. 같이 쉬어 가자.',
    '천천히 해도 괜찮아. 나는 여기 있을게.',
    '흐린 날도 알려줘서 고마워.',
    '따뜻한 거 한 모금 어때? 같이 쉬자.',
  ],
  normal: [
    '오늘 하루는 어땠어?',
    '네가 웃으면 나도 배가 불러!',
    '가끔은 쉬어가는 것도 필요해.',
    '밥은 잘 챙겨 먹고 있는 거지?',
    '오늘 하루도 고생 많았어',
  ],
  good: [
    '마스터! 완전 최고야! 쌩쌩해!',
    '네 덕분에 나도 이렇게 건강해졌어!',
    '우리 이대로 계속 건강하게 지내자',
    '마스터의 좋은 기운이 뿜뿜 느껴져!',
  ],
  // Time of day (morning 5–11, afternoon 11–17, evening 17–22, night 22–5).
  morning: ['좋은 아침! 숲에 이슬이 반짝여.', '창밖 공기 한 번 마셔볼까?', '아침 햇살이 간지러워'],
  afternoon: ['오후의 숲은 나른하다~', '잠깐 기지개 켜고 가자!', '점심엔 어떤 색깔을 만났어?'],
  evening: ['노을이 숲을 물들이고 있어', '오늘 하루 수고했어.', '저녁 바람이 선선하다~'],
  night: ['별이 많이 떴어', '이제 슬슬 쉴 준비 해볼까?', '오늘도 곁에 있어줘서 고마워.'],
  // Gentle invitations for what isn't logged yet — never a reminder of what was missed.
  askSleep: ['어젯밤 잠은 어땠어? 들려줘!', '꿈속 숲 이야기 궁금해'],
  askMeal: ['오늘 숲에서 어떤 맛을 만났어?', '먹은 음식의 색깔을 알려줄래?'],
  askEmotion: ['지금 마음 날씨는 어때?', '마음 한 조각 나눠줄래?'],
  // When the user said they feel low: company, not cheering.
  lowMood: ['오늘은 그냥 같이 있자.', '마음이 무거운 날엔 나한테 기대도 돼.', '괜찮아지지 않아도 괜찮아.'],
  // {n} = streak days.
  streak: ['벌써 {n}일째 함께야!', '{n}일 동안 숲을 찾아와 줘서 고마워.'],
  // Right after a check-in.
  reaction: {
    sleep: ['잠 이야기 고마워! 이슬처럼 맑아졌어.', '푹 쉰 만큼 숲도 쉬었어'],
    meal: ['냠! 그 맛 나도 느껴졌어', '알아차려줘서 고마워. 배가 든든해!'],
    skip: ['그럴 때도 있지. 알려줘서 고마워.', '다음 끼니 때 또 만나자!'],
    emotion: ['마음 알려줘서 고마워', '어떤 마음이든 다 소중해.'],
  },
};
