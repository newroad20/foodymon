import { supabase } from '@/lib/supabase';
import { LogItem, UserState } from '@/types/foodymon';
import { RolloverResult } from '@/lib/dayRollover';
import { DailyRecordRow } from '@/lib/collection';
import type { DayPoints, DayRecords, MealRecord, MindRecord, SleepRecord } from '@/lib/growth';
import {
  buildUserState,
  CheckinLogRow,
  CloseDaysResponse,
  DailyLogRow,
  MealRecordRow,
  MindRecordRow,
  ProfileRow,
  SleepRecordRow,
  toDayRecords,
  toDailyLogRow,
  toRolloverResult,
  UserItemRow,
} from '@/lib/serverState';

const RECENT_LOG_LIMIT = 50;
const PET_CHAT_LIMIT = 100;

/**
 * Loads the user's game state from Supabase. When the user is onboarded, first
 * asks the server to close out any days that ended (streak/jelly/shields).
 */
export async function fetchGameState(
  userId: string,
  todayKey: string
): Promise<{ state: UserState; rollover: RolloverResult | null }> {
  const ensured = await supabase.rpc('ensure_profile');
  if (ensured.error) throw ensured.error;

  const first = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', userId)
    .single();
  if (first.error) throw first.error;

  let rollover: RolloverResult | null = null;
  if (first.data.onboarded) {
    const closed = await supabase.rpc('close_days', { p_today: todayKey });
    if (closed.error) throw closed.error;
    rollover = toRolloverResult(closed.data as CloseDaysResponse);
  }
  const growth = first.data.onboarded ? await syncGrowth(todayKey) : null;

  const profileRes = await supabase
    .from('profiles')
    .select(
      'nickname, onboarded, birth_year, journey_start, target_sleep, target_meals, usual_meal_size, jelly_balance, streak, shields, equipped_costume, equipped_backgrounds, history_scores, last_checkin_date, missed_date, missed_prev_streak, evolution_stage'
    )
    .eq('id', userId)
    .single();
  if (profileRes.error) throw profileRes.error;
  const profile = profileRes.data as ProfileRow;

  const [todayRes, logsRes, itemsRes, sleepRes, mealRes, mindRes] = await Promise.all([
    profile.last_checkin_date
      ? supabase
          .from('daily_logs')
          .select('sleep_hours, sleep_diff, meal_count, bad_meal_count, emotion')
          .eq('user_id', userId)
          .eq('log_date', profile.last_checkin_date)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('checkin_logs')
      .select('id, type, content, created_at, photo_path')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(RECENT_LOG_LIMIT),
    supabase.from('user_items').select('item_type, item_id').eq('user_id', userId),
    supabase
      .from('sleep_records')
      .select('bed_time, wake_time')
      .eq('user_id', userId)
      .eq('log_date', todayKey)
      .maybeSingle(),
    supabase
      .from('meal_records')
      .select('slot, status, menu, feeling, memo, photo_path')
      .eq('user_id', userId)
      .eq('log_date', todayKey)
      .order('slot'),
    supabase
      .from('mind_records')
      .select('emotion, situation, note')
      .eq('user_id', userId)
      .eq('log_date', todayKey)
      .order('created_at'),
  ]);
  if (todayRes.error) throw todayRes.error;
  if (logsRes.error) throw logsRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (sleepRes.error) throw sleepRes.error;
  if (mealRes.error) throw mealRes.error;
  if (mindRes.error) throw mindRes.error;

  const state = buildUserState({
    profile: growth ? { ...profile, evolution_stage: growth.level } : profile,
    today: todayRes.data as DailyLogRow | null,
    logs: (logsRes.data ?? []) as CheckinLogRow[],
    items: (itemsRes.data ?? []) as UserItemRow[],
    records: toDayRecords({
      sleep: sleepRes.data as SleepRecordRow | null,
      meals: (mealRes.data ?? []) as MealRecordRow[],
      minds: (mindRes.data ?? []) as MindRecordRow[],
    }),
    growthTotal: growth?.total ?? 0,
  });

  // The server also judges today's small goal; prefer its points over the local estimate.
  const withServerPoints = growth ? { ...state, todayPoints: growth.today, currentDailyScore: growth.today.total } : state;
  return { state: withServerPoints, rollover: rollover && rollover.daysPassed > 0 ? rollover : null };
}

