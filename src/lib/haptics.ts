import * as Haptics from 'expo-haptics';

// Fire-and-forget: devices or platforms without haptics (web) just skip it.
export const tapFeel = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
export const bumpFeel = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
export const successFeel = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
