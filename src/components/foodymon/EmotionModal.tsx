import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { HintInput } from '@/components/HintInput';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { mindEmotions, mindSituations, petStateArt } from '@/constants/foodymonData';
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
  // The feeling shown big on the first step; starts at '보통' so no answer is suggested.
  const [focus, setFocus] = useState(2);
  const [saving, setSaving] = useState(false);

  const used = state.records.minds.length;
  // Faces drawn on the user's own FoodyMon; the emoji is the fallback for stages without them.
  const faces = (petStateArt[state.level] ?? petStateArt[3]).face;
  const full = used >= MAX_MIND_RECORDS;

  useEffect(() => {
    if (!visible) return;
    setEmotion(null);
    setSituation(null);
    setNote('');
    setFocus(2);
  }, [visible]);

  const save = async (e: Emotion) => {
    if (saving) return;
    setSaving(true);
    const result = await addMind({ emotion: e, situation: e === 'no_answer' ? null : situation, note: note.trim() });
    setSaving(false);
    if (result === 'failed') {
      Alert.alert('저장하지 못했어요', '인터넷 연결을 확인하고 다시 눌러 주세요. 적은 내용은 그대로 있어요.');
      return;
    }
    onClose();
    Alert.alert(
      '마음 날씨',
      result === 'saved' ? '알려 줘서 고마워. 어떤 마음이든 다 소중해.' : `오늘 마음 기록은 ${MAX_MIND_RECORDS}번까지 할 수 있어요.`
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
            <Text style={styles.title}>마음 기록</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="닫기">
              <Ionicons name="close" size={22} color="#A0AEC0" />
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
            <View>
              <Text style={styles.subtitle}>
                지금 마음의 날씨는 어때? 어떤 마음이든 정답은 없어. (오늘 {used}/{MAX_MIND_RECORDS})
              </Text>
              <View style={styles.pickerCard}>
                <TouchableOpacity
                  style={styles.arrow}
                  onPress={() => setFocus((focus + mindEmotions.length - 1) % mindEmotions.length)}
                  accessibilityLabel="이전 마음">
                  <Ionicons name="chevron-back" size={26} color="#64748B" />
                </TouchableOpacity>
                <View style={styles.pickerCenter} accessibilityLiveRegion="polite">
                  <Image source={faces[mindEmotions[focus].id]} style={styles.bigFace} contentFit="contain" />
                  <Text style={styles.bigLabel}>{mindEmotions[focus].label}</Text>
                </View>
                <TouchableOpacity
                  style={styles.arrow}
                  onPress={() => setFocus((focus + 1) % mindEmotions.length)}
                  accessibilityLabel="다음 마음">
                  <Ionicons name="chevron-forward" size={26} color="#64748B" />
                </TouchableOpacity>
              </View>
              <View style={styles.dotRow}>
                {mindEmotions.map((m, i) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.dot, i === focus && styles.dotActive]}
                    onPress={() => setFocus(i)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: i === focus }}
                    accessibilityLabel={m.label}>
                    <Image source={faces[m.id]} style={styles.dotFace} contentFit="contain" />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, saving && styles.primaryBtnOff]}
                disabled={saving}
                onPress={() => pickEmotion(mindEmotions[focus].id)}>
                <Text style={styles.primaryBtnText}>이 마음이야</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
              <Text style={styles.subtitle}>
                {chosen.label}
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
              <HintInput
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
    backgroundColor: '#E3F6EF',
    borderWidth: 1,
    borderColor: '#B5E6D4',
  },
  followUpEyebrow: {
    marginBottom: 4,
    fontSize: 11,
    color: '#17765D',
    fontWeight: '900',
  },
  followUpQuestion: {
    fontSize: 14,
    color: '#2E594A',
    fontWeight: '800',
    lineHeight: 20,
  },
  // One neutral colour for every feeling: no answer looks better than another.
  pickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 22,
    paddingHorizontal: 8,
    borderRadius: 24,
    backgroundColor: '#F8F5F0',
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#EDE6DC',
  },
  arrow: {
    padding: 10,
  },
  pickerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  bigLabel: {
    fontSize: 20,
    color: '#1E293B',
    fontWeight: '900',
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  bigFace: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dotActive: {
    borderColor: '#1B7F66',
    backgroundColor: '#E3F6EF',
  },
  dotFace: {
    width: 44,
    height: 44,
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
    borderColor: '#1B7F66',
    backgroundColor: '#E3F6EF',
  },
  chipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '800',
  },
  chipTextActive: {
    color: '#1B7F66',
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
    backgroundColor: '#1B7F66',
    borderWidth: 2,
    borderColor: '#125A48',
    borderBottomWidth: 4,
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
