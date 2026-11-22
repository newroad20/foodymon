import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { levelsData } from '@/constants/foodymonData';
import { sleepMinutes } from '@/lib/growth';
import { toDateKey, hasLoggedToday } from '@/lib/dayRollover';
import { addDays, buildTrend, summarizeTrend } from '@/lib/trend';
import { fetchScoreHistory } from '@/lib/gameApi';
import { ScoreTrendChart } from '@/components/foodymon/ScoreTrendChart';
import { JourneyCard } from '@/components/foodymon/JourneyCard';

const RANGES = [7, 14, 30] as const;
type Range = (typeof RANGES)[number];

// Points measure how much was shared, never how "good" the day was.
function greeting(logged: boolean) {
  return logged
    ? '오늘 나눠 준 기록이 푸디몬의 성장점으로 쌓였어요. 고마워요'
    : '아직 오늘 기록이 없어요. 하나만 나눠 볼까요?';
}

export default function SummaryScreen() {
  const { userId, state } = useFoodyMon();
  const [range, setRange] = useState<Range>(7);
  const [rows, setRows] = useState<{ log_date: string; daily_score: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const todayKey = toDateKey(new Date());
  const logged = hasLoggedToday(state);

  // Reload whenever the tab is shown; 30 days covers every range.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      fetchScoreHistory(userId, addDays(toDateKey(new Date()), -29))
        .then((data) => {
          if (!active) return;
          setRows(data);
          setError(false);
        })
        .catch((e) => {
          console.error('Failed to load score history:', e);
          if (active) setError(true);
        })
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [userId])
  );

  const points = buildTrend(rows, todayKey, range, logged ? state.currentDailyScore : null);
  const summary = summarizeTrend(points);
  const levelInfo = levelsData.find((l) => l.level === state.level) ?? levelsData[2];

  const { records, todayPoints: pts } = state;
  const sleepMin = records.sleep ? sleepMinutes(records.sleep) : null;
  const sleepValue = sleepMin === null ? '미기록' : `${Math.floor(sleepMin / 60)}시간${sleepMin % 60 ? ` ${sleepMin % 60}분` : ''}`;
  const mealValue = records.meals.length === 0 ? '미기록' : `${records.meals.length}칸`;
  const mindValue = records.minds.length === 0 ? '미기록' : `${records.minds.length}번`;
  const areas = [records.sleep, records.meals.length, records.minds.length].filter(Boolean).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text style={styles.screenTitle}>하루 요약</Text>

        {/* S5-1 Today's report */}
        <View style={styles.card}>
          <View style={styles.reportHeader}>
            <View style={styles.reportText}>
              <Text style={styles.cardLabel}>오늘의 성장점</Text>
              <Text style={styles.hero}>
                {logged ? state.currentDailyScore : '–'}
                {logged && <Text style={styles.heroUnit}>점</Text>}
              </Text>
              <Text style={styles.greeting} lineBreakStrategyIOS="hangul-word">{greeting(logged)}</Text>
            </View>
            <Image source={levelInfo.image} style={styles.pet} contentFit="contain" />
          </View>

          <View style={styles.partsRow}>
            <PartTile icon="moon" color="#8E7CF0" label="수면" weight="/30" value={sleepValue} score={records.sleep ? pts.sleep : null} />
            <PartTile icon="restaurant" color="#FF9600" label="식사" weight="/40" value={mealValue} score={records.meals.length ? pts.meal : null} />
            <PartTile icon="happy" color="#FF6FA8" label="마음" weight="/10" value={mindValue} score={records.minds.length ? pts.mind : null} />
            <PartTile icon="flag" color="#1B7F66" label="목표" weight="/20" value={`영역 ${areas}개`} score={areas ? pts.goal : null} />
          </View>

          <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85} onPress={() => router.push('/share')}>
            <Text style={styles.shareText}>내 푸디몬 자랑하기</Text>
          </TouchableOpacity>
        </View>

        <JourneyCard />

        {/* S5-2 Trend */}
        <View style={styles.card}>
          <View style={styles.trendHeader}>
            <Text style={styles.sectionTitle}>성장점 추이</Text>
            <View style={styles.segment}>
              {RANGES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.segmentBtn, range === r && styles.segmentBtnActive]}
                  onPress={() => setRange(r)}
                  activeOpacity={0.8}>
                  <Text style={[styles.segmentText, range === r && styles.segmentTextActive]}>{r}일</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.statsRow}>
            <Stat label="평균" value={summary.average === null ? '–' : `${summary.average}점`} />
            <Stat label="최고" value={summary.best ? `${summary.best.score}점` : '–'} />
            <Stat label="기록한 날" value={`${summary.recordedDays}/${range}일`} />
          </View>

          {loading && rows.length === 0 ? (
            <ActivityIndicator style={styles.loader} color="#17765D" />
          ) : error ? (
            <Text style={styles.errorText}>기록을 불러오지 못했어요. 탭을 다시 열어 주세요.</Text>
          ) : (
            <ScoreTrendChart points={points} onOpenDay={(date) => router.push(`/day/${date}`)} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PartTile({
  icon,
  color,
  label,
  weight,
  value,
  score,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  weight: string;
  value: string;
  score: number | null;
}) {
  return (
    <View style={styles.partTile}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.partScore}>{score === null ? '–' : Math.round(score)}</Text>
      <Text style={styles.partLabel}>
        {label} <Text style={styles.partWeight}>{weight}</Text>
      </Text>
      <Text style={styles.partValue}>{value}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F8F4',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 22,
    color: '#1E293B',
    marginTop: 4,
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '800',
  },
  hero: {
    fontSize: 52,
    color: '#1E293B',
    marginVertical: 2,
    fontWeight: '900',
  },
  heroUnit: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '800',
  },
  greeting: {
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
    fontWeight: '600',
  },
  pet: {
    width: 96,
    height: 96,
  },
  partsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  partTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#E3F6EF',
    gap: 2,
  },
  partScore: {
    fontSize: 20,
    color: '#1E293B',
    fontWeight: '900',
  },
  partLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '800',
  },
  partWeight: {
    fontWeight: '600',
    color: '#94A3B8',
  },
  partValue: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  shareBtn: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#E3F6EF',
    borderWidth: 1.5,
    borderColor: '#B5E6D4',
  },
  shareText: {
    fontSize: 15,
    color: '#17765D',
    fontWeight: '900',
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '900',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#1E293B',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  loader: {
    marginVertical: 48,
  },
  errorText: {
    marginVertical: 32,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
