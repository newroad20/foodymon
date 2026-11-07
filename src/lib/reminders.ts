import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { upcomingReminders } from '@/lib/reminderQuestions';

const DAYS_AHEAD = 14;

let reminderEnd: Date | null = null;

/** No reminders are queued from this moment on (the end of the 100 days). */
export function setReminderEnd(end: Date | null) {
  reminderEnd = end;
}

// shortcut: local notifications only (no web, no server push); fine for daily nudges.
export const remindersSupported = Platform.OS !== 'web';

/** Reminders are on when any are scheduled on this device. */
export async function remindersEnabled(): Promise<boolean> {
  if (!remindersSupported) return false;
  return (await Notifications.getAllScheduledNotificationsAsync()).length > 0;
}

/** Asks for permission and schedules the daily reminders. Returns false if not allowed. */
export async function enableReminders(): Promise<boolean> {
  if (!remindersSupported) return false;
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: '푸디몬 알림',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await scheduleUpcoming();
  return true;
}

/** Tops the question queue back up on app open; does nothing unless reminders are on and still allowed. */
export async function refreshReminders(): Promise<void> {
  if (!(await remindersEnabled())) return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (granted) await scheduleUpcoming();
}

// shortcut: a repeating trigger can't change its text, so questions are queued ahead and stop after 14 days without opening the app; move to server push if they should continue.
async function scheduleUpcoming() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of upcomingReminders(new Date(), DAYS_AHEAD)) {
    if (reminderEnd && r.date >= reminderEnd) break;
    await Notifications.scheduleNotificationAsync({
      identifier: `reminder-${r.date.getTime()}`, // same slot replaces, so overlapping calls can't double up
      content: { title: '푸디몬', body: r.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: r.date,
        channelId: 'reminders',
      },
    });
  }
}

export async function disableReminders(): Promise<void> {
  if (remindersSupported) await Notifications.cancelAllScheduledNotificationsAsync();
}
