import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserState, LogItem } from '@/types/foodymon';
import { BACKFILL_COST, GIFT_BOX_COST, costumesData, backgroundsData, dialoguesData, levelsData } from '@/constants/foodymonData';
import { closeDay, toDateKey, RolloverResult } from '@/lib/dayRollover';
import { calcDailyScore } from '@/lib/score';
import { pickDialogue } from '@/lib/dialogue';
import type { MealType } from '@/lib/mealType';
import { successFeel, tapFeel } from '@/lib/haptics';
import { formatLogTime } from '@/lib/serverState';
import * as gameApi from '@/lib/gameApi';

// How often to check whether the calendar day changed while the app stays open.
const DAY_CHECK_INTERVAL_MS = 60 * 1000;

// Local cache of the server state, per account, so the app opens instantly.
const storageKey = (userId: string) => `@foodymon_user_state_v2:${userId}`;

const defaultState: UserState = {
  masterName: '',
  onboarded: false,
  targetSleep: 7,
  targetMeals: 3,
  usualMealSize: 1.0,
  birthYear: null,

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
  lastActiveDate: null,
  backfill: null,
};

interface FoodyMonContextType {
  userId: string;
  state: UserState;
  /** True until the first load from the server finished (or failed). */
  loading: boolean;
  /** Last error talking to the server, if any. */
  syncError: string | null;
  retrySync: () => Promise<void>;
  currentDialogue: string;
  triggerPetInteraction: () => string;
  completeOnboarding: (
    name: string,
    birthYear: number,
    sleep: number,
    meals: number,
    mealSize: number
  ) => Promise<void>;
  /** photoUri: a picked/taken photo; photoFailed is true when the meal was saved without it. */
  logMeal: (
    size: number,
    answerText: string,
    mealType: MealType,
    photoUri?: string | null
  ) => Promise<{ photoFailed: boolean }>;
  skipMeal: (mealType: MealType) => Promise<void>;
  logSleep: (hours: number) => Promise<void>;
  logEmotion: (score: number) => Promise<void>;
  backfillYesterday: (day: {
    sleepHours: number | null;
    mealCount: number;
    emotion: number | null;
  }) => Promise<{ success: boolean; message: string }>;
  updateSettings: (values: {
    nickname: string;
    birthYear: number | null;
    targetSleep: number;
    targetMeals: number;
  }) => Promise<boolean>;
  buyItem: (type: 'costume' | 'background', id: string) => Promise<{ success: boolean; message: string }>;
  /** Opens a gift box (S44); on success returns the item that came out. */
  openGiftBox: () => Promise<
    { success: true; type: 'costume' | 'background'; id: string } | { success: false; message: string }
  >;
  /** Claims a completed daily quest; the server pays the jelly. */
  claimQuest: (questId: string) => Promise<boolean>;
  toggleCostume: (id: string) => void;
  toggleBackground: (id: string) => void;
  advanceToNextDay: () => { rewardedJelly: number; shieldUsed: boolean; shieldEarned: boolean };
  /** Result of the most recent automatic day change, until dismissed. */
  pendingRollover: RolloverResult | null;
  dismissRollover: () => void;
}

const FoodyMonContext = createContext<FoodyMonContextType | undefined>(undefined);

const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e);

