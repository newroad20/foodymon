import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

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
      {/* Simulation Next Day Test Button */}
      <TouchableOpacity
        style={styles.testButton}
        activeOpacity={0.8}
        onPress={onNextDay}>
        <Text style={styles.testButtonText}>🗓️ [테스트] 다음 날로 시뮬레이션</Text>
      </TouchableOpacity>

      {/* Main 4 Action Buttons */}
      <View style={styles.dock}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={onOpenMeal}>
          <View style={[styles.iconCircle, { backgroundColor: '#FFEDD5' }]}>
            <Text style={styles.actionIcon}>🍚</Text>
          </View>
          <Text style={styles.actionLabel}>식사</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={onOpenSleep}>
          <View style={[styles.iconCircle, { backgroundColor: '#EDE9FE' }]}>
            <Text style={styles.actionIcon}>🌙</Text>
          </View>
          <Text style={styles.actionLabel}>수면</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={onOpenEmotion}>
          <View style={[styles.iconCircle, { backgroundColor: '#FCE7F3' }]}>
            <Text style={styles.actionIcon}>😊</Text>
          </View>
          <Text style={styles.actionLabel}>감정</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={onOpenBag}>
          <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
            <Text style={styles.actionIcon}>🎒</Text>
          </View>
          <Text style={styles.actionLabel}>가방</Text>
        </TouchableOpacity>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
  },
  dock: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A5568',
  },
});