export interface GrowthResult {
  total: number;
  level: number;
  evolved: boolean;
  today: DayPoints;
}

/** Recounts growth points on the server and evolves the pet at most once a day. */
export async function syncGrowth(todayKey: string): Promise<GrowthResult> {
  const res = await supabase.rpc('sync_growth', { p_today: todayKey });
  if (res.error) throw res.error;
  return res.data as GrowthResult;
}

export async function saveSleepRecord(userId: string, logDate: string, r: SleepRecord): Promise<void> {
  const res = await supabase
    .from('sleep_records')
    .upsert(
      { user_id: userId, log_date: logDate, bed_time: r.bedTime, wake_time: r.wakeTime, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,log_date' }
    );
  if (res.error) throw res.error;
}

export async function saveMealRecord(userId: string, logDate: string, r: MealRecord): Promise<void> {
  const res = await supabase.from('meal_records').upsert(
    {
      user_id: userId,
      log_date: logDate,
      slot: r.slot,
      status: r.status,
      menu: r.menu,
      feeling: r.feeling,
      memo: r.memo,
      photo_path: r.photoPath,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,log_date,slot' }
  );
  if (res.error) throw res.error;
}

/** Adds a mind record; the server allows three a day ('mind limit'). */
export async function addMindRecord(userId: string, logDate: string, r: MindRecord): Promise<void> {
  const res = await supabase
    .from('mind_records')
    .insert({ user_id: userId, log_date: logDate, emotion: r.emotion, situation: r.situation, note: r.note });
  if (res.error) throw res.error;
}

/** Saves the current day's check-in totals and score. */
export async function saveDailyLog(userId: string, state: UserState): Promise<void> {
  const logDate = state.lastActiveDate;
  if (!logDate) throw new Error('lastActiveDate is not set');

  const daily = await supabase
    .from('daily_logs')
    .upsert(toDailyLogRow(state, userId, logDate), { onConflict: 'user_id,log_date' });
  if (daily.error) throw daily.error;
}

/** Saves today's check-in totals and appends the history entry. */
export async function saveCheckin(
  userId: string,
  state: UserState,
  log: Pick<LogItem, 'type' | 'content' | 'photoPath'>
): Promise<void> {
  await saveDailyLog(userId, state);
  await addHistoryLog(userId, state.lastActiveDate!, log);
}

export async function saveOnboarding(
  userId: string,
  values: {
    nickname: string;
    birthYear: number;
    journeyStart: string;
    targetSleep: number;
    targetMeals: number;
    usualMealSize: number;
    /** Only for users who may be under 14. */
    guardian?: { name: string; contact: string };
  }
): Promise<void> {
  const res = await supabase
    .from('profiles')
    .update({
      nickname: values.nickname,
      birth_year: values.birthYear,
      journey_start: values.journeyStart,
      ...(values.guardian && {
        guardian_name: values.guardian.name,
        guardian_contact: values.guardian.contact,
        guardian_consent_at: new Date().toISOString(),
      }),
      onboarded: true,
      target_sleep: values.targetSleep,
      target_meals: values.targetMeals,
      usual_meal_size: values.usualMealSize,
    })
    .eq('id', userId);
  if (res.error) throw res.error;
}

export async function saveSettings(
  userId: string,
  values: { nickname: string; birthYear: number | null; targetSleep: number; targetMeals: number }
): Promise<void> {
  const res = await supabase
    .from('profiles')
    .update({
      nickname: values.nickname,
      birth_year: values.birthYear,
      target_sleep: values.targetSleep,
      target_meals: values.targetMeals,
    })
    .eq('id', userId);
  if (res.error) throw res.error;
}

export async function addHistoryLog(
  userId: string,
  logDate: string,
  log: Pick<LogItem, 'type' | 'content' | 'photoPath'>
): Promise<void> {
  const res = await supabase.from('checkin_logs').insert({
    user_id: userId,
    log_date: logDate,
    type: log.type,
    content: log.content,
    photo_path: log.photoPath ?? null,
  });
  if (res.error) throw res.error;
}

export async function saveEquipped(
  userId: string,
  equipped: { costume: string | null; backgrounds: string[] }
): Promise<void> {
  const res = await supabase
    .from('profiles')
    .update({ equipped_costume: equipped.costume, equipped_backgrounds: equipped.backgrounds })
    .eq('id', userId);
  if (res.error) throw res.error;
}

const MEAL_PHOTOS = 'meal-photos';

/** Uploads a picked/taken meal photo into the user's own folder; returns its storage path. */
export async function uploadMealPhoto(userId: string, uri: string): Promise<string> {
  const body = await (await fetch(uri)).arrayBuffer();
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(MEAL_PHOTOS)
    .upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

/** Short-lived URLs for private meal photos, keyed by path. */
export async function mealPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(MEAL_PHOTOS).createSignedUrls(paths, 3600);
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl]] : []))
  );
}

