import { supabase } from '@/lib/supabase';
import { LogItem, UserState } from '@/types/foodymon';
import { RolloverResult } from '@/lib/dayRollover';
import {
  buildUserState,
  CheckinLogRow,
  CloseDaysResponse,
  DailyLogRow,
  ProfileRow,
  toDailyLogRow,
  toRolloverResult,
  UserItemRow,
} from '@/lib/serverState';

const RECENT_LOG_LIMIT = 50;

type Levels = readonly { level: number; maxScore: number }[];

/**
 * Loads the user's game state from Supabase. When the user is onboarded, first
 * asks the server to close out any days that ended (streak/jelly/shields).
 */
export async function fetchGameState(
  userId: string,
  todayKey: string,
  levels: Levels
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

  const profileRes = await supabase
    .from('profiles')
    .select(
      'nickname, onboarded, target_sleep, target_meals, usual_meal_size, jelly_balance, streak, shields, equipped_costume, equipped_backgrounds, history_scores, last_checkin_date'
    )
    .eq('id', userId)
    .single();
  if (profileRes.error) throw profileRes.error;
  const profile = profileRes.data as ProfileRow;

  const [todayRes, logsRes, itemsRes] = await Promise.all([
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
      .select('id, type, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(RECENT_LOG_LIMIT),
    supabase.from('user_items').select('item_type, item_id').eq('user_id', userId),
  ]);
  if (todayRes.error) throw todayRes.error;
  if (logsRes.error) throw logsRes.error;
  if (itemsRes.error) throw itemsRes.error;

  const state = buildUserState(
    {
      profile,
      today: todayRes.data as DailyLogRow | null,
      logs: (logsRes.data ?? []) as CheckinLogRow[],
      items: (itemsRes.data ?? []) as UserItemRow[],
    },
    levels
  );

  return { state, rollover: rollover && rollover.daysPassed > 0 ? rollover : null };
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
  log: Pick<LogItem, 'type' | 'content'>
): Promise<void> {
  await saveDailyLog(userId, state);
  await addHistoryLog(userId, state.lastActiveDate!, log);
}

export async function saveOnboarding(
  userId: string,
  values: { nickname: string; targetSleep: number; targetMeals: number; usualMealSize: number }
): Promise<void> {
  const res = await supabase
    .from('profiles')
    .update({
      nickname: values.nickname,
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
  values: { nickname: string; targetSleep: number; targetMeals: number }
): Promise<void> {
  const res = await supabase
    .from('profiles')
    .update({
      nickname: values.nickname,
      target_sleep: values.targetSleep,
      target_meals: values.targetMeals,
    })
    .eq('id', userId);
  if (res.error) throw res.error;
}

export async function addHistoryLog(
  userId: string,
  logDate: string,
  log: Pick<LogItem, 'type' | 'content'>
): Promise<void> {
  const res = await supabase
    .from('checkin_logs')
    .insert({ user_id: userId, log_date: logDate, type: log.type, content: log.content });
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
