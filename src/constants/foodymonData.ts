import { CostumeItem, BackgroundItem, QuizQuestion, LevelInfo } from '@/types/foodymon';

export const levelsData: LevelInfo[] = [
  { level: 1, maxScore: 19, name: '겁나 아픈 푸디몬', image: require('@/assets/images/level1.png') },
  { level: 2, maxScore: 39, name: '아픈 푸디몬', image: require('@/assets/images/level2.png') },
  { level: 3, maxScore: 59, name: '기본 푸디몬', image: require('@/assets/images/level3.png') },
  { level: 4, maxScore: 79, name: '건강한 푸디몬', image: require('@/assets/images/level4.png') },
  { level: 5, maxScore: 94, name: '생기발랄 푸디몬', image: require('@/assets/images/level5.png') },
  { level: 6, maxScore: 100, name: '천상계 푸디몬', image: require('@/assets/images/level6.png') },
];

export const costumesData: CostumeItem[] = [
  { id: 'crown', icon: '👑', name: '왕관', price: 50 },
  { id: 'ribbon', icon: '🎀', name: '리본', price: 30 },
  { id: 'glasses', icon: '🕶️', name: '선글라스', price: 40 },
  { id: 'flower', icon: '🌸', name: '꽃장식', price: 20 },
  { id: 'wizard', icon: '🧙‍♂️', name: '마법사 모자', price: 60 },
  { id: 'bunny', icon: '🐰', name: '토끼 귀', price: 50 },
];

export const backgroundsData: BackgroundItem[] = [
  { id: 'carpet', icon: '🧶', name: '포근한 카펫', price: 30, type: 'carpet', emoji: '🧶' },
  { id: 'bookshelf', icon: '📚', name: '미니 책장', price: 50, type: 'bookshelf', emoji: '📚' },
  { id: 'plant', icon: '🪴', name: '미니 화분', price: 40, type: 'plant', emoji: '🪴' },
  { id: 'plushie', icon: '🧸', name: '곰인형', price: 60, type: 'plushie', emoji: '🧸' },
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
    '마스터... 기운이 하나도 없어...',
    '나도 아프고 너도 아프면 어떡해 😢',
    '조금만 푹 쉬고 맛있는 거 먹자...',
    '마스터의 몸이 보내는 신호를 들어줘.',
  ],
  normal: [
    '오늘 하루는 어땠어?',
    '네가 웃으면 나도 배가 불러!',
    '가끔은 쉬어가는 것도 필요해.',
    '밥은 잘 챙겨 먹고 있는 거지?',
    '오늘 하루도 고생 많았어 💖',
  ],
  good: [
    '마스터! 완전 최고야! 쌩쌩해!',
    '네 덕분에 나도 이렇게 건강해졌어!',
    '우리 이대로 계속 건강하게 지내자 ✨',
    '마스터의 좋은 기운이 뿜뿜 느껴져!',
  ],
};

export const interactionEmojis = ['💖', '✨', '🎵', '⭐', '🎈', '🥰'];
