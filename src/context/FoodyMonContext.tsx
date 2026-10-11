import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserState, LogItem, QuizQuestion } from '@/types/foodymon';
import { costumesData, backgroundsData, dialoguesData, levelsData } from '@/constants/foodymonData';

const STORAGE_KEY = '@foodymon_user_state_v1';

const defaultState: UserState = {
  masterName: '',
  onboarded: false,
  targetSleep: 7,
  targetMeals: 3,
  usualMealSize: 1.0,

  streak: 0,
  shields: 1,
  currency: 50, // 웰컴 젤리 50개 지급
  ownedCostumes: [],
  ownedBackgrounds: [],
  equippedCostume: null,
  equippedBackgrounds: [],

  isFrozen: false,
  historyScores: [50, 50, 50],

  today: {
    sleepDiff: null,
    sleepHours: null,
    mealCount: 0,
    badMealCount: 0,
    emotion: null,
  },

  currentDailyScore: 50,
  averageScore: 50,
  level: 3,
  logs: [],
};

interface FoodyMonContextType {
  state: UserState;
  currentDialogue: string;
  triggerPetInteraction: () => string;
  completeOnboarding: (name: string, sleep: number, meals: number, mealSize: number) => Promise<void>;
  logMeal: (size: number, answerText: string) => Promise<void>;
  skipMeal: () => Promise<void>;
  logSleep: (hours: number) => Promise<void>;
  logEmotion: (score: number) => Promise<void>;
  buyItem: (type: 'costume' | 'background', id: string) => { success: boolean; message: string };
  toggleCostume: (id: string) => void;
  toggleBackground: (id: string) => void;
  advanceToNextDay: () => { rewardedJelly: number; shieldUsed: boolean; shieldEarned: boolean };
  resetAllData: () => Promise<void>;
}

const FoodyMonContext = createContext<FoodyMonContextType | undefined>(undefined);