export interface MealPhoto {
  id: string;
  content: string;
  createdAt: string;
  logDate: string;
  slot: number;
  mealLabel: string;
  url: string;
}

/** Every meal photo of the user, newest first, with short-lived links. */
export async function fetchMealPhotos(userId: string): Promise<MealPhoto[]> {
  // shortcut: newest 300 photos; page with .range() once someone has more.
  const res = await supabase
    .from('meal_records')
    .select('log_date, slot, menu, feeling, memo, photo_path, updated_at')
    .eq('user_id', userId)
    .not('photo_path', 'is', null)
    .order('log_date', { ascending: false })
    .order('slot', { ascending: true })
    .limit(300);
  if (res.error) throw res.error;
  const rows = res.data ?? [];
  const urls = await mealPhotoUrls(rows.map((r) => r.photo_path as string));
  return rows.flatMap((r) =>
    urls[r.photo_path as string]
      ? [{
          id: `${r.log_date}-${r.slot}`,
          content: [r.menu, r.feeling, r.memo].filter(Boolean).join(' · '),
          createdAt: r.updated_at,
          logDate: r.log_date,
          slot: r.slot,
          mealLabel: ['아침', '오전 간식', '점심', '오후 간식', '저녁', '저녁 간식'][r.slot] ?? '식사',
          url: urls[r.photo_path as string],
        }]
      : []
  );
}

/** Deletes every meal photo of the user (account deletion; storage doesn't cascade). */
export async function deleteAllMealPhotos(userId: string): Promise<void> {
  // shortcut: one page of 1000 files; loop with offset if a user can ever have more.
  const { data, error } = await supabase.storage.from(MEAL_PHOTOS).list(userId, { limit: 1000 });
  if (error) throw error;
  if (!data?.length) return;
  const res = await supabase.storage.from(MEAL_PHOTOS).remove(data.map((f) => `${userId}/${f.name}`));
  if (res.error) throw res.error;
}

export type BuyError = 'already_owned' | 'insufficient_jelly' | 'not_found' | 'network';

export async function buyItem(
  type: 'costume' | 'background',
  id: string
): Promise<{ ok: true; jellyBalance: number } | { ok: false; error: BuyError }> {
  const res = await supabase.rpc('buy_item', { p_type: type, p_id: id });
  if (res.error) {
    const msg = res.error.message ?? '';
    if (msg.includes('already owned')) return { ok: false, error: 'already_owned' };
    if (msg.includes('insufficient jelly')) return { ok: false, error: 'insufficient_jelly' };
    if (msg.includes('item not found')) return { ok: false, error: 'not_found' };
    return { ok: false, error: 'network' };
  }
  return { ok: true, jellyBalance: (res.data as { jelly_balance: number }).jelly_balance };
}

export type GiftBoxError = 'all_owned' | 'insufficient_jelly' | 'network';

/** Opens a gift box: the server picks a random unowned item and takes the jelly. */
export async function openGiftBox(): Promise<
  { ok: true; type: 'costume' | 'background'; id: string; jellyBalance: number } | { ok: false; error: GiftBoxError }
> {
  const res = await supabase.rpc('open_gift_box');
  if (res.error) {
    const msg = res.error.message ?? '';
    if (msg.includes('all owned')) return { ok: false, error: 'all_owned' };
    if (msg.includes('insufficient jelly')) return { ok: false, error: 'insufficient_jelly' };
    return { ok: false, error: 'network' };
  }
  const d = res.data as { item_type: 'costume' | 'background'; item_id: string; jelly_balance: number };
  return { ok: true, type: d.item_type, id: d.item_id, jellyBalance: d.jelly_balance };
}

