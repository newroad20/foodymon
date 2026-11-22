import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORY_COLORS as C } from '@/constants/theme';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { mealStatuses, mindEmotions, mindSituations } from '@/constants/foodymonData';
import { MEAL_SLOTS, sleepMinutes } from '@/lib/growth';
import { fetchDay, type DayDetail, type GoalKind } from '@/lib/gameApi';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const GOAL_TITLES: Record<GoalKind, string> = {
  more_meal: '식사 기회 한 번 더',
  earlier_bed: '일찍 잠들기',
  mind_reason: '감정의 이유 적기',
};

const titleFor = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return `${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
};

/** One day's diary: sleep, each meal slot, mind records, the small goal and where the points came from. */
export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { userId } = useFoodyMon();
  const [day, setDay] = useState<DayDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!date) return;
    fetchDay(userId, date)
      .then(setDay)
      .catch((e) => {
        console.error('Failed to load day:', e);
        setError(true);
      });
  }, [userId, date]);

  const header = <Stack.Screen options={{ title: date ? titleFor(date) : '하루 기록' }} />;

  if (error) {
    return (
      <View style={styles.center}>
        {header}
        <Text style={styles.empty}>기록을 불러오지 못했어요. 다시 열어 주세요.</Text>
      </View>
    );
  }
  if (!day) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color="#1B7F66" />
      </View>
    );
  }

  const { records, points, photoUrls } = day;
  const min = records.sleep ? sleepMinutes(records.sleep) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {header}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>이날의 성장점 +{points.total}점</Text>
        <View style={styles.pointsRow}>
          <Point label="수면" value={points.sleep} max={30} />
          <Point label="식사" value={points.meal} max={40} />
          <Point label="마음" value={points.mind} max={10} />
          <Point label="목표" value={points.goal} max={20} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="moon" size={16} color={C.sleep.ink} /> 수면
        </Text>
        {records.sleep ? (
          <Text style={styles.line}>
            {records.sleep.bedTime} 잠들고 {records.sleep.wakeTime} 일어남 · {Math.floor(min / 60)}시간
            {min % 60 ? ` ${min % 60}분` : ''}
          </Text>
        ) : (
          <Text style={styles.muted}>기록 없음</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="restaurant" size={16} color={C.meal.ink} /> 식사
        </Text>
        {MEAL_SLOTS.map((name, slot) => {
          const m = records.meals.find((r) => r.slot === slot);
          return (
            <View key={name} style={styles.mealRow}>
              <Text style={styles.slot}>{name}</Text>
              <View style={styles.mealBody}>
                {m ? (
                  <>
                    <Text style={styles.line}>
                      {mealStatuses.find((s) => s.id === m.status)?.label}
                      {m.menu ? ` · ${m.menu}` : ''}
                    </Text>
                    {m.feeling ? <Text style={styles.quote}>"{m.feeling}"</Text> : null}
                    {m.memo ? <Text style={styles.muted}>{m.memo}</Text> : null}
                    {m.photoPath && photoUrls[m.photoPath] ? (
                      <Image source={{ uri: photoUrls[m.photoPath] }} style={styles.photo} contentFit="cover" />
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.muted}>–</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="happy" size={16} color={C.mind.ink} /> 마음
        </Text>
        {records.minds.length === 0 ? (
          <Text style={styles.muted}>기록 없음</Text>
        ) : (
          records.minds.map((r, i) => {
            const e = mindEmotions.find((m) => m.id === r.emotion);
            const s = mindSituations.find((m) => m.id === r.situation);
            return (
              <View key={i} style={styles.mind}>
                <Text style={styles.line}>
                  {e?.label}
                  {s ? ` · ${s.label}` : ''}
                </Text>
                {r.note ? <Text style={styles.quote}>"{r.note}"</Text> : null}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="flag" size={16} color={C.goal.ink} /> 작은 목표
        </Text>
        <Text style={styles.line}>
          {points.small_goal
            ? `${GOAL_TITLES[points.small_goal.kind]}${points.small_goal.kind === 'earlier_bed' ? ` (${points.small_goal.size}분)` : ''}${points.small_goal.held ? ' · 보류' : ''}`
            : '관찰하는 날 (세 영역 중 2개 이상 기록하기)'}
          {` · +${points.goal}점`}
        </Text>
      </View>
    </ScrollView>
  );
}

function Point({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <View style={styles.point}>
      <Text style={styles.pointValue}>{value}</Text>
      <Text style={styles.pointLabel}>
        {label} /{max}
      </Text>
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
    gap: 12,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F8F4',
  },
  empty: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '900',
  },
  pointsRow: {
    flexDirection: 'row',
  },
  point: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  pointValue: {
    fontSize: 20,
    color: '#17765D',
    fontWeight: '900',
  },
  pointLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  line: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '700',
    lineHeight: 20,
  },
  muted: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  quote: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    lineHeight: 19,
  },
  mealRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  slot: {
    width: 64,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '800',
  },
  mealBody: {
    flex: 1,
    gap: 4,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginTop: 4,
  },
  mind: {
    gap: 2,
    paddingVertical: 4,
  },
});
