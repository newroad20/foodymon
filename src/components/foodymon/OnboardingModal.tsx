import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { mealTargetOptions, sleepTargetOptions } from '@/constants/foodymonData';

interface OnboardingModalProps {
  visible: boolean;
}

export function OnboardingModal({ visible }: OnboardingModalProps) {
  const { completeOnboarding } = useFoodyMon();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [targetSleep, setTargetSleep] = useState(7);
  const [targetMeals, setTargetMeals] = useState(3);
  const [mealSize, setMealSize] = useState(1.0);

  const handleNext = () => {
    if (step === 3 && name.trim().length === 0) {
      Alert.alert('알림', '이름을 한 글자 이상 적어주세요! 🥺');
      return;
    }
    if (step === 6) {
      completeOnboarding(name.trim(), targetSleep, targetMeals, mealSize);
      return;
    }
    setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        {/* Cute Mascot Header Image */}
        <View style={styles.petContainer}>
          <Image
            source={require('@/assets/images/level3.png')}
            style={styles.petImage}
            resizeMode="contain"
          />
        </View>

        {/* Story Card */}
        <View style={styles.card}>
          {step > 0 && step < 6 && (
            <TouchableOpacity onPress={handlePrev} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← 이전</Text>
            </TouchableOpacity>
          )}

          {step === 0 && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>푸디몬과의 첫 만남 🌱</Text>
              <Text style={styles.dialogueText}>
                "안녕! 나는 사람의 감각과 감정을 먹고 자라는 푸디몬이야."
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>터치해서 계속하기 ✨</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>함께하는 일상 💖</Text>
              <Text style={styles.dialogueText}>
                "네가 잘 자고 편안하게 먹으면 나는 튼튼해지지만,{'\n'}
                불안이 쌓이거나 몸의 신호를 무시하면 시들어버려..."
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>다음 이야기 듣기 💬</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>마스터가 되어줄래? 🤝</Text>
              <Text style={styles.dialogueText}>
                "나의 마스터가 되어 나와 함께 건강한 매일을 만들어갈래?"
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>입양하기! 🥰</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>마스터의 이름은? 🏷️</Text>
              <Text style={styles.dialogueText}>
                "고마워! 먼저, 내가 마스터를 뭐라고 부르면 될까?"
              </Text>
              <TextInput
                style={styles.input}
                placeholder="마스터의 닉네임 입력 (예: 새길)"
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>다음 →</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>목표 수면 시간 🌙</Text>
              <Text style={styles.dialogueText}>
                "{name} 마스터, 반가워!{'\n'}평소 목표 수면 시간은 어느 정도야?"
              </Text>
              <View style={styles.optionsRow}>
                {sleepTargetOptions.map((hrs) => (
                  <TouchableOpacity
                    key={hrs}
                    style={[
                      styles.optionChip,
                      targetSleep === hrs && styles.optionChipActive,
                    ]}
                    onPress={() => setTargetSleep(hrs)}>
                    <Text
                      style={[
                        styles.optionChipText,
                        targetSleep === hrs && styles.optionChipTextActive,
                      ]}>
                      {hrs}시간
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>다음 →</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 5 && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>목표 식사 끼니 🍱</Text>
              <Text style={styles.dialogueText}>
                "하루 목표 식사 횟수는 몇 끼야?"
              </Text>
              <View style={styles.optionsRow}>
                {mealTargetOptions.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.optionChip,
                      targetMeals === m && styles.optionChipActive,
                    ]}
                    onPress={() => setTargetMeals(m)}>
                    <Text
                      style={[
                        styles.optionChipText,
                        targetMeals === m && styles.optionChipTextActive,
                      ]}>
                      {m}끼
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>다음 →</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 6 && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>평소 식사량 기준 🥣</Text>
              <Text style={styles.dialogueText}>
                "일반적인 1인분 기준으로 평소에 얼만큼 먹어? (기준점 설정)"
              </Text>
              <View style={styles.optionsCol}>
                {[
                  { label: '1/3 이하 (소식)', val: 0.33 },
                  { label: '1/2 (가볍게)', val: 0.5 },
                  { label: '2/3 (보통 이하)', val: 0.66 },
                  { label: '1인분 (기본 정량)', val: 1.0 },
                  { label: '1.5인분 이상 (푸짐하게)', val: 1.5 },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.val}
                    style={[
                      styles.optionRow,
                      mealSize === item.val && styles.optionRowActive,
                    ]}
                    onPress={() => setMealSize(item.val)}>
                    <Text
                      style={[
                        styles.optionRowText,
                        mealSize === item.val && styles.optionRowTextActive,
                      ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>푸디몬과 함께 시작하기! 🚀</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  petContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  petImage: {
    width: 180,
    height: 180,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  backBtnText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '800',
  },
  stepContent: {
    alignItems: 'center',
    width: '100%',
  },
  storyTitle: {
    fontSize: 18,
    color: '#1B7F66',
    marginBottom: 12,
    fontWeight: '900',
  },
  dialogueText: {
    fontSize: 15,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontWeight: '700',
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#1E293B',
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  optionChipActive: {
    borderColor: '#1B7F66',
    backgroundColor: '#E3F6EF',
  },
  optionChipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '800',
  },
  optionChipTextActive: {
    color: '#17765D',
  },
  optionsCol: {
    width: '100%',
    gap: 8,
    marginBottom: 24,
  },
  optionRow: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  optionRowActive: {
    borderColor: '#1B7F66',
    backgroundColor: '#E3F6EF',
  },
  optionRowText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '800',
  },
  optionRowTextActive: {
    color: '#17765D',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#1B7F66',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
