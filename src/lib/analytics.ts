import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export type AppEvent = 'app_open' | 'app_close' | 'screen' | 'sheet_open';

let userId: string | null = null;

/** Set once the user is known; events before that are dropped. */
export function setAnalyticsUser(id: string | null) {
  userId = id;
}

/** Fire-and-forget usage log (supabase/008_app_events.sql). Never blocks or breaks the app. */
export function track(name: AppEvent, detail = '') {
  if (!userId) return;
  supabase
    .from('app_events')
    .insert({ user_id: userId, name, detail: detail.slice(0, 60), platform: Platform.OS })
    .then(({ error }) => error && console.warn('app_events:', error.message));
}
