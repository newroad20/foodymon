import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { fetchDailyRecords } from '@/lib/gameApi';
import { toDateKey } from '@/lib/dayRollover';
import { JOURNEY_DAYS, journeyCells, journeyDay, type JourneyCellState } from '@/lib/journey';
import { petImage } from '@/constants/foodymonData';

const PER_ROW = 5;
const MILESTONES = new Set([25, 50, 75, 100]);

/** The 100 days as a winding path: shared days, rest days, today and the road ahead. */
export default function JourneyScreen() {
  const { userId, state } = useFoodyMon();
  const [shared, setShared] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDailyRecords(userId)
      .then((rows) =>
        setShared(
          new Set(
            rows
              .filter((r) => r.meal_count > 0 || r.sleep_hours !== null || r.emotion !== null)
              .map((r) => r.log_date)
          )
        )
      )
      .catch((e) => console.error('Failed to load journey days:', e));
  }, [userId]);

  const today = toDateKey(new Date());
  const cells = useMemo(
    () => (state.journeyStart ? journeyCells(state.journeyStart, today, shared) : []),
    [state.journeyStart, today, shared]
  );
  const rows = useMemo(
    () => Array.from({ length: Math.ceil(cells.length / PER_ROW) }, (_, i) => cells.slice(i * PER_ROW, (i + 1) * PER_ROW)),
    [cells]
  );

  if (!state.journeyStart) return null;
  const dayNo = Math.min(journeyDay(state.journeyStart, today), JOURNEY_DAYS);
  const sharedCount = cells.filter((c) => c.state === 'shared').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>{JOURNEY_DAYS}일 중 {dayNo}일차</Text>
        <Text style={styles.summaryText}>이야기를 들려준 날 {sharedCount}일 · 쉬어 간 날도 길의 일부예요</Text>
      </View>

      {rows.map((row, r) => (
        <View key={r}>
          {/* Every other row runs right to left, so the path winds like a trail. */}
          <View style={[styles.row, r % 2 === 1 && styles.rowReverse]}>
            <View style={styles.rowLine} />
            {row.map((c) => (
              <Node key={c.day} day={c.day} state={c.state} pet={petImage(state.level, state.equippedCostume)} />
            ))}
          </View>
          {r < rows.length - 1 && <View style={[styles.turn, r % 2 === 0 ? styles.turnRight : styles.turnLeft]} />}
        </View>
      ))}

      <View style={styles.legend}>
        <Legend color="#1B7F66" label="들려준 날" />
        <Legend color="#E8DFD3" label="쉬어 간 날" />
        <Legend color="#FFFFFF" border label="앞으로의 길" />
      </View>
    </ScrollView>
  );
}

function Node({ day, state, pet }: { day: number; state: JourneyCellState; pet: any }) {
  const label = { shared: '들려준 날', rest: '쉬어 간 날', today: '오늘', ahead: '앞으로' }[state];
  if (state === 'today') {
    return (
      <View style={styles.todayWrap} accessible accessibilityLabel={`${day}일차, 오늘`}>
        <Image source={pet} style={styles.todayPet} contentFit="contain" />
        <Text style={styles.todayText}>{day}</Text>
      </View>
    );
  }
  return (
    <View
      style={[styles.node, state === 'shared' && styles.nodeShared, state === 'rest' && styles.nodeRest]}
      accessible
      accessibilityLabel={`${day}일차, ${label}`}>
      {MILESTONES.has(day) && state === 'ahead' ? (
        <Ionicons name="star" size={16} color="#F5B700" />
      ) : (
        <Text style={[styles.nodeText, state === 'shared' && styles.nodeTextShared]}>{day}</Text>
      )}
    </View>
  );
}

function Legend({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }, border && styles.legendBorder]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const NODE = 46;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5F5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  summary: {
    padding: 16,
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  summaryTitle: {
    fontSize: 20,
    color: '#17765D',
    fontWeight: '900',
  },
  summaryText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    height: 64,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  rowLine: {
    position: 'absolute',
    left: 6 + NODE / 2,
    right: 6 + NODE / 2,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8DFD3',
  },
  turn: {
    width: 6,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#E8DFD3',
  },
  turnRight: {
    alignSelf: 'flex-end',
    marginRight: 6 + NODE / 2 - 3,
  },
  turnLeft: {
    alignSelf: 'flex-start',
    marginLeft: 6 + NODE / 2 - 3,
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  nodeShared: {
    backgroundColor: '#1B7F66',
    borderColor: '#145743',
  },
  nodeRest: {
    backgroundColor: '#E8DFD3',
    borderColor: '#D9CDBE',
  },
  nodeText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '800',
  },
  nodeTextShared: {
    color: '#FFFFFF',
  },
  todayWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7D6',
    borderWidth: 3,
    borderColor: '#F5B700',
  },
  todayPet: {
    width: 50,
    height: 50,
  },
  todayText: {
    position: 'absolute',
    bottom: -8,
    paddingHorizontal: 6,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5B700',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  legendBorder: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  legendText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
});
