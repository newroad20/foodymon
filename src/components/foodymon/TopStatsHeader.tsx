import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Lv.{state.level} {currentLvl.name}</Text>
        </View>

        {/* Streak · jelly · shields in one pill */}
        <View style={styles.badge} accessibilityLabel={`연속 ${state.streak}일, 젤리 ${state.currency}개, 방패 ${state.shields}개`}>
          <Ionicons name="flame" size={14} color="#E8734A" />
          <Text style={styles.badgeText}>{state.streak}</Text>
          <View style={styles.sep} />
          <Ionicons name="water" size={14} color="#1B7F66" />
          <Text style={styles.badgeText}>{state.currency}</Text>
          <View style={styles.sep} />
          <Ionicons name="shield-checkmark" size={14} color="#64748B" />
          <Text style={styles.badgeText}>{state.shields}</Text>
        </View>
      </View>

      {/* History Button */}
      <TouchableOpacity
        style={styles.historyButton}
        activeOpacity={0.8}
        onPress={onOpenHistory}>
        <Ionicons name="book-outline" size={18} color="#334155" accessibilityLabel="기록장" />
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
    gap: 4,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
  },
  sep: {
    width: 1,
    height: 12,
    marginHorizontal: 4,
    backgroundColor: '#E2E8F0',
  },
  badgeText: {
    fontSize: 12,
    color: '#2D3748',
    fontWeight: '800',
  },
  historyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
  },
});
