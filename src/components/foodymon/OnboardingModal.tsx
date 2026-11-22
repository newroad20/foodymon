import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { HintInput } from '@/components/HintInput';
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
import { isContact, mayBeUnder14, parseBirthYear } from '@/lib/age';
import { bumpFeel } from '@/lib/haptics';
import { WorldBackdrop } from './WorldBackdrop';

// Step order: prologue story → name → birth year → (guardian consent if under 14) → sleep → meals → usual portion → tutorial pages → egg hatch.
// FoodyMon speaks from inside the egg until it hatches at the end.
const NAME = prologuePages.length;
const BIRTH = NAME + 1;
const GUARDIAN = NAME + 2;
const SLEEP = NAME + 3;
const MEALS = NAME + 4;
const SIZE = NAME + 5;
const TUTORIAL = NAME + 6;
const LAST = TUTORIAL + tutorialPages.length - 1;
const HATCH = LAST + 1;

interface OnboardingModalProps {
  visible: boolean;
}

export function OnboardingModal({ visible }: OnboardingModalProps) {
  const { completeOnboarding } = useFoodyMon();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [birthText, setBirthText] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianContact, setGuardianContact] = useState('');
  const [guardianAgree, setGuardianAgree] = useState(false);
  const birthYear = parseBirthYear(birthText);
  const needsGuardian = birthYear !== null && mayBeUnder14(birthYear);
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
    if (step === BIRTH && birthYear === null) {
      Alert.alert('알림', '태어난 연도를 네 자리로 적어 줘. (예: 2012)');
      return;
    }
    if (step === GUARDIAN && (!guardianName.trim() || !isContact(guardianContact) || !guardianAgree)) {
      Alert.alert('보호자 동의', '보호자 이름과 연락처(전화번호 또는 이메일)를 적고, 보호자가 동의 체크를 해 주세요.');
      return;
    }
    // The guardian step only exists for users who may be under 14.
    setStep(step === BIRTH && !needsGuardian ? SLEEP : step + 1);
  };

  const finish = () => {
    completeOnboarding(
      name.trim(),
      birthYear!,
      targetSleep,
      targetMeals,
      mealSize,
      needsGuardian ? { name: guardianName.trim(), contact: guardianContact.trim() } : undefined
    );
    // Ask for notification permission once the story is over; it can be turned off on My Page.
    enableReminders().catch(() => {});
  };

  const tapEgg = () => {
    bumpFeel();
    setTaps((t) => Math.min(t + 1, HATCH_TAPS));
  };

  const handlePrev = () => {
    if (step > 0) setStep(step === SLEEP && !needsGuardian ? BIRTH : step - 1);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <WorldBackdrop />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <View style={styles.storyBadge}>
            <Ionicons name="leaf" size={14} color="#3B8169" />
            <Text style={styles.storyBadgeText}>푸디몬과 첫 만남 · {Math.min(step + 1, HATCH + 1)}/{HATCH + 1}</Text>
          </View>
          <View style={styles.petStage}>
            <View style={styles.petHalo} />
            <View style={styles.petContainer}>
              <HatchEgg taps={taps} hatched={hatched} onTap={step === HATCH ? tapEgg : undefined} />
            </View>
          </View>

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
              <HintInput
                style={styles.input}
                placeholder="마스터의 닉네임 입력 (예: 김푸디)"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>다음 →</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === BIRTH && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>언제 태어났어?</Text>
              <Text style={styles.dialogueText}>
                "{name} 마스터, 반가워!{'\n'}몇 년에 태어났는지 알려 줄래?{'\n'}나이에 맞는 잠 시간을 알려 주려고 물어보는 거야."
              </Text>
              <HintInput
                style={styles.input}
                placeholder="태어난 연도 (예: 2012)"
                placeholderTextColor="#94A3B8"
                value={birthText}
                onChangeText={setBirthText}
                keyboardType="number-pad"
                maxLength={4}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>다음 →</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === GUARDIAN && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>보호자 동의</Text>
              <Text style={styles.dialogueText}>
                "만 14세 미만 친구는 보호자의 동의가 있어야 함께할 수 있어.{'\n'}부모님이나 보호자에게 이 화면을 보여 줄래?"
              </Text>
              <HintInput
                style={styles.input}
                placeholder="보호자 이름"
                placeholderTextColor="#94A3B8"
                value={guardianName}
                onChangeText={setGuardianName}
                maxLength={50}
              />
              <HintInput
                style={styles.input}
                placeholder="보호자 연락처 (전화번호 또는 이메일)"
                placeholderTextColor="#94A3B8"
                value={guardianContact}
                onChangeText={setGuardianContact}
                autoCapitalize="none"
                maxLength={100}
              />
              <TouchableOpacity
                style={styles.guardianAgree}
                onPress={() => setGuardianAgree(!guardianAgree)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: guardianAgree }}>
                <Ionicons
                  name={guardianAgree ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={guardianAgree ? '#1B7F66' : '#94A3B8'}
                />
                <Text style={styles.guardianAgreeText}>
                  저는 보호자이며, 아이의 개인정보와 수면·식사·마음 기록(민감정보) 처리에 동의합니다.
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>다음 →</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === SLEEP && (
            <View style={styles.stepContent}>
              <Text style={styles.storyTitle}>요즘의 잠</Text>
              <Text style={styles.dialogueText}>
                "요즘 보통 몇 시간쯤 자?{'\n'}목표가 아니라 지금 생활을 알고 싶은 거라 정답은 없어."
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
              <Text style={styles.storyTitle}>요즘의 끼니</Text>
              <Text style={styles.dialogueText}>
                "요즘 하루에 보통 몇 번 먹어?{'\n'}간식도 한 번으로 세도 돼."
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

          {step >= TUTORIAL && step <= LAST && (
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
        </ScrollView>
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
  guardianAgree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  guardianAgreeText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
    lineHeight: 19,
  },
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
    backgroundColor: '#F2FAF6',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  storyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: '#D6E9E0',
    marginBottom: 6,
  },
  storyBadgeText: {
    color: '#547366',
    fontSize: 11,
    fontWeight: '800',
  },
  petStage: {
    width: 210,
    height: 205,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  petHalo: {
    position: 'absolute',
    width: 175,
    height: 175,
    borderRadius: 88,
    backgroundColor: 'rgba(217, 242, 231, 0.92)',
    borderWidth: 1,
    borderColor: '#C4E6D8',
  },
  petContainer: {
    alignItems: 'center',
    zIndex: 1,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 28,
    padding: 22,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D8E8E0',
    shadowColor: '#426454',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 6,
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  backBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '800',
  },
  stepContent: {
    alignItems: 'center',
    width: '100%',
  },
  storyTitle: {
    fontSize: 21,
    color: '#206C57',
    marginBottom: 12,
    fontWeight: '900',
  },
  dialogueText: {
    fontSize: 15,
    color: '#40564C',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontWeight: '700',
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#D4E5DD',
    borderRadius: 17,
    padding: 14,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#243B31',
    backgroundColor: '#F8FCFA',
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
    backgroundColor: '#207C63',
    padding: 16,
    borderRadius: 17,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#145743',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
