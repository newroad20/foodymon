import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { emotionOptions } from '@/constants/foodymonData';

interface EmotionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function EmotionModal({ visible, onClose }: EmotionModalProps) {
  const { logEmotion } = useFoodyMon();

  const emotions = emotionOptions;

  const handleSelect = async (score: number, label: string) => {
    await logEmotion(score);
    let msg = '오늘의 마음 날씨를 기록했어. 알려 줘서 고마워.';
    if (score >= 80) msg = '맑은 마음 날씨가 숲까지 전해졌어!';
    else if (score <= 40) msg = '흐린 날도 알려 줘서 고마워. 힘내지 않아도 돼, 내가 옆에 있을게.';

    Alert.alert(label, msg);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>감정 · 마음 날씨</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            오늘 하루 마음의 날씨는 어떤가요?
          </Text>

          <View style={styles.list}>
            {emotions.map((item) => (
              <TouchableOpacity
                key={item.score}
                style={styles.emotionCard}
                activeOpacity={0.7}
                onPress={() => handleSelect(item.score, item.label)}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <View style={styles.info}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.desc}>{item.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 20,
    lineHeight: 20,
    fontWeight: '600',
  },
  list: {
    gap: 12,
    marginBottom: 12,
  },
  emotionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  emoji: {
    fontSize: 32,
    fontWeight: '600',
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 2,
    fontWeight: '800',
  },
  desc: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});
