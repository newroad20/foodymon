export interface CostumeItem {
  id: string;
  icon: string;
  name: string;
  price: number;
}

export interface BackgroundItem {
  id: string;
  icon: string;
  name: string;
  price: number;
  type: 'carpet' | 'bookshelf' | 'plant' | 'plushie';
  emoji: string;
}

export interface QuizQuestion {
  type: 'text' | 'words3' | 'yesno';
  q: string;
}

export interface LogItem {
  id: string;
  time: string;
  type: 'meal' | 'sleep' | 'emotion' | 'skip';
  content: string;
}

export interface LevelInfo {
  level: number;
  maxScore: number;
  name: string;
  image: any;
}

export interface UserState {
  masterName: string;
  onboarded: boolean;
  targetSleep: number;
  targetMeals: number;
  usualMealSize: number;

  streak: number;
  shields: number;
  currency: number; // 젤리 (Jelly)
  ownedCostumes: string[];
  ownedBackgrounds: string[];
  equippedCostume: string | null;
  equippedBackgrounds: string[];

  isFrozen: boolean;
  historyScores: number[];

  today: {
    sleepDiff: number | null;
    sleepHours: number | null;
    mealCount: number;
    badMealCount: number;
    emotion: number | null;
  };

  currentDailyScore: number;
  averageScore: number;
  level: number;
  logs: LogItem[];
  /** Local date (YYYY-MM-DD) of the day `today` belongs to. */
  lastActiveDate: string | null;
}
