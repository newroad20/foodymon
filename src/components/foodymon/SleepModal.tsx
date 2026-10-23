import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { sleepMinutes } from '@/lib/growth';

interface SleepModalProps {
  visible: boolean;
  onClose: () => void;
}

const STEP = 15;

const shift = (hhmm: string, delta: number) => {
  const [h, m] = hhmm.split(':').map(Number);
  const t = (((h * 60 + m + delta) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

const formatTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(m).padStart(2, '0')}`;
};

const formatDuration = (min: number) => `${Math.floor(min / 60)}시간${min % 60 ? ` ${min % 60}분` : ''}`;

/** Sleep check-in: bed and wake times; the duration is worked out from them. */
export function SleepModal({ visible, onClose }: SleepModalProps) {
  const { state, saveSleep } = useFoodyMon();
  const saved = state.records.sleep;
  const [bedTime, setBedTime] = useState(saved?.bedTime ?? '23:00');
  const [wakeTime, setWakeTime] = useState(saved?.wakeTime ?? '07:00');

  useEffect(() => {
    if (!visible) return;
    setBedTime(saved?.bedTime ?? '23:00');
    setWakeTime(saved?.wakeTime ?? '07:00');
  }, [visible, saved]);

  const minutes = sleepMinutes({ bedTime, wakeTime });
  const age = state.birthYear ? new Date().getFullYear() - state.birthYear : null;
  const recommended = age !== null && age <= 12 ? '9~12시간' : '8~10시간';
  const band = age !== null && age <= 12 ? '6~12세' : '13~18세';

  const handleSave = async () => {
    await saveSleep(bedTime, wakeTime);
    Alert.alert('숲의 밤', saved ? '수면 기록을 고쳤어. 점수도 새 시간으로 다시 계산했어.' : '잠 이야기 고마워. 숲에도 고요한 밤이 왔어.');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>수면 · 숲의 밤</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="닫기">
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>어젯밤 언제 잠들고 언제 일어났어?</Text>

          <TimeStepper label="잠든 시각" icon="moon" value={bedTime} onChange={setBedTime} />
          <TimeStepper label="일어난 시각" icon="sunny" value={wakeTime} onChange={setWakeTime} />

          <View style={styles.result}>
            <Text style={styles.resultLabel}>잔 시간</Text>
            <Text style={styles.resultValue}>{formatDuration(minutes)}</Text>
          </View>
          <Text style={styles.note}>
            {band} 권장 수면은 {recommended}이에요.{age === null ? ' (마이 탭에서 태어난 연도를 넣으면 나이에 맞춰 알려 줘요)' : ''}
          </Text>
          {saved && <Text style={styles.note}>오늘 이미 기록했어요. 고치면 새 시간으로 다시 계산해요.</Text>}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
            <Text style={styles.primaryBtnText}>{saved ? '수면 기록 고치기' : '수면 기록하기'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function TimeStepper({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: 'moon' | 'sunny';
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Ionicons name={icon} size={20} color="#7C3AED" />
      <Text style={styles.stepperLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => onChange(shift(value, -STEP))}
        accessibilityLabel={`${label} 15분 앞으로`}>
        <Ionicons name="remove" size={20} color="#334155" />
      </TouchableOpacity>
      <Text style={styles.time}>{formatTime(value)}</Text>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => onChange(shift(value, STEP))}
        accessibilityLabel={`${label} 15분 뒤로`}>
        <Ionicons name="add" size={20} color="#334155" />
      </TouchableOpacity>
    </View>
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
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    color: '#2D3748',
    fontWeight: '900',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#A0AEC0',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
  },
  stepperLabel: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    fontWeight: '800',
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    minWidth: 86,
    textAlign: 'center',
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  result: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 14,
    padding: 14,
  },
  resultLabel: {
    fontSize: 14,
    color: '#6D28D9',
    fontWeight: '800',
  },
  resultValue: {
    fontSize: 18,
    color: '#6D28D9',
    fontWeight: '900',
  },
  note: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
