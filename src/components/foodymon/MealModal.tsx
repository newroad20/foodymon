import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { quizzesData } from '@/constants/foodymonData';
import { MEAL_TYPES, MealType, mealTypeForHour } from '@/lib/mealType';

interface MealModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MealModal({ visible, onClose }: MealModalProps) {
  const { logMeal, skipMeal } = useFoodyMon();
  const [step, setStep] = useState<1 | 2>(1);
  const [currentQuiz, setCurrentQuiz] = useState(() => quizzesData[0]);
  const [textAnswer, setTextAnswer] = useState('');
  const [yesNoAnswer, setYesNoAnswer] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>(() => mealTypeForHour(new Date().getHours()));
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pick new random quiz when opening
  React.useEffect(() => {
    if (visible) {
      setStep(1);
      setTextAnswer('');
      setYesNoAnswer(null);
      setMealType(mealTypeForHour(new Date().getHours()));
      setPhotoUri(null);
      const randomIndex = Math.floor(Math.random() * quizzesData.length);
      setCurrentQuiz(quizzesData[randomIndex]);
    }
  }, [visible]);

  const handleNextStep = () => {
    if (currentQuiz.type === 'yesno') {
      if (!yesNoAnswer) {
        Alert.alert('알림', '편하게 하나 골라 줘.');
        return;
      }
    } else {
      if (textAnswer.trim().length < 2) {
        Alert.alert('알림', '두 글자만 더 적어 줄래?');
        return;
      }
      if (currentQuiz.type === 'words3') {
        const words = textAnswer.trim().split(/\s+/).filter((w) => w.length > 0);
        if (words.length < 3) {
          Alert.alert('알림', '단어 세 개로 적어 줘. (띄어쓰기로 구분)');
          return;
        }
      }
    }
    setStep(2);
  };

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
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!res.canceled) setPhotoUri(res.assets[0].uri);
    } catch {
      Alert.alert('사진을 가져오지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const handleSelectPortion = async (portion: number) => {
    if (saving) return;
    const finalAnswer =
      currentQuiz.type === 'yesno' ? (yesNoAnswer || '') : textAnswer.trim();
    setSaving(true);
    const { photoFailed } = await logMeal(portion, finalAnswer, mealType, photoUri);
    setSaving(false);
    Alert.alert(
      '감각 나누기',
      photoFailed
        ? '기록은 남겼는데 사진은 올리지 못했어. 인터넷을 확인해 줘!'
        : '알아차린 걸 나눠 줘서 고마워! 푸디몬이 냠냠 먹었어.'
    );
    onClose();
  };

  const handleSkip = () => {
    Alert.alert(
      '이번 끼니',
      `못 먹은 것도 소중한 기록이야. ${mealType}은 못 먹은 걸로 남겨 둘까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '남기기',
          style: 'destructive',
          onPress: async () => {
            await skipMeal(mealType);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>식사 · 감각 나누기</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {step === 1 ? (
            /* Step 1: Mindful Eating Quiz */
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.mealTypeRow} accessibilityRole="radiogroup">
                {MEAL_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.mealTypeChip, mealType === t && styles.mealTypeChipActive]}
                    onPress={() => setMealType(t)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: mealType === t }}>
                    <Text style={[styles.mealTypeText, mealType === t && styles.mealTypeTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.subtitle}>
                음식을 마주하고 내 몸의 감각에 귀 기울여 보세요 ✨
              </Text>

              <View style={styles.quizBox}>
                <Text style={styles.quizQuestion}>{currentQuiz.q}</Text>
              </View>

              {currentQuiz.type === 'yesno' ? (
                <View style={styles.yesNoContainer}>
                  <TouchableOpacity
                    style={[
                      styles.choiceBtn,
                      yesNoAnswer === '응, 그랬어' && styles.choiceBtnSelected,
                    ]}
                    onPress={() => setYesNoAnswer('응, 그랬어')}>
                    <Text style={styles.choiceBtnText}>응, 그랬어</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.choiceBtn,
                      yesNoAnswer === '이번엔 아니었어' && styles.choiceBtnSelected,
                    ]}
                    onPress={() => setYesNoAnswer('이번엔 아니었어')}>
                    <Text style={styles.choiceBtnText}>이번엔 아니었어</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TextInput
                  style={styles.textInput}
                  placeholder={
                    currentQuiz.type === 'words3'
                      ? '예: 바삭함 고소함 따뜻함'
                      : '답변을 편하게 적어주세요'
                  }
                  value={textAnswer}
                  onChangeText={setTextAnswer}
                  multiline
                />
              )}

              {/* Optional meal photo */}
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
                    <Text style={styles.photoBtnText}>지금 찍기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto(false)}>
                    <Ionicons name="images" size={18} color="#1B7F66" />
                    <Text style={styles.photoBtnText}>갤러리</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep}>
                <Text style={styles.primaryBtnText}>다음 (먹은 양) →</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipBtnText}>{mealType}은 못 먹었어</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* Step 2: Portion Selection */
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.subtitle}>
                평소 1인분 기준 대비 얼마나 드셨나요?
              </Text>

              <View style={styles.portionGrid}>
                {[
                  { label: '1/3 이하 (아주 조금)', val: 0.33, emoji: '🥣' },
                  { label: '1/2 (가볍게)', val: 0.5, emoji: '🥗' },
                  { label: '2/3 (조금 적게)', val: 0.66, emoji: '🥪' },
                  { label: '1인분 (보통)', val: 1.0, emoji: '🍱' },
                  { label: '1.5인분 (넉넉히)', val: 1.5, emoji: '🍛' },
                  { label: '2인분 이상 (아주 많이)', val: 2.0, emoji: '🍕' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.val}
                    style={[styles.portionCard, saving && styles.portionCardBusy]}
                    disabled={saving}
                    onPress={() => handleSelectPortion(item.val)}>
                    <Text style={styles.portionEmoji}>{item.emoji}</Text>
                    <Text style={styles.portionLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {saving && <ActivityIndicator color="#1B7F66" style={styles.saving} />}

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setStep(1)}>
                <Text style={styles.secondaryBtnText}>← 질문 다시 보기</Text>
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
  photoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
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
    marginBottom: 12,
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
  portionCardBusy: {
    opacity: 0.5,
  },
  saving: {
    marginBottom: 8,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  mealTypeChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  mealTypeChipActive: {
    borderColor: '#1B7F66',
    backgroundColor: '#E3F6EF',
  },
  mealTypeText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '800',
  },
  mealTypeTextActive: {
    color: '#17765D',
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  quizBox: {
    backgroundColor: '#E3F6EF',
    borderLeftWidth: 4,
    borderLeftColor: '#1B7F66',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  quizQuestion: {
    fontSize: 16,
    color: '#17765D',
    lineHeight: 22,
    fontWeight: '800',
  },
  yesNoContainer: {
    gap: 10,
    marginBottom: 20,
  },
  choiceBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  choiceBtnSelected: {
    borderColor: '#1B7F66',
    backgroundColor: '#E3F6EF',
  },
  choiceBtnText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '800',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
    color: '#1E293B',
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#1B7F66',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '800',
  },
  skipBtn: {
    padding: 12,
    alignItems: 'center',
  },
  skipBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  portionGrid: {
    gap: 10,
    marginBottom: 16,
  },
  portionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  portionEmoji: {
    fontSize: 24,
    fontWeight: '600',
  },
  portionLabel: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '800',
  },
});
