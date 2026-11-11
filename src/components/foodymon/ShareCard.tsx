import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { UserState } from '@/types/foodymon';
import { backgroundsData, costumeArt, costumesData, levelsData, petImage } from '@/constants/foodymonData';
import { hasLoggedToday } from '@/lib/dayRollover';

export const SHARE_CARD_WIDTH = 320;

const todayLabel = () => {
  const d = new Date();
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
};

/**
 * The social card captured as an image. Uses React Native's Image (not
 * expo-image) so the pet renders reliably in the captured bitmap.
 */
export const ShareCard = forwardRef<View, { state: UserState }>(function ShareCard({ state }, ref) {
  const levelInfo = levelsData.find((l) => l.level === state.level) ?? levelsData[2];
  const costume = costumesData.find((c) => c.id === state.equippedCostume);
  const roomItems = backgroundsData.filter((b) => state.equippedBackgrounds.includes(b.id));
  const logged = hasLoggedToday(state);

  return (
    // collapsable={false}: keep this view in the native tree on Android so it can be captured.
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.brand}>FOODY-MON</Text>
        <Text style={styles.date}>{todayLabel()}</Text>
      </View>

      <Text style={styles.title}>{state.masterName || '마스터'}의 푸디몬 💛</Text>

      <View style={styles.stage}>
        {roomItems.length > 0 && (
          <Text style={styles.room}>{roomItems.map((b) => b.emoji).join(' ')}</Text>
        )}
        {costume && !costumeArt[state.level]?.[costume.id] && <Text style={styles.costume}>{costume.icon}</Text>}
        <Image source={petImage(state.level, costume?.id ?? null)} style={styles.pet} resizeMode="contain" />
        <Text style={styles.levelBadge}>
          Lv.{levelInfo.level} {levelInfo.name}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{logged ? state.currentDailyScore : '–'}</Text>
          <Text style={styles.statLabel}>오늘 성장점</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{state.streak}일</Text>
          <Text style={styles.statLabel}>연속 기록</Text>
        </View>
      </View>

      <Text style={styles.footer}>#푸디몬 #건강한하루 #오늘도기록완료</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    backgroundColor: '#F2F8F4',
    borderRadius: 28,
    padding: 22,
    borderWidth: 3,
    borderColor: '#B5E6D4',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 12,
    letterSpacing: 1.5,
    color: '#17765D',
    fontWeight: '900',
  },
  date: {
    fontSize: 12,
    color: '#17765D',
    fontWeight: '700',
  },
  title: {
    marginTop: 10,
    fontSize: 20,
    color: '#1E293B',
    fontWeight: '900',
  },
  stage: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 14,
  },
  room: {
    position: 'absolute',
    top: 10,
    left: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  costume: {
    fontSize: 34,
    marginBottom: -16,
    zIndex: 1,
    fontWeight: '600',
  },
  pet: {
    width: 170,
    height: 170,
  },
  levelBadge: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E3F6EF',
    color: '#17765D',
    fontSize: 12,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    color: '#1E293B',
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  divider: {
    width: 1,
    backgroundColor: '#F1F5F9',
  },
  footer: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 11,
    color: '#17765D',
    fontWeight: '600',
  },
});
