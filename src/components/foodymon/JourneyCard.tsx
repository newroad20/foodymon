import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { levelsData } from '@/constants/foodymonData';
import { fetchJourney, saveReflection, type Journey } from '@/lib/gameApi';

/** The journey so far (재형 피드백 시범 종료 요약): points, stage, counts and the user's own words. */
export function JourneyCard() {
  const { userId, state } = useFoodyMon();
  const [j, setJ] = useState<Journey | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchJourney()
        .then((data) => {
          if (!active) return;
          setJ(data);
          setText(data.reflection);
        })
        .catch((e) => console.error('Failed to load journey:', e));
      return () => {
        active = false;
      };
    }, [state.growthTotal])
  );

  if (!j || j.recorded_days === 0) return null;

  const level = levelsData.find((l) => l.level === j.level);
  const save = async () => {
    setSaving(true);
    try {
      await saveReflection(userId, text.trim());
      setJ({ ...j, reflection: text.trim() });
      Alert.alert('저장했어요', '적어 준 변화는 푸디몬이 잘 간직할게.');
    } catch {
      Alert.alert('저장하지 못했어요', '네트워크를 확인하고 다시 시도해 주세요.');
    }
    setSaving(false);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>지금까지의 기록 · {j.recorded_days}일 함께했어요</Text>
      <View style={styles.row}>
        <Stat value={`${j.total}점`} label="이번 100일 성장점" />
        <Stat value={`Lv.${j.level}`} label={level?.name ?? ''} />
        <Stat value={`${j.goals_done}번`} label="작은 목표 완료" />
      </View>
      <Text style={styles.counts}>
        수면 {j.sleep_count}번 · 식사 {j.meal_count}번 · 마음 {j.mind_count}번 기록
      </Text>

      <Text style={styles.label}>내가 느낀 변화</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="기록하면서 달라진 점이 있다면 편하게 적어 줘 (선택)"
        placeholderTextColor="#94A3B8"
        maxLength={1000}
        multiline
      />
      {text.trim() !== j.reflection && (
        <TouchableOpacity style={[styles.btn, saving && styles.btnOff]} disabled={saving} onPress={save}>
          <Text style={styles.btnText}>저장하기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    gap: 10,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
  },
  title: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    color: '#17765D',
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  counts: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
    textAlign: 'center',
  },
  label: {
    marginTop: 4,
    fontSize: 13,
    color: '#475569',
    fontWeight: '800',
  },
  input: {
    minHeight: 72,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
  },
  btn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#1B7F66',
  },
  btnOff: {
    opacity: 0.5,
  },
  btnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
