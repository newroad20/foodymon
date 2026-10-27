import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { mindEmotions, mindSituations } from '@/constants/foodymonData';
import { MAX_MIND_RECORDS, type Emotion, type Situation } from '@/lib/growth';
import { emotionFollowUp } from '@/lib/followUp';

interface EmotionModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Mind check-in: a feeling (all count the same), then optionally what happened. Three a day. */
export function EmotionModal({ visible, onClose }: EmotionModalProps) {
  const { state, addMind } = useFoodyMon();
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [situation, setSituation] = useState<Situation | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const used = state.records.minds.length;
  const full = used >= MAX_MIND_RECORDS;

  useEffect(() => {
    if (!visible) return;
    setEmotion(null);
    setSituation(null);
    setNote('');
  }, [visible]);

  const save = async (e: Emotion) => {
    if (saving) return;
    setSaving(true);
    const ok = await addMind({ emotion: e, situation: e === 'no_answer' ? null : situation, note: note.trim() });
    setSaving(false);
    onClose();
    Alert.alert(
      '마음 날씨',
      ok ? '알려 줘서 고마워. 어떤 마음이든 다 소중해.' : `오늘 마음 기록은 ${MAX_MIND_RECORDS}번까지 할 수 있어요.`
    );
  };

  const pickEmotion = (e: Emotion) => {
    if (e === 'no_answer') save(e);
    else setEmotion(e);
  };

  const chosen = mindEmotions.find((m) => m.id === emotion);
  const followUp = emotion ? emotionFollowUp(emotion, situation) : null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>감정 · 마음 날씨</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="닫기">
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => {
              onClose();
              router.push('/help');
            }}
            accessibilityRole="link">
            <Text style={styles.helpLink}>마음이 많이 힘들다면 → 도움 받기</Text>
          </TouchableOpacity>

          {full ? (
            <Text style={styles.subtitle}>
              오늘은 마음을 {MAX_MIND_RECORDS}번 나눠 줬어. 내일 또 들려줘! 이야기가 더 있으면 기록장을 열어 봐도 좋아.
            </Text>
          ) : !chosen ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.subtitle}>
                지금 마음의 날씨는 어때? 어떤 마음이든 정답은 없어. (오늘 {used}/{MAX_MIND_RECORDS})
              </Text>
              <View style={styles.list}>
                {mindEmotions.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.emotionCard}
                    activeOpacity={0.7}
                    disabled={saving}
                    onPress={() => pickEmotion(m.id)}>
                    <Text style={styles.emoji}>{m.emoji}</Text>
                    <Text style={styles.label}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.subtitle}>
                {chosen.emoji} {chosen.label}
              </Text>
              <View style={styles.followUpBox}>
                <Text style={styles.followUpEyebrow}>푸디몬의 다음 질문</Text>
                <Text style={styles.followUpQuestion}>{followUp?.question}</Text>
              </View>
              <View style={styles.chipRow}>
                {mindSituations.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.chip, situation === s.id && styles.chipActive]}
                    onPress={() => setSituation(situation === s.id ? null : s.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: situation === s.id }}>
                    <Text style={[styles.chipText, situation === s.id && styles.chipTextActive]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder={followUp?.placeholder}
                placeholderTextColor="#94A3B8"
                value={note}
                onChangeText={setNote}
                maxLength={500}
                multiline
              />
              <TouchableOpacity
                style={[styles.primaryBtn, saving && styles.primaryBtnOff]}
                disabled={saving}
                onPress={() => save(chosen.id)}>
                <Text style={styles.primaryBtnText}>마음 기록하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => setEmotion(null)}>
                <Text style={styles.backText}>← 마음 다시 고르기</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
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
  helpLink: {
    fontSize: 13,
    color: '#17765D',
    fontWeight: '800',
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  followUpBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FCE7F3',
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  followUpEyebrow: {
    marginBottom: 4,
    fontSize: 11,
    color: '#BE185D',
    fontWeight: '900',
  },
  followUpQuestion: {
    fontSize: 14,
    color: '#831843',
    fontWeight: '800',
    lineHeight: 20,
  },
  list: {
    gap: 10,
    marginBottom: 12,
  },
  emotionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  emoji: {
    fontSize: 28,
  },
  label: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipActive: {
    borderColor: '#BE185D',
    backgroundColor: '#FCE7F3',
  },
  chipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '800',
  },
  chipTextActive: {
    color: '#BE185D',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#C2185B',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnOff: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
});
