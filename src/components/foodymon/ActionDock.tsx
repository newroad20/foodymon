import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

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

      {/* Main 4 Action Buttons: chunky Pou/Duolingo-style round buttons */}
      <View style={styles.dock}>
        {[
          { label: '식사', icon: 'restaurant', color: '#FF9600', edge: '#CC7800', onPress: onOpenMeal },
          { label: '수면', icon: 'moon', color: '#8E7CF0', edge: '#6F5ED0', onPress: onOpenSleep },
          { label: '감정', icon: 'happy', color: '#FF6FA8', edge: '#D94E86', onPress: onOpenEmotion },
          { label: '가방', icon: 'bag-handle', color: '#1CB0F6', edge: '#1899D6', onPress: onOpenBag },
        ].map((a) => (
          <Pressable key={a.label} style={styles.actionBtn} onPress={a.onPress} accessibilityRole="button" accessibilityLabel={a.label}>
            {({ pressed }) => (
              <>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: a.color, borderBottomColor: a.edge },
                    pressed && styles.iconCirclePressed,
                  ]}>
                  <Ionicons name={a.icon as React.ComponentProps<typeof Ionicons>['name']} size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
    color: '#718096',
    fontWeight: '700',
  },
  dock: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
    paddingVertical: 14,
    paddingHorizontal: 12,
    width: '100%',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderBottomWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Duolingo-style press: the button sinks onto its edge.
  iconCirclePressed: {
    borderBottomWidth: 1,
    marginTop: 4,
  },
  actionLabel: {
    fontSize: 13,
    color: '#4B4B4B',
    fontWeight: '900',
  },
});
