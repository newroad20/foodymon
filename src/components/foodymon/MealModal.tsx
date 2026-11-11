import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { HintInput } from '@/components/HintInput';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { mealStatuses, quizzesData } from '@/constants/foodymonData';
import { MEAL_SLOTS, type MealStatus } from '@/lib/growth';
import { mealSlotForHour } from '@/lib/mealType';
import { mealFollowUp } from '@/lib/followUp';

interface MealModalProps {
  visible: boolean;
  onClose: () => void;
}

const EATEN: MealStatus[] = ['ate', 'much', 'little', 'hard'];

/** Meal check-in: one of six slots, how it went, and optional menu, feeling, photo and memo. */
export function MealModal({ visible, onClose }: MealModalProps) {
  const { state, saveMeal } = useFoodyMon();
  const [slot, setSlot] = useState(() => mealSlotForHour(new Date().getHours()));
  const [status, setStatus] = useState<MealStatus | null>(null);
  const [menu, setMenu] = useState('');
  const [feeling, setFeeling] = useState('');
  const [memo, setMemo] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [quiz, setQuiz] = useState(() => quizzesData[0]);
  const [saving, setSaving] = useState(false);

  const saved = state.records.meals.find((m) => m.slot === slot);

  // Fill the form from what's already saved for the slot, or start blank.
  const loadSlot = (s: number) => {
    const r = state.records.meals.find((m) => m.slot === s);
    setSlot(s);
    setStatus(r?.status ?? null);
    setMenu(r?.menu ?? '');
    setFeeling(r?.feeling ?? '');
    setMemo(r?.memo ?? '');
    setPhotoUri(null);
  };

  useEffect(() => {
    if (!visible) return;
    loadSlot(mealSlotForHour(new Date().getHours()));
    setQuiz(quizzesData[Math.floor(Math.random() * quizzesData.length)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pickPhoto = async (fromCamera: boolean) => {
    try {
      if (fromCamera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
        Alert.alert('카메라를 쓸 수 없어요', '휴대폰 설정에서 카메라 접근을 허용해 주세요.');
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      };
      const res = fromCamera
        ? // On the web, back camera sets capture="environment", which phones open as the camera.
          await ImagePicker.launchCameraAsync({ ...options, cameraType: ImagePicker.CameraType.back })
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!res.canceled) setPhotoUri(res.assets[0].uri);
    } catch {
      Alert.alert('사진을 가져오지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const handleSave = async () => {
    if (!status) {
      Alert.alert('알림', '어땠는지 하나만 골라 줘.');
      return;
    }
    if (saving) return;
    setSaving(true);
    const { saved, photoFailed } = await saveMeal(
      { slot, status, menu: menu.trim(), feeling: feeling.trim(), memo: memo.trim() },
      photoUri
    );
    setSaving(false);
    if (!saved) {
      Alert.alert('저장하지 못했어요', '인터넷 연결을 확인하고 다시 눌러 주세요. 적은 내용은 그대로 있어요.');
      return;
    }
    onClose();
    Alert.alert(
      '감각 나누기',
      photoFailed
        ? '기록은 남겼는데 사진은 올리지 못했어. 인터넷을 확인해 줘!'
        : EATEN.includes(status)
          ? '알아차린 걸 나눠 줘서 고마워! 푸디몬이 냠냠 먹었어.'
          : '알려 줘서 고마워. 어떤 끼니든 소중한 기록이야.'
    );
  };

  const eaten = status !== null && EATEN.includes(status);
  const followUp = status ? mealFollowUp(status) : null;

  const pickStatus = (next: MealStatus) => {
    setStatus(next);
    if (!EATEN.includes(next)) {
      setMenu('');
      setFeeling('');
      setPhotoUri(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>식사 기록</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="닫기">
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>언제 먹었어?</Text>
            <View style={styles.chipRow} accessibilityRole="radiogroup">
              {MEAL_SLOTS.map((name, i) => {
                const done = state.records.meals.some((m) => m.slot === i);
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.chip, slot === i && styles.chipActive]}
                    onPress={() => loadSlot(i)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: slot === i }}
                    accessibilityLabel={`${name}${done ? ', 기록함' : ''}`}>
                    {done && <Ionicons name="checkmark-circle" size={14} color="#1B7F66" />}
                    <Text style={[styles.chipText, slot === i && styles.chipTextActive]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>어땠어?</Text>
            <View style={styles.chipRow} accessibilityRole="radiogroup">
              {mealStatuses.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, status === s.id && styles.chipActive]}
                  onPress={() => pickStatus(s.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: status === s.id }}>
                  <Text style={[styles.chipText, status === s.id && styles.chipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Up here so it's seen without scrolling; a meal that wasn't eaten clears the photo. */}
            {(status === null || eaten) && (
              <>
                <Text style={styles.label}>사진</Text>
                {photoUri ? (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => setPhotoUri(null)}
                      accessibilityLabel="사진 빼기">
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoRow}>
                    <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto(true)}>
                      <Ionicons name="camera" size={18} color="#1B7F66" />
                      <Text style={styles.photoBtnText}>{saved?.photoPath ? '다시 찍기' : '지금 찍기'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto(false)}>
                      <Ionicons name="images" size={18} color="#1B7F66" />
                      <Text style={styles.photoBtnText}>갤러리</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {eaten && (
              <>
                <Text style={styles.label}>무엇을 먹었어?</Text>
                <HintInput
                  style={styles.input}
                  placeholder="예: 김밥, 우유"
                  placeholderTextColor="#94A3B8"
                  value={menu}
                  onChangeText={setMenu}
                  maxLength={100}
                />

                <Text style={styles.label}>감각 나누기</Text>
                <View style={styles.quizBox}>
                  <Text style={styles.quizQuestion}>{quiz.q}</Text>
                </View>
                <HintInput
                  style={[styles.input, styles.multiline]}
                  placeholder="떠오르는 대로 편하게"
                  placeholderTextColor="#94A3B8"
                  value={feeling}
                  onChangeText={setFeeling}
                  maxLength={300}
                  multiline
                />

              </>
            )}

            {status !== null && (
              <>
                <Text style={styles.label}>푸디몬의 다음 질문</Text>
                <View style={styles.quizBox}>
                  <Text style={styles.quizQuestion}>{followUp?.question}</Text>
                </View>
                <HintInput
                  style={[styles.input, styles.multiline]}
                  placeholder={followUp?.placeholder}
                  placeholderTextColor="#94A3B8"
                  value={memo}
                  onChangeText={setMemo}
                  maxLength={300}
                  multiline
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, (saving || !status) && styles.primaryBtnOff]}
              onPress={handleSave}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {saved ? `${MEAL_SLOTS[slot]} 기록 고치기` : `${MEAL_SLOTS[slot]} 기록하기`}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  label: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    color: '#17765D',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
    backgroundColor: '#F8FAFC',
  },
  multiline: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  quizBox: {
    backgroundColor: '#E3F6EF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  quizQuestion: {
    fontSize: 14,
    color: '#17765D',
    fontWeight: '800',
    lineHeight: 20,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#9FD8C5',
    backgroundColor: '#F4FBF8',
  },
  photoBtnText: {
    fontSize: 14,
    color: '#17765D',
    fontWeight: '800',
  },
  photoPreview: {
    alignSelf: 'center',
  },
  photo: {
    width: 140,
    height: 140,
    borderRadius: 16,
  },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    marginTop: 20,
    marginBottom: 8,
    backgroundColor: '#1B7F66',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#125A48',
  },
  primaryBtnOff: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
