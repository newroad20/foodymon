import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';

interface SleepModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SleepModal({ visible, onClose }: SleepModalProps) {
  const { state, logSleep } = useFoodyMon();
  const [selectedHours, setSelectedHours] = useState(state.targetSleep || 7);

  const hourOptions = [4, 5, 6, 7, 8, 9, 10, 11];

  const handleSave = async () => {
    await logSleep(selectedHours);
    const diff = Math.abs(state.targetSleep - selectedHours);
    let msg = '수면 기록이 완료되었습니다! ✨';
    if (diff <= 1) msg = '푹 주무셨네요! 푸디몬도 활력이 넘쳐요! ✨';
    else if (diff >= 3) msg = '수면이 불규칙해요. 푸디몬이 조금 피곤해해요 🥱';

    Alert.alert('수면 체크인', msg);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>수면 체크인 🌙</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            어젯밤 총 몇 시간 동안 깊은 잠을 주무셨나요?
          </Text>

          {/* Target Sleep Notice */}
          <View style={styles.targetBanner}>
            <Text style={styles.targetBannerText}>
              🎯 마스터의 목표 수면: <Text style={styles.bold}>{state.targetSleep}시간</Text>
            </Text>
          </View>

          {/* Hour Selector Grid */}
          <View style={styles.grid}>
            {hourOptions.map((h) => {
              const isSelected = selectedHours === h;
              return (
                <TouchableOpacity
                  key={h}
                  style={[styles.hourCard, isSelected && styles.hourCardSelected]}
                  onPress={() => setSelectedHours(h)}>
                  <Text style={[styles.hourText, isSelected && styles.hourTextSelected]}>
                    {h}시간
                  </Text>
                  {h === state.targetSleep && (
                    <Text style={styles.targetPill}>목표</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
            <Text style={styles.primaryBtnText}>{selectedHours}시간 기록 완료 ✨</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3748',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#A0AEC0',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
    lineHeight: 20,
  },
  targetBanner: {
    backgroundColor: '#EDE9FE',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  targetBannerText: {
    fontSize: 14,
    color: '#6D28D9',
  },
  bold: {
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  hourCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hourCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3E8FF',
  },
  hourText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  hourTextSelected: {
    color: '#7C3AED',
  },
  targetPill: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7C3AED',
    backgroundColor: '#DDD6FE',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
