import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORY_COLORS as C } from '@/constants/categoryColors';
import { BACKFILL_COST, emotionOptions } from '@/constants/foodymonData';

const SLEEP_CHOICES = [4, 5, 6, 7, 8, 9, 10];

const formatDay = (key: string) => {
  const [, m, d] = key.split('-').map(Number);
  return `${m}월 ${d}일`;
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** S25: fill in yesterday's check-ins for jelly to keep the streak. */
export function BackfillModal({ visible, onClose }: Props) {
  const { state, backfillYesterday } = useFoodyMon();
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [mealCount, setMealCount] = useState(0);
  const [emotion, setEmotion] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSleepHours(null);
      setMealCount(0);
      setEmotion(null);
    }
  }, [visible]);

  if (!state.backfill) return null;

  const mealChoices = Array.from({ length: state.targetMeals + 1 }, (_, i) => i);
  const hasInput = sleepHours !== null || mealCount > 0 || emotion !== null;
  const enoughJelly = state.currency >= BACKFILL_COST;

  const handleSubmit = async () => {
    setSaving(true);
    const res = await backfillYesterday({ sleepHours, mealCount, emotion });
    setSaving(false);
    Alert.alert(res.success ? '어제 기록을 남겼어요' : '기록을 남기지 못했어요', res.message);
    if (res.success) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              <Ionicons name="calendar" size={18} color="#1B7F66" /> {formatDay(state.backfill.date)} 기록 남기기</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="닫기" hitSlop={8}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Text style={styles.subtitle}>
              어제 기억나는 것만 골라도 돼요. 기록을 남기면 끊긴 연속 기록이 이어지고, 어제 쓴 방패도 돌려받아요.
            </Text>

            <Text style={styles.label}>
              <Ionicons name="moon" size={15} color={C.sleep.ink} /> 어제 잔 시간
            </Text>
            <View style={styles.chipRow}>
              {SLEEP_CHOICES.map((h) => (
                <Chip
                  key={h}
                  label={`${h}시간`}
                  active={sleepHours === h}
                  onPress={() => setSleepHours(sleepHours === h ? null : h)}
                />
              ))}
            </View>

            <Text style={styles.label}>
              <Ionicons name="restaurant" size={15} color={C.meal.ink} /> 어제 먹은 끼니
            </Text>
            <View style={styles.chipRow}>
              {mealChoices.map((m) => (
                <Chip key={m} label={`${m}끼`} active={mealCount === m} onPress={() => setMealCount(m)} />
              ))}
            </View>

            <Text style={styles.label}>
              <Ionicons name="happy" size={15} color={C.mind.ink} /> 어제의 기분
            </Text>
            <View style={styles.chipRow}>
              {emotionOptions.map((e) => (
                <Chip
                  key={e.score}
                  label={e.label}
                  active={emotion === e.score}
                  onPress={() => setEmotion(emotion === e.score ? null : e.score)}
                />
              ))}
            </View>
          </ScrollView>

          <Text style={styles.cost}>
            기록 비용 <Ionicons name="water" size={13} color="#1B7F66" /> {BACKFILL_COST} · 보유{' '}
            <Ionicons name="water" size={13} color="#1B7F66" /> {state.currency}
          </Text>
          <TouchableOpacity
            style={[styles.submitBtn, (!hasInput || !enoughJelly || saving) && styles.submitBtnDisabled]}
            activeOpacity={0.85}
            disabled={!hasInput || !enoughJelly || saving}
            onPress={handleSubmit}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>
                {enoughJelly ? `젤리 ${BACKFILL_COST}개로 기록 남기기` : '젤리가 부족해요'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} activeOpacity={0.8} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    color: '#2D3748',
    fontWeight: '900',
  },
  closeBtn: {
    padding: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
    fontWeight: '900',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipActive: {
    borderColor: '#1B7F66',
    backgroundColor: '#E3F6EF',
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '800',
  },
  chipTextActive: {
    color: '#17765D',
  },
  cost: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: 10,
    backgroundColor: '#1B7F66',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#125A48',
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