export function FoodyMonProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, setState] = useState<UserState>(defaultState);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [currentDialogue, setCurrentDialogue] = useState<string>('오늘 하루도 건강하게 지내자!');
  const [pendingRollover, setPendingRollover] = useState<RolloverResult | null>(null);
  // Latest state for async actions and AppState/interval callbacks, which would otherwise see a stale closure.
  const stateRef = useRef<UserState>(defaultState);
  const syncingRef = useRef<Promise<void> | null>(null);

  const applyState = useCallback(
    (next: UserState) => {
      stateRef.current = next;
      setState(next);
      AsyncStorage.setItem(storageKey(userId), JSON.stringify(next)).catch((e) =>
        console.error('Failed to cache foodymon state:', e)
      );
    },
    [userId]
  );

  const withScore = (next: UserState): UserState => {
    const { score, level } = calcDailyScore(next, levelsData);
    return { ...next, currentDailyScore: score, level };
  };

  /** Reloads everything from the server; the server also closes out ended days. */
  const syncFromServer = useCallback((): Promise<void> => {
    if (syncingRef.current) return syncingRef.current;
    const run = (async () => {
      try {
        const { state: next, rollover } = await gameApi.fetchGameState(
          userId,
          toDateKey(new Date()),
          levelsData
        );
        applyState(next);
        setSyncError(null);
        if (rollover) setPendingRollover(rollover);
      } catch (e) {
        console.error('Failed to sync foodymon state:', e);
        setSyncError(errorMessage(e));
      } finally {
        syncingRef.current = null;
      }
    })();
    syncingRef.current = run;
    return run;
  }, [userId, applyState]);

  /** Makes sure check-ins go to today, not to a day that already ended. */
  const ensureCurrentDay = useCallback(async () => {
    const current = stateRef.current;
    if (current.onboarded && current.lastActiveDate !== toDateKey(new Date())) {
      await syncFromServer();
    }
  }, [syncFromServer]);

  // Show the cached state right away, then load from the server.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(storageKey(userId));
        if (cached && !cancelled && !syncingRef.current) {
          const parsed: UserState = { ...defaultState, ...JSON.parse(cached) };
          stateRef.current = parsed;
          setState(parsed);
        }
      } catch (e) {
        console.error('Failed to load cached foodymon state:', e);
      }
      await syncFromServer();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, syncFromServer]);

  // Re-check when the app returns to the foreground and periodically (e.g. past midnight).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') ensureCurrentDay();
    });
    const interval = setInterval(ensureCurrentDay, DAY_CHECK_INTERVAL_MS);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [ensureCurrentDay]);

  const triggerPetInteraction = () => {
    tapFeel();
    const pool = ['앗, 간지러워!', '에헤헤 🎵', '마스터 손길 최고야 🥰', '기분 좋아!', '오늘도 힘낼게! ✨'];
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const msg = state.masterName ? `${state.masterName} 마스터, ${chosen}` : chosen;
    setCurrentDialogue(msg);
    return msg;
  };

  // FoodyMon speaks from today's check-ins, the time of day and the streak; a fresh line every 15s.
  useEffect(() => {
    if (loading) return;
    const speak = () => {
      const s = stateRef.current;
      const line = pickDialogue(s, dialoguesData, new Date().getHours());
      const prefix = s.masterName && Math.random() > 0.5 ? `${s.masterName} 마스터, ` : '';
      setCurrentDialogue(prefix + line);
    };
    speak();
    const interval = setInterval(speak, 15000);
    return () => clearInterval(interval);
  }, [loading]);

  const newLog = (log: Pick<LogItem, 'type' | 'content' | 'photoPath'>): LogItem => ({
    id: String(Date.now()),
    time: formatLogTime(new Date()),
    ...log,
  });

  /** Applies a check-in locally right away, then saves it to the server. */
  const recordCheckin = async (
    update: (s: UserState) => UserState['today'],
    log: Pick<LogItem, 'type' | 'content' | 'photoPath'>
  ) => {
    await ensureCurrentDay();
    const current = stateRef.current;
    const next = withScore({
      ...current,
      today: update(current),
      logs: [newLog(log), ...current.logs],
    });
    applyState(next);
    successFeel();
    const reactions = dialoguesData.reaction[log.type];
    setCurrentDialogue(reactions[Math.floor(Math.random() * reactions.length)]);
    try {
      await gameApi.saveCheckin(userId, next, log);
      setSyncError(null);
    } catch (e) {
      console.error('Failed to save check-in:', e);
      setSyncError(errorMessage(e));
    }
  };

  const completeOnboarding = async (
    name: string,
    birthYear: number,
    sleep: number,
    meals: number,
    mealSize: number
  ) => {
    const firstLog = { type: 'emotion' as const, content: `${name} 마스터와 푸디몬이 첫 만남을 가졌어요! 🎉` };
    applyState(
      withScore({
        ...stateRef.current,
        masterName: name,
        birthYear,
        targetSleep: sleep,
        targetMeals: meals,
        usualMealSize: mealSize,
        onboarded: true,
        lastActiveDate: toDateKey(new Date()),
        logs: [newLog(firstLog)],
      })
    );
    try {
      await gameApi.saveOnboarding(userId, {
        birthYear,
        nickname: name,
        targetSleep: sleep,
        targetMeals: meals,
        usualMealSize: mealSize,
      });
      await gameApi.addHistoryLog(userId, toDateKey(new Date()), firstLog);
    } catch (e) {
      console.error('Failed to save onboarding:', e);
      setSyncError(errorMessage(e));
    }
    // Starts the day on the server (sets the first check-in date).
    await syncFromServer();
  };

  const logMeal = async (
    size: number,
    answerText: string,
    mealType: MealType,
    photoUri?: string | null
  ) => {
    const isBad = size <= 0.33 || size >= 2.0;
    const sizeDesc = size === 1.0 ? '정량' : `${Math.round(size * 100)}%`;
    // A failed photo upload must not lose the meal itself.
    let photoPath: string | null = null;
    let photoFailed = false;
    if (photoUri) {
      try {
        photoPath = await gameApi.uploadMealPhoto(userId, photoUri);
      } catch (e) {
        console.error('Failed to upload meal photo:', e);
        photoFailed = true;
      }
    }
    await recordCheckin(
      (s) => ({
        ...s.today,
        mealCount: s.today.mealCount + 1,
        badMealCount: isBad ? s.today.badMealCount + 1 : s.today.badMealCount,
      }),
      { type: 'meal', content: `${mealType} 기록 (${sizeDesc}): "${answerText}"`, photoPath }
    );
    return { photoFailed };
  };

  const skipMeal = (mealType: MealType) =>
    recordCheckin((s) => ({ ...s.today, badMealCount: s.today.badMealCount + 1 }), {
      type: 'skip',
      content: `${mealType}은 건너뛰었어`,
    });

  const logSleep = (hours: number) => {
    const diff = Math.abs(stateRef.current.targetSleep - hours);
    return recordCheckin((s) => ({ ...s.today, sleepHours: hours, sleepDiff: diff }), {
      type: 'sleep',
      content: `수면 ${hours}시간 기록 (목표 대비 ${diff === 0 ? '완벽 일치' : `${diff}시간 차이`})`,
    });
  };

  const logEmotion = (score: number) => {
    let feel = '보통';
    if (score >= 80) feel = '좋음/매우 좋음 😊';
    else if (score <= 40) feel = '나쁨/매우 나쁨 🥺';
    return recordCheckin((s) => ({ ...s.today, emotion: score }), {
      type: 'emotion',
      content: `오늘의 기분 체크: ${feel}`,
    });
  };

  /** Fills in yesterday for jelly; the server restores the streak and any shield used (S25). */
  const backfillYesterday = async (day: { sleepHours: number | null; mealCount: number; emotion: number | null }) => {
    const current = stateRef.current;
    if (!current.backfill) return { success: false, message: '복구할 기록이 없어요.' };

    const sleepDiff = day.sleepHours === null ? null : Math.abs(current.targetSleep - day.sleepHours);
    const yesterday = {
      sleepDiff,
      sleepHours: day.sleepHours,
      mealCount: day.mealCount,
      badMealCount: 0,
      emotion: day.emotion,
    };
    // Score yesterday with the streak it had before it was closed.
    const { score } = calcDailyScore(
      { today: yesterday, targetMeals: current.targetMeals, streak: current.backfill.prevStreak },
      levelsData
    );

    const res = await gameApi.backfillYesterday(toDateKey(new Date()), { ...yesterday, score });
    if (!res.ok) {
      const messages: Record<gameApi.BackfillError, string> = {
        insufficient_jelly: `젤리가 부족해요! 복구에는 젤리 ${BACKFILL_COST}개가 필요해요.`,
        nothing_to_backfill: '복구할 수 있는 기간이 지났어요. 오늘 기록부터 다시 시작해요!',
        network: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
      };
      if (res.error === 'nothing_to_backfill') await syncFromServer();
      return { success: false, message: messages[res.error] };
    }

    await syncFromServer();
    return { success: true, message: `어제 기록을 복구했어요! 연속 기록이 이어졌어요 🔥 (건강 지수 ${score}점)` };
  };

  /** Updates name and lifestyle goals; today's score is recalculated against the new goals. */
  const updateSettings = async (values: {
    nickname: string;
    birthYear: number | null;
    targetSleep: number;
    targetMeals: number;
  }) => {
    const current = stateRef.current;
    const sleepHours = current.today.sleepHours;
    const next = withScore({
      ...current,
      masterName: values.nickname,
      birthYear: values.birthYear,
      targetSleep: values.targetSleep,
      targetMeals: values.targetMeals,
      today: {
        ...current.today,
        sleepDiff: sleepHours === null ? null : Math.abs(values.targetSleep - sleepHours),
      },
    });
    applyState(next);
    try {
      await gameApi.saveSettings(userId, values);
      if (next.lastActiveDate) await gameApi.saveDailyLog(userId, next);
      setSyncError(null);
      return true;
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSyncError(errorMessage(e));
      return false;
    }
  };

  const buyItem = async (type: 'costume' | 'background', id: string) => {
    const item =
      type === 'costume'
        ? costumesData.find((c) => c.id === id)
        : backgroundsData.find((b) => b.id === id);

    if (!item) return { success: false, message: '아이템을 찾을 수 없습니다.' };
    if (stateRef.current.currency < item.price) {
      return { success: false, message: '젤리가 부족해요! 체크인으로 젤리를 모아보세요 ✨' };
    }

    const res = await gameApi.buyItem(type, id);
    if (!res.ok) {
      const messages: Record<gameApi.BuyError, string> = {
        already_owned: '이미 가지고 있는 아이템이에요.',
        insufficient_jelly: '젤리가 부족해요! 체크인으로 젤리를 모아보세요 ✨',
        not_found: '아이템을 찾을 수 없습니다.',
        network: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
      };
      return { success: false, message: messages[res.error] };
    }

    const current = stateRef.current;
    applyState({
      ...current,
      currency: res.jellyBalance,
      ownedCostumes: type === 'costume' ? [...current.ownedCostumes, id] : current.ownedCostumes,
      ownedBackgrounds:
        type === 'background' ? [...current.ownedBackgrounds, id] : current.ownedBackgrounds,
    });
    return { success: true, message: `${item.name}을(를) 구매했습니다! 🎒` };
  };

  const openGiftBox = async () => {
    if (stateRef.current.currency < GIFT_BOX_COST) {
      return { success: false as const, message: `선물 상자에는 젤리 ${GIFT_BOX_COST}개가 필요해요 ✨` };
    }
    const res = await gameApi.openGiftBox();
    if (!res.ok) {
      const messages: Record<gameApi.GiftBoxError, string> = {
        all_owned: '숲의 선물을 모두 모았어요! 새 선물이 곧 찾아올 거예요.',
        insufficient_jelly: `선물 상자에는 젤리 ${GIFT_BOX_COST}개가 필요해요 ✨`,
        network: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
      };
      return { success: false as const, message: messages[res.error] };
    }
    const current = stateRef.current;
    applyState({
      ...current,
      currency: res.jellyBalance,
      ownedCostumes: res.type === 'costume' ? [...current.ownedCostumes, res.id] : current.ownedCostumes,
      ownedBackgrounds:
        res.type === 'background' ? [...current.ownedBackgrounds, res.id] : current.ownedBackgrounds,
    });
    successFeel();
    return { success: true as const, type: res.type, id: res.id };
  };

  const claimQuest = async (questId: string) => {
    try {
      const { jellyBalance } = await gameApi.claimQuest(toDateKey(new Date()), questId);
      applyState({ ...stateRef.current, currency: jellyBalance });
      successFeel();
      return true;
    } catch (e) {
      console.error('Failed to claim quest:', e);
      return false;
    }
  };

  const saveEquipped = (next: UserState) => {
    applyState(next);
    gameApi
      .saveEquipped(userId, { costume: next.equippedCostume, backgrounds: next.equippedBackgrounds })
      .catch((e) => {
        console.error('Failed to save equipped items:', e);
        setSyncError(errorMessage(e));
      });
  };

  const toggleCostume = (id: string) => {
    const current = stateRef.current;
    saveEquipped({ ...current, equippedCostume: current.equippedCostume === id ? null : id });
  };

  const toggleBackground = (id: string) => {
    const current = stateRef.current;
    const isEquipped = current.equippedBackgrounds.includes(id);
    const nextBgs = isEquipped
      ? current.equippedBackgrounds.filter((b) => b !== id)
      : [...current.equippedBackgrounds, id];
    saveEquipped({ ...current, equippedBackgrounds: nextBgs });
  };

  // Dev-only: close the current day on this device without waiting for midnight.
  // Not sent to the server; the next sync restores the server state.
  const advanceToNextDay = () => {
    const { state: next, ...result } = closeDay(stateRef.current);
    applyState(next);
    return result;
  };

  const dismissRollover = useCallback(() => setPendingRollover(null), []);

  return (
    <FoodyMonContext.Provider
      value={{
        userId,
        state,
        loading,
        syncError,
        retrySync: syncFromServer,
        currentDialogue,
        triggerPetInteraction,
        completeOnboarding,
        logMeal,
        skipMeal,
        logSleep,
        logEmotion,
        backfillYesterday,
        updateSettings,
        buyItem,
        openGiftBox,
        claimQuest,
        toggleCostume,
        toggleBackground,
        advanceToNextDay,
        pendingRollover,
        dismissRollover,
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
