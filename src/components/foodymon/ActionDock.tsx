import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORY_COLORS as C } from '@/constants/categoryColors';

interface ActionDockProps {
  onOpenMeal: () => void;
  onOpenSleep: () => void;
  onOpenEmotion: () => void;
  onOpenBag: () => void;
  onNextDay: () => void;
}

export function ActionDock({
  onOpenMeal,
  onOpenSleep,
  onOpenEmotion,
  onOpenBag,
  onNextDay,
}: ActionDockProps) {
  return (
    <View style={styles.container}>
      {/* Simulation Next Day Test Button (development builds only) */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.testButton}
          activeOpacity={0.8}
          onPress={onNextDay}>
          <Text style={styles.testButtonText}>[테스트] 다음 날로 시뮬레이션</Text>
        </TouchableOpacity>
      )}

      <View style={styles.dockCard}>
        <View style={styles.dockHeading}>
          <Text style={styles.dockTitle}>오늘의 이야기를 들려줘</Text>
          <Text style={styles.dockHint}>기록할수록 가까워져요</Text>
        </View>
        <View style={styles.dock}>
          {[
            { label: '식사', icon: 'restaurant', color: C.meal.bg, ink: C.meal.ink, edge: C.meal.edge, onPress: onOpenMeal },
            { label: '수면', icon: 'moon', color: C.sleep.bg, ink: C.sleep.ink, edge: C.sleep.edge, onPress: onOpenSleep },
            { label: '마음', icon: 'happy', color: C.mind.bg, ink: C.mind.ink, edge: C.mind.edge, onPress: onOpenEmotion },
            { label: '꾸미기', icon: 'shirt', color: '#DFF2EE', ink: '#287D68', edge: '#BFDED5', onPress: onOpenBag },
          ].map((a) => (
            <Pressable key={a.label} style={styles.actionBtn} onPress={a.onPress} accessibilityRole="button" accessibilityLabel={a.label}>
              {({ pressed }) => (
                <>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: a.color, borderColor: a.edge },
                      pressed && styles.iconCirclePressed,
                    ]}>
                    <Ionicons name={a.icon as React.ComponentProps<typeof Ionicons>['name']} size={25} color={a.ink} />
                  </View>
                  <Text style={styles.actionLabel}>{a.label}</Text>
                </>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  testButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  testButtonText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  dockCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(206, 222, 214, 0.9)',
    shadowColor: '#3F5E50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 6,
  },
  dockHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 3,
    marginBottom: 10,
  },
  dockTitle: {
    color: '#263A31',
    fontSize: 15,
    fontWeight: '900',
  },
  dockHint: {
    color: '#8A9991',
    fontSize: 10,
    fontWeight: '700',
  },
  dock: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 0,
    width: '100%',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 5,
    minWidth: 62,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Duolingo-style press: the button sinks onto its edge.
  iconCirclePressed: {
    borderBottomWidth: 1,
    marginTop: 2,
  },
  actionLabel: {
    fontSize: 12,
    color: '#43564D',
    fontWeight: '900',
  },
});
