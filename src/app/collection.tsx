import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { backgroundsData, costumeArt, costumesData, levelsData } from '@/constants/foodymonData';
import { hasLoggedToday, toDateKey } from '@/lib/dayRollover';
import { badgeDefs, computeCollection, DailyRecordRow, earnedBadges } from '@/lib/collection';
import { fetchDailyRecords } from '@/lib/gameApi';
import { STAGE_POINTS } from '@/lib/growth';

// FoodyMon hatches at stage 1 and grows to 6 on cumulative points; it never goes back.
const STAGES = levelsData;

type Section = 'evolution' | 'items' | 'badges';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'evolution', label: '진화 도감' },
  { id: 'items', label: '의상·소품' },
  { id: 'badges', label: '배지·방패' },
];

const SILHOUETTE = '#CBD5E1';

export default function CollectionScreen() {
  const { userId, state } = useFoodyMon();
  const [section, setSection] = useState<Section>('evolution');
  const [rows, setRows] = useState<DailyRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchDailyRecords(userId)
        .then((data) => {
          if (!active) return;
          setRows(data);
          setError(false);
        })
        .catch((e) => {
          console.error('Failed to load records:', e);
          if (active) setError(true);
        })
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [userId])
  );

  const stats = computeCollection({
    rows,
    today: { date: toDateKey(new Date()), score: state.currentDailyScore, logged: hasLoggedToday(state) },
    levels: levelsData,
    ownedCostumes: state.ownedCostumes.length,
    ownedBackgrounds: state.ownedBackgrounds.length,
    totalCostumes: costumesData.length,
    totalBackgrounds: backgroundsData.length,
  });
  const earned = earnedBadges(stats);

  return (
    <View style={styles.container}>
      <View style={styles.segment}>
        {SECTIONS.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.segmentBtn, section === s.id && styles.segmentBtnActive]}
            onPress={() => setSection(s.id)}
            activeOpacity={0.8}>
            <Text style={[styles.segmentText, section === s.id && styles.segmentTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error && <Text style={styles.notice}>기록을 불러오지 못했어요. 다시 열어 주세요.</Text>}

        {section === 'evolution' &&
          (loading ? (
            <ActivityIndicator style={styles.loader} color="#17765D" />
          ) : (
            <>
              <Text style={styles.progress}>
                만난 모습 {STAGES.filter((l) => l.level <= state.level).length}/{STAGES.length}
              </Text>
              <View style={styles.grid}>
                {STAGES.map((l) => {
                  const seenOn = l.level <= state.level;
                  return (
                    <View key={l.level} style={styles.levelCard}>
                      <Image
                        source={l.image}
                        style={styles.levelImage}
                        contentFit="contain"
                        tintColor={seenOn ? null : SILHOUETTE}
                      />
                      <Text style={styles.levelNo}>{l.level}단계</Text>
                      <Text style={styles.levelName}>{seenOn ? l.name : '???'}</Text>
                      <Text style={styles.levelMeta}>
                        {seenOn ? '함께 자랐어요' : `누적 ${STAGE_POINTS[l.level]}점에 만나요`}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.hint}>기록이 쌓일수록 푸디몬이 한 단계씩 자라요.</Text>
            </>
          ))}

        {section === 'items' && (
          <>
            <Text style={styles.progress}>
              의상 {stats.ownedCostumes}/{stats.totalCostumes}
            </Text>
            <View style={styles.grid}>
              {costumesData.map((c) => (
                <ItemCard
                  key={c.id}
                  art={costumeArt[state.level]?.[c.id]}
                  fit="contain"
                  name={c.name}
                  owned={state.ownedCostumes.includes(c.id)}
                  price={c.price}
                />
              ))}
            </View>
            <Text style={[styles.progress, styles.progressGap]}>
              마이룸 소품 {stats.ownedBackgrounds}/{stats.totalBackgrounds}
            </Text>
            <View style={styles.grid}>
              {backgroundsData.map((b) => (
                <ItemCard
                  key={b.id}
                  art={b.image}
                  fit="cover"
                  name={b.name}
                  owned={state.ownedBackgrounds.includes(b.id)}
                  price={b.price}
                />
              ))}
            </View>
            <Text style={styles.hint}>아이템은 홈의 꾸미기에서 입어 보고 젤리로 살 수 있어요.</Text>
          </>
        )}

        {section === 'badges' &&
          (loading ? (
            <ActivityIndicator style={styles.loader} color="#17765D" />
          ) : (
            <>
              <View style={styles.shieldCard}>
                <Ionicons name="shield-checkmark" size={34} color="#64748B" />
                <View style={styles.shieldText}>
                  <Text style={styles.shieldTitle}>스트릭 방패 {state.shields}개 보관 중</Text>
                  <Text style={styles.shieldSub}>
                    기록을 못 한 날 자동으로 1개 사용돼 연속 기록을 지켜줘요. 7일 연속마다 1개 더!
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <Summary label="기록한 날" value={`${stats.recordedDays}일`} />
                <Summary label="최장 연속" value={`${stats.bestRun}일`} />
              </View>

              <Text style={styles.progress}>
                배지 {earned.size}/{badgeDefs.length}
              </Text>
              <View style={styles.grid}>
                {badgeDefs.map((b) => {
                  const got = earned.has(b.id);
                  return (
                    <View key={b.id} style={[styles.badgeCard, !got && styles.locked]}>
                      <Ionicons name={got ? b.icon : 'lock-closed'} size={30} color={got ? '#1B7F66' : '#94A3B8'} style={!got && styles.lockedIcon} />
                      <Text style={styles.badgeName}>{b.name}</Text>
                      <Text style={styles.badgeDesc}>{b.description}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          ))}
      </ScrollView>
    </View>
  );
}

function ItemCard({
  art,
  fit,
  name,
  owned,
  price,
}: {
  art: React.ComponentProps<typeof Image>['source'];
  fit: 'contain' | 'cover';
  name: string;
  owned: boolean;
  price: number;
}) {
  return (
    <View style={[styles.itemCard, !owned && styles.locked]}>
      <Image source={art} style={[styles.itemArt, !owned && styles.lockedIcon]} contentFit={fit} />
      <Text style={styles.itemName}>{name}</Text>
      <Text style={styles.itemMeta}>
        {owned ? '보유 중' : <><Ionicons name="water" size={11} color="#1B7F66" /> {price}</>}
      </Text>
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F8F4',
  },
  segment: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#1E293B',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 48,
  },
  notice: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '600',
  },
  progress: {
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 12,
    fontWeight: '900',
  },
  progressGap: {
    marginTop: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  levelCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    gap: 2,
  },
  levelImage: {
    width: 96,
    height: 96,
    marginBottom: 6,
  },
  levelNo: {
    fontSize: 11,
    color: '#17765D',
    fontWeight: '800',
  },
  levelName: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '900',
  },
  levelMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
  itemCard: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  itemArt: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  itemName: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '800',
  },
  itemMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  locked: {
    backgroundColor: '#F8FAFC',
  },
  lockedIcon: {
    opacity: 0.35,
  },
  shieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  shieldText: {
    flex: 1,
    gap: 4,
  },
  shieldTitle: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '900',
  },
  shieldSub: {
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    marginBottom: 20,
  },
  summary: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  badgeCard: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  badgeName: {
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
    fontWeight: '900',
  },
  badgeDesc: {
    fontSize: 10,
    lineHeight: 14,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
});
