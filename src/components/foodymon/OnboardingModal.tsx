import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  mealTargetOptions,
  prologuePages,
  sleepTargetOptions,
  tutorialPages,
} from '@/constants/foodymonData';
import { enableReminders } from '@/lib/reminders';
import { HATCH_TAPS, HatchEgg } from './HatchEgg';
import { bumpFeel } from '@/lib/haptics';

// Step order: prologue story → name → sleep → meals → usual portion → tutorial pages → egg hatch.
// FoodyMon speaks from inside the egg until it hatches at the end.
const NAME = prologuePages.length;
const SLEEP = NAME + 1;
const MEALS = NAME + 2;
const SIZE = NAME + 3;
const TUTORIAL = NAME + 4;
const LAST = TUTORIAL + tutorialPages.length - 1;
const HATCH = LAST + 1;

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
  const [taps, setTaps] = useState(0);
  const hatched = taps >= HATCH_TAPS;

  const handleNext = () => {
    if (step === NAME && name.trim().length === 0) {
      Alert.alert('알림', '이름을 한 글자 이상 적어 주세요.');
      return;
    }
    setStep(step + 1);
  };

  const finish = () => {
    completeOnboarding(name.trim(), targetSleep, targetMeals, mealSize);
    // Ask for notification permission once the story is over; it can be turned off on My Page.
    enableReminders().catch(() => {});
  };

  const tapEgg = () => {
    bumpFeel();
    setTaps((t) => Math.min(t + 1, HATCH_TAPS));
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        {/* FoodyMon's egg; hatches at the end */}
        <View style={styles.petContainer}>
          <HatchEgg taps={taps} hatched={hatched} onTap={step === HATCH ? tapEgg : undefined} />
        </View>

        {/* Story Card */}
        <View style={styles.card}>
          {step > 0 && !hatched && (
            <TouchableOpacity onPress={handlePrev} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← 이전</Text>
            </TouchableOpacity>
          )}

          {step < NAME && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>{prologuePages[step].title}</Text>
              <Text style={styles.dialogueText}>{prologuePages[step].line}</Text>
              <Dots count={prologuePages.length} active={step} />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>{step === NAME - 1 ? '함께하기' : '계속 듣기'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === NAME && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>너의 이름은?</Text>
              <Text style={styles.dialogueText}>
                "고마워! 내가 너를 뭐라고 부르면 될까?"
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

          {step === SLEEP && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>개운한 잠</Text>
              <Text style={styles.dialogueText}>
                "{name} 마스터, 반가워!{'\n'}보통 몇 시간 자면 개운해?"
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

          {step === MEALS && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>편안한 끼니</Text>
              <Text style={styles.dialogueText}>
                "하루에 몇 번 먹는 게 편해?"
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

          {step === SIZE && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>평소의 양</Text>
              <Text style={styles.dialogueText}>
                "평소에 먹는 양은 어느 정도야?{'\n'}너의 평소와만 비교하고, 다른 사람과는 비교하지 않아."
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
                <Text style={styles.primaryBtnText}>다음 →</Text>
              </TouchableOpacity>
            </View>
          )}

          {step >= TUTORIAL && (
            <View style={styles.stepContent}>
              <View style={[styles.tutorialIcon, { backgroundColor: tutorialPages[step - TUTORIAL].color }]}>
                <Ionicons name={tutorialPages[step - TUTORIAL].icon} size={34} color="#FFFFFF" />
              </View>
              <Text style={styles.storyTitle}>{tutorialPages[step - TUTORIAL].title}</Text>
              <Text style={styles.dialogueText}>{tutorialPages[step - TUTORIAL].line}</Text>
              <Dots count={tutorialPages.length} active={step - TUTORIAL} />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>{step === LAST ? '알 깨우기' : '다음 →'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === HATCH && !hatched && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>알이 움직여!</Text>
              <Text style={styles.dialogueText}>
                "똑똑… 나 곧 나갈 것 같아!{'\n'}알을 톡톡 두드려서 깨워 줘."
              </Text>
              <Dots count={HATCH_TAPS} active={taps} />
              <TouchableOpacity style={styles.primaryBtn} onPress={tapEgg}>
                <Text style={styles.primaryBtnText}>톡! 두드리기</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === HATCH && hatched && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>푸디몬이 태어났어요!</Text>
              <Text style={styles.dialogueText}>
                "반가워, {name.trim()}! 드디어 만났다.{'\n'}오늘부터 잘 부탁해."
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={finish}>
                <Text style={styles.primaryBtnText}>숲 생활 시작하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5E5',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#1B7F66',
  },
  tutorialIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
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
