import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { levelsData } from '@/constants/foodymonData';

interface TopStatsHeaderProps {
  onOpenHistory: () => void;
}

export function TopStatsHeader({ onOpenHistory }: TopStatsHeaderProps) {
  const { state } = useFoodyMon();
  const currentLvl = levelsData.find((l) => l.level === state.level) || levelsData[2];

  return (
    <View style={styles.container}>
      {/* Left Stat Badges */}
      <View style={styles.statsRow}>
        {/* Level Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>⚡</Text>
          <Text style={styles.badgeText}>Lv.{state.level} {currentLvl.name}</Text>
        </View>

        {/* Streak Flame */}
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>🔥</Text>
          <Text style={styles.badgeText}>{state.streak}일</Text>
        </View>

        {/* Jelly Currency */}
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>✨</Text>
          <Text style={styles.badgeText}>{state.currency}</Text>
        </View>

        {/* Shield */}
        {state.shields > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>🛡️</Text>
            <Text style={styles.badgeText}>{state.shields}</Text>
          </View>
        )}
      </View>

      {/* History Button */}
      <TouchableOpacity
        style={styles.historyButton}
        activeOpacity={0.8}
        onPress={onOpenHistory}>
        <Text style={styles.historyIcon}>📖</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    gap: 4,
  },
  badgeIcon: {
    fontSize: 13,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D3748',
  },
  historyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginLeft: 8,
  },
  historyIcon: {
    fontSize: 18,
  },
});
