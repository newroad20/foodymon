import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Two gentle daily nudges in the forest voice; nothing about what was missed.
const REMINDERS = [
  { hour: 9, minute: 0, body: '🌿 좋은 아침! 어젯밤 잠 이야기 들려줄래?' },
  { hour: 20, minute: 0, body: '🌙 오늘 숲에서 어떤 맛과 마음을 만났어?' },
];

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
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of REMINDERS) {
    await Notifications.scheduleNotificationAsync({
      content: { title: '푸디몬', body: r.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: r.hour,
        minute: r.minute,
        channelId: 'reminders',
      },
    });
  }
  return true;
}

export async function disableReminders(): Promise<void> {
  if (remindersSupported) await Notifications.cancelAllScheduledNotificationsAsync();
}
