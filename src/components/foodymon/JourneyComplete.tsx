import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { fetchJourney, type Journey } from '@/lib/gameApi';

/** Shown on home once the 100 days are over: look back, then choose to start again. */
export function JourneyComplete() {
  const { startNewJourney } = useFoodyMon();
  const [j, setJ] = useState<Journey | null>(null);

  useEffect(() => {
    fetchJourney().then(setJ).catch((e) => console.error('Failed to load journey:', e));
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>100일을 함께 걸었어</Text>
      <Text style={styles.body}>쉬어 간 날도 모두 이 여정의 일부야. 고마워.</Text>
      {j && (
        <Text style={styles.counts}>
          {j.recorded_days}일 동안 들려줬어{'\n'}수면 {j.sleep_count}번 · 식사 {j.meal_count}번 · 마음 {j.mind_count}번
        </Text>
      )}
      <TouchableOpacity style={styles.primary} onPress={startNewJourney} accessibilityRole="button">
        <Text style={styles.primaryText}>새 100일 시작하기</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => router.push('/summary')} accessibilityRole="link">
        <Text style={styles.secondaryText}>지난 기록 돌아보기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#B5E6D4',
    gap: 8,
  },
  title: {
    fontSize: 20,
    color: '#1B7F66',
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '700',
    textAlign: 'center',
  },
  counts: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 21,
  },
  primary: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#1B7F66',
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  secondary: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '800',
  },
});