/** Stored daily health index per day, from `fromDate` (inclusive). */
export async function fetchScoreHistory(
  userId: string,
  fromDate: string
): Promise<{ log_date: string; daily_score: number | null }[]> {
  const res = await supabase
    .from('daily_logs')
    .select('log_date, daily_score')
    .eq('user_id', userId)
    .gte('log_date', fromDate)
    .order('log_date', { ascending: true });
  if (res.error) throw res.error;
  return res.data ?? [];
}

/** Every day the user has a daily_logs row for (one row per day). */
export async function fetchDailyRecords(userId: string): Promise<DailyRecordRow[]> {
  const res = await supabase
    .from('daily_logs')
    .select('log_date, daily_score, meal_count, sleep_hours, emotion')
    .eq('user_id', userId)
    .order('log_date', { ascending: true });
  if (res.error) throw res.error;
  return (res.data ?? []) as DailyRecordRow[];
}

export type BackfillError = 'insufficient_jelly' | 'nothing_to_backfill' | 'network';

/** Fills in yesterday's check-ins for jelly (S25). The server restores the streak and any shield used. */
export async function backfillYesterday(
  todayKey: string,
  day: {
    sleepHours: number | null;
    sleepDiff: number | null;
    mealCount: number;
    badMealCount: number;
    emotion: number | null;
    score: number;
  }
): Promise<{ ok: true } | { ok: false; error: BackfillError }> {
  const res = await supabase.rpc('backfill_yesterday', {
    p_today: todayKey,
    p_sleep_hours: day.sleepHours,
    p_sleep_diff: day.sleepDiff,
    p_meal_count: day.mealCount,
    p_bad_meal_count: day.badMealCount,
    p_emotion: day.emotion,
    p_daily_score: day.score,
  });
  if (res.error) {
    const msg = res.error.message ?? '';
    if (msg.includes('insufficient jelly')) return { ok: false, error: 'insufficient_jelly' };
    if (msg.includes('nothing to backfill')) return { ok: false, error: 'nothing_to_backfill' };
    return { ok: false, error: 'network' };
  }
  return { ok: true };
}

export type GoalKind = 'more_meal' | 'earlier_bed' | 'mind_reason';

export interface SmallGoalInfo {
  day: number;
  observing: boolean;
  goal: { kind: GoalKind; size: number; held: boolean } | null;
  yesterday: { eaten: number; bed_time: string | null; sleep_minutes: number | null; bedtime_ok: boolean };
  target_meals: number;
  recommended_bed_start: string;
  recommended_bed_end: string;
  needs_prompt: boolean;
  suggestion: GoalKind;
  points: number;
}

/** Today's small goal card data, judged by the server from the records. */
export async function fetchSmallGoal(todayKey: string): Promise<SmallGoalInfo> {
  const res = await supabase.rpc('get_small_goal', { p_today: todayKey });
  if (res.error) throw res.error;
  return res.data as SmallGoalInfo;
}

export async function saveSmallGoal(
  userId: string,
  logDate: string,
  goal: { kind: GoalKind; size: number; held: boolean }
): Promise<void> {
  const res = await supabase
    .from('small_goals')
    .upsert({ user_id: userId, log_date: logDate, ...goal }, { onConflict: 'user_id,log_date' });
  if (res.error) throw res.error;
}

export async function clearSmallGoal(userId: string, logDate: string): Promise<void> {
  const res = await supabase.from('small_goals').delete().eq('user_id', userId).eq('log_date', logDate);
  if (res.error) throw res.error;
}

export interface DayDetail {
  records: DayRecords;
  points: DayPoints & { small_goal: { kind: GoalKind; size: number; held: boolean } | null };
  photoUrls: Record<string, string>;
}

/** Everything recorded on one day, with its growth points and their basis. */
export async function fetchDay(userId: string, date: string): Promise<DayDetail> {
  const [sleepRes, mealRes, mindRes, pointsRes] = await Promise.all([
    supabase.from('sleep_records').select('bed_time, wake_time').eq('user_id', userId).eq('log_date', date).maybeSingle(),
    supabase
      .from('meal_records')
      .select('slot, status, menu, feeling, memo, photo_path')
      .eq('user_id', userId)
      .eq('log_date', date)
      .order('slot'),
    supabase
      .from('mind_records')
      .select('emotion, situation, note')
      .eq('user_id', userId)
      .eq('log_date', date)
      .order('created_at'),
    supabase.rpc('get_day_points', { p_day: date }),
  ]);
  for (const r of [sleepRes, mealRes, mindRes, pointsRes]) if (r.error) throw r.error;
  const records = toDayRecords({
    sleep: sleepRes.data as SleepRecordRow | null,
    meals: (mealRes.data ?? []) as MealRecordRow[],
    minds: (mindRes.data ?? []) as MindRecordRow[],
  });
  const photoUrls = await mealPhotoUrls(records.meals.flatMap((m) => (m.photoPath ? [m.photoPath] : [])));
  return { records, points: pointsRes.data as DayDetail['points'], photoUrls };
}

