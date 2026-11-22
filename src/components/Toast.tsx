import React, { ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInUp, FadeOut, FadeOutUp, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { color, font, radius, shadow } from '@/constants/theme';
import { errorFeel, successFeel } from '@/lib/haptics';

/** A short note that needs no decision ("saved", "the day changed"). Choices and retry-errors stay Alert. */
export type Toast = { tone: 'success' | 'info' | 'error'; title: string; message?: string };

const TONES = {
  success: { icon: 'checkmark-circle', ink: color.accent, edge: color.accentTintEdge, feel: successFeel },
  info: { icon: 'information-circle', ink: color.inkMuted, edge: color.line, feel: null },
  error: { icon: 'alert-circle', ink: color.danger, edge: color.dangerEdge, feel: errorFeel },
} as const;

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// Set by the mounted provider so code outside React (FoodyMonContext callbacks) can show one too.
let showToast: ((t: Toast) => void) | null = null;
let seq = 0;
export const toast = (t: Toast) => showToast?.(t);
export const useToast = () => ({ show: toast });

/** Mount once at the root. One toast at a time: a new one replaces the old. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<(Toast & { id: number }) | null>(null);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    showToast = (t) => {
      TONES[t.tone].feel?.();
      AccessibilityInfo.announceForAccessibility(t.message ? `${t.title}. ${t.message}` : t.title);
      setCurrent({ ...t, id: ++seq });
    };
    return () => {
      showToast = null;
    };
  }, []);

  // Reading time: ~3s for a short line, longer for multi-line news.
  useEffect(() => {
    if (!current) return;
    const ms = Math.min(7000, 2200 + (current.title.length + (current.message?.length ?? 0)) * 50);
    const timer = setTimeout(() => setCurrent(null), ms);
    return () => clearTimeout(timer);
  }, [current]);

  const tone = current ? TONES[current.tone] : null;
  return (
    <View style={styles.fill}>
      {children}
      {current && tone && (
        <Animated.View
          key={current.id}
          entering={
            reduceMotion
              ? FadeIn.duration(200).reduceMotion(ReduceMotion.Never)
              : FadeInUp.duration(280).easing(EASE_OUT)
          }
          exiting={reduceMotion ? FadeOut.duration(150).reduceMotion(ReduceMotion.Never) : FadeOutUp.duration(180)}
          style={[styles.wrap, { top: insets.top + 8 }]}
          pointerEvents="box-none">
          <Pressable
            onPress={() => setCurrent(null)}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            accessibilityHint="눌러서 닫기"
            style={[styles.card, { borderColor: tone.edge, borderBottomColor: tone.edge }]}>
            <Ionicons name={tone.icon} size={24} color={tone.ink} />
            <View style={styles.texts}>
              <Text style={styles.title}>{current.title}</Text>
              {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
            </View>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderBottomWidth: 4,
    boxShadow: shadow.floating,
  },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: font.subhead, fontWeight: '800', color: color.ink },
  message: { fontSize: font.footnote, fontWeight: '600', color: color.inkSoft, lineHeight: 18 },
});
