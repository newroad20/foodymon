import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { levelsData } from '@/constants/foodymonData';
import { router } from 'expo-router';

interface TopStatsHeaderProps {
  onOpenHistory: () => void;
}

export function TopStatsHeader({ onOpenHistory }: TopStatsHeaderProps) {
  const { state } = useFoodyMon();
  const currentLvl = levelsData.find((l) => l.level === state.level) || levelsData[2];

  return (
    <View style={styles.container}>
      {/* Left Stat Badges */}
      <View style={styles.primaryStats}>
        <View style={[styles.badge, styles.levelBadge]}>
          <Text style={styles.badgeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            Lv.{state.level} {currentLvl.name}
          </Text>
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

      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.historyButton}
          activeOpacity={0.8}
          onPress={() => router.push('/help')}
          accessibilityRole="button"
          accessibilityLabel="도움 받기">
          <Ionicons name="help-circle-outline" size={18} color="#334155" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.historyButton}
          activeOpacity={0.8}
          onPress={onOpenHistory}
          accessibilityRole="button"
          accessibilityLabel="기록장">
          <Ionicons name="book-outline" size={18} color="#334155" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    zIndex: 10,
  },
  primaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderCurve: 'continuous',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#456456',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  levelBadge: {
    flexShrink: 1,
    minWidth: 0,
    backgroundColor: 'rgba(226, 245, 236, 0.95)',
    borderColor: '#B5E6D4',
  },
  sep: {
    width: 1,
    height: 12,
    marginHorizontal: 4,
    backgroundColor: '#E2E8F0',
  },
  badgeText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '800',
  },
  historyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 38,
    height: 38,
    borderRadius: 999,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#456456',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
});