/** Begins a new 100 days after the last one ended; earlier records stay. */
export async function startJourney(userId: string, today: string): Promise<void> {
  const res = await supabase.from('profiles').update({ journey_start: today }).eq('id', userId);
  if (res.error) throw res.error;
}

export interface Journey {
  first_date: string | null;
  recorded_days: number;
  total: number;
  level: number;
  sleep_count: number;
  meal_count: number;
  mind_count: number;
  goals_done: number;
  reflection: string;
}

/** The whole journey so far, for the summary card. */
export async function fetchJourney(): Promise<Journey> {
  const res = await supabase.rpc('get_journey');
  if (res.error) throw res.error;
  return res.data as Journey;
}

export async function saveReflection(userId: string, text: string): Promise<void> {
  const res = await supabase.from('profiles').update({ reflection: text }).eq('id', userId);
  if (res.error) throw res.error;
}

export interface DailyReflection {
  logDate: string;
  text: string;
  updatedAt: string;
}

export async function fetchDailyReflections(userId: string, limit = 8): Promise<DailyReflection[]> {
  const res = await supabase
    .from('daily_reflections')
    .select('log_date, text, updated_at')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(limit);
  if (res.error) throw res.error;
  return (res.data ?? []).map((entry) => ({
    logDate: entry.log_date,
    text: entry.text,
    updatedAt: entry.updated_at,
  }));
}

export async function saveDailyReflection(userId: string, logDate: string, text: string): Promise<void> {
  const res = await supabase.from('daily_reflections').upsert(
    { user_id: userId, log_date: logDate, text: text.slice(0, 2000) },
    { onConflict: 'user_id,log_date' }
  );
  if (res.error) throw res.error;
}

export interface PetChatPreference {
  historyEnabled: boolean;
  consentAt: string | null;
}

export interface StoredPetChatMessage {
  id: string;
  role: 'user' | 'pet';
  content: string;
  createdAt: string;
}

/** Null means the user has not decided whether chat history may be stored yet. */
export async function fetchPetChatPreference(userId: string): Promise<PetChatPreference | null> {
  const res = await supabase
    .from('pet_chat_preferences')
    .select('history_enabled, consent_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (res.error) throw res.error;
  if (!res.data) return null;
  return { historyEnabled: res.data.history_enabled, consentAt: res.data.consent_at };
}

export async function setPetChatHistoryPreference(userId: string, enabled: boolean): Promise<void> {
  const now = new Date().toISOString();
  const res = await supabase.from('pet_chat_preferences').upsert(
    {
      user_id: userId,
      history_enabled: enabled,
      consent_at: enabled ? now : null,
      updated_at: now,
    },
    { onConflict: 'user_id' }
  );
  if (res.error) throw res.error;
}

/** Loads the newest 100 messages from the last 30 days, then displays them oldest first. */
export async function fetchPetChatMessages(userId: string): Promise<StoredPetChatMessage[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const res = await supabase
    .from('pet_chat_messages')
    .select('id, role, content, created_at')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(PET_CHAT_LIMIT);
  if (res.error) throw res.error;
  return (res.data ?? [])
    .map((message) => ({
      id: message.id,
      role: message.role as StoredPetChatMessage['role'],
      content: message.content,
      createdAt: message.created_at,
    }))
    .reverse();
}

export async function savePetChatMessages(
  userId: string,
  messages: { role: 'user' | 'pet'; content: string }[]
): Promise<void> {
  if (messages.length === 0) return;
  const res = await supabase.from('pet_chat_messages').insert(
    messages.map((message) => ({
      user_id: userId,
      role: message.role,
      content: message.content.slice(0, 500),
    }))
  );
  if (res.error) throw res.error;
}

export async function deleteAllPetChatMessages(userId: string): Promise<void> {
  const res = await supabase.from('pet_chat_messages').delete().eq('user_id', userId);
  if (res.error) throw res.error;
}
