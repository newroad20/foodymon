/** 마음 쉼터 (기능 C 한 줄 마음 날씨): one feeling in, one warm line back. Client-only, nothing saved. */
export const MIND_WEATHER: readonly { id: string; emoji: string; label: string; replies: readonly string[] }[] = [
  {
    id: 'lonely',
    emoji: '🥺',
    label: '외로워',
    replies: [
      '외로운 마음이 들었구나. 지금은 내가 옆에 꼭 붙어 있을게.',
      '혼자인 것 같은 순간이 있지. 너는 혼자가 아니야, 나 여기 있어.',
    ],
  },
  {
    id: 'tired',
    emoji: '😪',
    label: '피곤해',
    replies: [
      '많이 지쳤구나. 오늘 여기까지 온 것만으로도 충분해.',
      '피곤할 땐 숨 한 번 크게 쉬어 보자. 나도 같이 쉴게.',
    ],
  },
  {
    id: 'stuffy',
    emoji: '😮‍💨',
    label: '답답해',
    replies: [
      '마음이 꽉 막힌 느낌이구나. 그런 날도 있어, 이상한 거 아니야.',
      '답답한 마음, 나한테 잠깐 내려놓고 가도 돼.',
    ],
  },
  {
    id: 'anxious',
    emoji: '😟',
    label: '불안해',
    replies: [
      '불안한 마음이 찾아왔구나. 천천히, 지금 여기 나랑 같이 있자.',
      '걱정이 많아질 때도 있지. 네가 느끼는 건 다 괜찮은 마음이야.',
    ],
  },
  {
    id: 'upset',
    emoji: '😢',
    label: '속상해',
    replies: [
      '속상한 일이 있었구나. 말해 줘서 고마워, 내가 들어 줄게.',
      '속상한 마음 그대로 괜찮아. 오늘은 내가 네 편이야.',
    ],
  },
  {
    id: 'bored',
    emoji: '🥱',
    label: '심심해',
    replies: [
      '심심했구나! 나랑 잠깐 숲 이야기 나눌래?',
      '심심한 시간도 쉬어 가는 시간이야. 나도 옆에서 뒹굴뒹굴할게.',
    ],
  },
  {
    id: 'hungry',
    emoji: '🍙',
    label: '배가 고픈 것 같아',
    replies: [
      '몸이 보내는 신호를 알아챘구나. 그 신호, 소중하게 들어 줘도 괜찮아.',
      '배고픔도 몸이 하는 말이야. 네 몸이 뭘 원하는지 천천히 들어 보자.',
    ],
  },
  {
    id: 'unsure',
    emoji: '🌫️',
    label: '잘 모르겠어',
    replies: [
      '잘 모르겠는 마음도 괜찮아. 이름 없는 마음도 다 소중해.',
      '모르겠으면 모르는 대로 두자. 나는 그냥 여기 같이 있을게.',
    ],
  },
];

export function pickReply(id: string, rand: () => number = Math.random): string {
  const replies = MIND_WEATHER.find((m) => m.id === id)?.replies ?? MIND_WEATHER[MIND_WEATHER.length - 1].replies;
  return replies[Math.floor(rand() * replies.length)];
}