export function FoodyMonProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserState>(defaultState);
  const [currentDialogue, setCurrentDialogue] = useState<string>('오늘 하루도 건강하게 지내자!');

  // Load from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setState(parsed);
        }
      } catch (e) {
        console.error('Failed to load foodymon state:', e);
      }
    })();
  }, []);

  // Save to AsyncStorage
  const saveState = async (newState: UserState) => {
    setState(newState);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.error('Failed to save foodymon state:', e);
    }
  };

  const getFormattedTime = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    let hh = d.getHours();
    const min = String(d.getMinutes()).padStart(2, '0');
    const ampm = hh >= 12 ? '오후' : '오전';
    hh = hh % 12 || 12;
    return `${mm}월 ${dd}일 ${ampm} ${hh}:${min}`;
  };

  const calcScore = (curState: UserState): { score: number; level: number } => {
    let sleepScore = 0;
    if (curState.today.sleepDiff !== null) {
      if (curState.today.sleepDiff <= 1) sleepScore = 100;
      else if (curState.today.sleepDiff < 3) sleepScore = 50;
      else sleepScore = 0;
    }

    let mealScore = 0;
    if (curState.today.mealCount > 0) {
      let base = (curState.today.mealCount / curState.targetMeals) * 100;
      if (base > 100) base = 100;
      base -= curState.today.badMealCount * 20;
      mealScore = Math.max(0, base);
    }

    let emotionScore = curState.today.emotion !== null ? curState.today.emotion : 50;

    let baseScore = sleepScore * 0.35 + mealScore * 0.35 + emotionScore * 0.3;

    let multiplier = 1.0;
    if (curState.streak >= 14) multiplier = 1.15;
    else if (curState.streak >= 7) multiplier = 1.1;
    else if (curState.streak >= 3) multiplier = 1.05;

    const finalScore = Math.min(100, Math.round(baseScore * multiplier));

    let lvl = 3;
    for (const l of levelsData) {
      if (finalScore <= l.maxScore) {
        lvl = l.level;
        break;
      }
    }

    return { score: finalScore, level: lvl };
  };

  const triggerPetInteraction = () => {
    const pool = ['앗, 간지러워!', '에헤헤 🎵', '마스터 손길 최고야 🥰', '기분 좋아!', '오늘도 힘낼게! ✨'];
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const msg = state.masterName ? `${state.masterName} 마스터, ${chosen}` : chosen;
    setCurrentDialogue(msg);
    return msg;
  };

  // Periodic dialogue update
  useEffect(() => {
    const interval = setInterval(() => {
      let pool = dialoguesData.normal;
      if (state.currentDailyScore >= 80) pool = dialoguesData.good;
      else if (state.currentDailyScore < 40) pool = dialoguesData.bad;

      const randomText = pool[Math.floor(Math.random() * pool.length)];
      const prefix = state.masterName && Math.random() > 0.5 ? `${state.masterName} 마스터, ` : '';
      setCurrentDialogue(prefix + randomText);
    }, 15000);
    return () => clearInterval(interval);
  }, [state.currentDailyScore, state.masterName]);

  const completeOnboarding = async (
    name: string,
    sleep: number,
    meals: number,
    mealSize: number
  ) => {
    const next: UserState = {
      ...state,
      masterName: name,
      targetSleep: sleep,
      targetMeals: meals,
      usualMealSize: mealSize,
      onboarded: true,
      logs: [
        {
          id: String(Date.now()),
          time: getFormattedTime(),
          type: 'emotion',
          content: `${name} 마스터와 푸디몬이 첫 만남을 가졌어요! 🎉`,
        },
      ],
    };
    const { score, level } = calcScore(next);
    next.currentDailyScore = score;
    next.level = level;
    await saveState(next);
  };

  const logMeal = async (size: number, answerText: string) => {
    const isBad = size <= 0.33 || size >= 2.0;
    const newBadCount = isBad ? state.today.badMealCount + 1 : state.today.badMealCount;
    const newMealCount = state.today.mealCount + 1;
    const sizeDesc = size === 1.0 ? '정량' : `${Math.round(size * 100)}%`;

    const newLogs: LogItem[] = [
      {
        id: String(Date.now()),
        time: getFormattedTime(),
        type: 'meal',
        content: `식사 기록 (${sizeDesc}): "${answerText}"`,
      },
      ...state.logs,
    ];

    const next: UserState = {
      ...state,
      today: {
        ...state.today,
        mealCount: newMealCount,
        badMealCount: newBadCount,
      },
      logs: newLogs,
    };
    const { score, level } = calcScore(next);
    next.currentDailyScore = score;
    next.level = level;
    await saveState(next);
  };

  const skipMeal = async () => {
    const next: UserState = {
      ...state,
      today: {
        ...state.today,
        badMealCount: state.today.badMealCount + 1,
      },
      logs: [
        {
          id: String(Date.now()),
          time: getFormattedTime(),
          type: 'skip',
          content: '식사를 건너뛰었어요 😢',
        },
        ...state.logs,
      ],
    };
    const { score, level } = calcScore(next);
    next.currentDailyScore = score;
    next.level = level;
    await saveState(next);
  };

  const logSleep = async (hours: number) => {
    const diff = Math.abs(state.targetSleep - hours);
    const next: UserState = {
      ...state,
      today: {
        ...state.today,
        sleepHours: hours,
        sleepDiff: diff,
      },
      logs: [
        {
          id: String(Date.now()),
          time: getFormattedTime(),
          type: 'sleep',
          content: `수면 ${hours}시간 기록 (목표 대비 ${diff === 0 ? '완벽 일치' : `${diff}시간 차이`})`,
        },
        ...state.logs,
      ],
    };
    const { score, level } = calcScore(next);
    next.currentDailyScore = score;
    next.level = level;
    await saveState(next);
  };

  const logEmotion = async (score: number) => {
    let feel = '보통';
    if (score >= 80) feel = '좋음/매우 좋음 😊';
    else if (score <= 40) feel = '나쁨/매우 나쁨 🥺';

    const next: UserState = {
      ...state,
      today: {
        ...state.today,
        emotion: score,
      },
      logs: [
        {
          id: String(Date.now()),
          time: getFormattedTime(),
          type: 'emotion',
          content: `오늘의 기분 체크: ${feel}`,
        },
        ...state.logs,
      ],
    };
    const { score: newScore, level } = calcScore(next);
    next.currentDailyScore = newScore;
    next.level = level;
    await saveState(next);
  };

  const buyItem = (type: 'costume' | 'background', id: string) => {
    const item =
      type === 'costume'
        ? costumesData.find((c) => c.id === id)
        : backgroundsData.find((b) => b.id === id);

    if (!item) return { success: false, message: '아이템을 찾을 수 없습니다.' };
    if (state.currency < item.price) {
      return { success: false, message: '젤리가 부족해요! 체크인으로 젤리를 모아보세요 ✨' };
    }

    const next: UserState = {
      ...state,
      currency: state.currency - item.price,
      ownedCostumes:
        type === 'costume' ? [...state.ownedCostumes, id] : state.ownedCostumes,
      ownedBackgrounds:
        type === 'background' ? [...state.ownedBackgrounds, id] : state.ownedBackgrounds,
    };
    saveState(next);
    return { success: true, message: `${item.name}을(를) 구매했습니다! 🎒` };
  };

  const toggleCostume = (id: string) => {
    const nextCostume = state.equippedCostume === id ? null : id;
    saveState({ ...state, equippedCostume: nextCostume });
  };

  const toggleBackground = (id: string) => {
    const isEquipped = state.equippedBackgrounds.includes(id);
    const nextBgs = isEquipped
      ? state.equippedBackgrounds.filter((b) => b !== id)
      : [...state.equippedBackgrounds, id];
    saveState({ ...state, equippedBackgrounds: nextBgs });
  };

  const advanceToNextDay = () => {
    const hasLogged =
      state.today.sleepDiff !== null ||
      state.today.mealCount > 0 ||
      state.today.emotion !== null;

    let nextStreak = state.streak;
    let nextShields = state.shields;
    let rewardJelly = 0;
    let shieldUsed = false;
    let shieldEarned = false;

    if (!hasLogged) {
      if (nextShields > 0) {
        nextShields -= 1;
        shieldUsed = true;
      } else {
        nextStreak = 0;
      }
    } else {
      nextStreak += 1;
      rewardJelly = 10 + Math.floor(nextStreak / 3) * 5;
      if (nextStreak % 7 === 0) {
        nextShields += 1;
        shieldEarned = true;
      }
    }

    const nextScores = [...state.historyScores, state.currentDailyScore];
    if (nextScores.length > 7) nextScores.shift();

    const next: UserState = {
      ...state,
      streak: nextStreak,
      shields: nextShields,
      currency: state.currency + rewardJelly,
      historyScores: nextScores,
      today: {
        sleepDiff: null,
        sleepHours: null,
        mealCount: 0,
        badMealCount: 0,
        emotion: null,
      },
      currentDailyScore: 40,
      level: 3,
    };
    saveState(next);
    return { rewardedJelly: rewardJelly, shieldUsed, shieldEarned };
  };

  const resetAllData = async () => {
    await saveState(defaultState);
  };

  return (
    <FoodyMonContext.Provider
      value={{
        state,
        currentDialogue,
        triggerPetInteraction,
        completeOnboarding,
        logMeal,
        skipMeal,
        logSleep,
        logEmotion,
        buyItem,
        toggleCostume,
        toggleBackground,
        advanceToNextDay,
        resetAllData,
      }}>
      {children}
    </FoodyMonContext.Provider>
  );
}

export function useFoodyMon() {
  const context = useContext(FoodyMonContext);
  if (!context) throw new Error('useFoodyMon must be used within FoodyMonProvider');
  return context;
}
