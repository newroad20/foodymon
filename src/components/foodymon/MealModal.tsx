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
} from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { quizzesData } from '@/constants/foodymonData';

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

  // Pick new random quiz when opening
  React.useEffect(() => {
    if (visible) {
      setStep(1);
      setTextAnswer('');
      setYesNoAnswer(null);
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

  const handleSelectPortion = async (portion: number) => {
    const finalAnswer =
      currentQuiz.type === 'yesno' ? (yesNoAnswer || '') : textAnswer.trim();
    await logMeal(portion, finalAnswer);
    Alert.alert('감각 나누기', '알아차린 걸 나눠 줘서 고마워! 푸디몬이 냠냠 먹었어.');
    onClose();
  };

  const handleSkip = () => {
    Alert.alert(
      '이번 끼니',
      '못 먹은 것도 소중한 기록이야. 이번 끼니는 못 먹은 걸로 남겨 둘까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '남기기',
          style: 'destructive',
          onPress: async () => {
            await skipMeal();
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

              <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep}>
                <Text style={styles.primaryBtnText}>다음 (먹은 양) →</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipBtnText}>이번 끼니는 못 먹었어</Text>
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
                    style={styles.portionCard}
                    onPress={() => handleSelectPortion(item.val)}>
                    <Text style={styles.portionEmoji}>{item.emoji}</Text>
                    <Text style={styles.portionLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

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
