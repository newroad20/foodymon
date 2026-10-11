import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { levelsData } from '@/constants/foodymonData';
import { calcScoreParts } from '@/lib/score';
import { toDateKey, hasLoggedToday } from '@/lib/dayRollover';
import { addDays, buildTrend, summarizeTrend } from '@/lib/trend';
import { fetchScoreHistory } from '@/lib/gameApi';
import { ScoreTrendChart } from '@/components/foodymon/ScoreTrendChart';

const RANGES = [7, 14, 30] as const;
type Range = (typeof RANGES)[number];

function greeting(score: number, logged: boolean) {
  if (!logged) return '아직 오늘 기록이 없어요. 하나만 체크인해 볼까요?';
  if (score >= 80) return '오늘 정말 최고였어요! 푸디몬이 쌩쌩해요 ✨';
  if (score >= 60) return '오늘도 수고했어요! 꾸준함이 멋져요 💪';
  if (score >= 40) return '무난한 하루였어요. 내일은 조금만 더 챙겨봐요!';
  return '조금 지친 하루였죠? 푹 쉬고 맛있는 거 먹어요 🍚';
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
  const parts = calcScoreParts(state);
  const levelInfo = levelsData.find((l) => l.level === state.level) ?? levelsData[2];

  const sleepValue = state.today.sleepHours === null ? '미기록' : `${state.today.sleepHours}시간`;
  const mealValue = state.today.mealCount === 0 ? '미기록' : `${state.today.mealCount}/${state.targetMeals}끼`;
  const emotionValue = state.today.emotion === null ? '미기록' : `${state.today.emotion}점`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>하루 요약</Text>

        {/* S5-1 Today's report */}
        <View style={styles.card}>
          <View style={styles.reportHeader}>
            <View style={styles.reportText}>
              <Text style={styles.cardLabel}>오늘의 건강 지수</Text>
              <Text style={styles.hero}>
                {logged ? state.currentDailyScore : '–'}
                {logged && <Text style={styles.heroUnit}>점</Text>}
              </Text>
              <Text style={styles.greeting}>{greeting(state.currentDailyScore, logged)}</Text>
            </View>
            <Image source={levelInfo.image} style={styles.pet} contentFit="contain" />
          </View>

          <View style={styles.partsRow}>
            <PartTile icon="🌙" label="수면" weight="35%" value={sleepValue} score={state.today.sleepDiff === null ? null : parts.sleepScore} />
            <PartTile icon="🍚" label="식사" weight="35%" value={mealValue} score={state.today.mealCount === 0 ? null : parts.mealScore} />
            <PartTile icon="😊" label="감정" weight="30%" value={emotionValue} score={state.today.emotion === null ? null : parts.emotionScore} />
          </View>

          {parts.multiplier > 1 && (
            <Text style={styles.bonus}>
              🔥 {state.streak}일 연속 기록 보너스 ×{parts.multiplier.toFixed(2)} 적용 중
            </Text>
          )}

          <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85} onPress={() => router.push('/share')}>
            <Text style={styles.shareText}>📸 내 푸디몬 자랑하기</Text>
          </TouchableOpacity>
        </View>

        {/* S5-2 Trend */}
        <View style={styles.card}>
          <View style={styles.trendHeader}>
            <Text style={styles.sectionTitle}>건강 지수 추이</Text>
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
            <ActivityIndicator style={styles.loader} color="#EA580C" />
          ) : error ? (
            <Text style={styles.errorText}>기록을 불러오지 못했어요. 탭을 다시 열어 주세요.</Text>
          ) : (
            <ScoreTrendChart points={points} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PartTile({
  icon,
  label,
  weight,
  value,
  score,
}: {
  icon: string;
  label: string;
  weight: string;
  value: string;
  score: number | null;
}) {
  return (
    <View style={styles.partTile}>
      <Text style={styles.partIcon}>{icon}</Text>
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
    backgroundColor: '#FFF9F0',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
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
    fontWeight: '700',
    color: '#64748B',
  },
  hero: {
    fontSize: 52,
    fontWeight: '800',
    color: '#1E293B',
    marginVertical: 2,
  },
  heroUnit: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748B',
  },
  greeting: {
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
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
    backgroundColor: '#FFF7ED',
    gap: 2,
  },
  partIcon: {
    fontSize: 20,
  },
  partScore: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  partLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  partWeight: {
    fontWeight: '500',
    color: '#94A3B8',
  },
  partValue: {
    fontSize: 11,
    color: '#64748B',
  },
  bonus: {
    marginTop: 12,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  shareBtn: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  shareText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#C2410C',
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
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
    fontWeight: '700',
    color: '#94A3B8',
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
    fontWeight: '800',
    color: '#334155',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  loader: {
    marginVertical: 48,
  },
  errorText: {
    marginVertical: 32,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 13,
  },
});
