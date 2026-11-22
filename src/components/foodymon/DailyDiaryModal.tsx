import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { HintInput } from '@/components/HintInput';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { mindEmotions } from '@/constants/foodymonData';
import { fetchDailyReflections, saveDailyReflection, type DailyReflection } from '@/lib/gameApi';
import { toDateKey } from '@/lib/dayRollover';
import { MEAL_SLOTS, sleepMinutes } from '@/lib/growth';

interface DailyDiaryModalProps {
  onClose: () => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const dateLabel = (key: string) =>
  new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(
    new Date(`${key}T12:00:00`)
  );

const PROMPTS = ['오늘 가장 마음에 남은 일', '식사와 수면에서 느낀 점', '내일 바꾸고 싶은 한 가지'];

/** A private, auto-saved daily journal grounded in today's check-ins. */
export function DailyDiaryModal({ onClose }: DailyDiaryModalProps) {
  const { userId, state } = useFoodyMon();
  const todayKey = toDateKey(new Date());
  const [draft, setDraft] = useState('');
  const [entries, setEntries] = useState<DailyReflection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const savedText = useRef('');

  useEffect(() => {
    let active = true;
    fetchDailyReflections(userId)
      .then((data) => {
        if (!active) return;
        const today = data.find((entry) => entry.logDate === todayKey)?.text ?? '';
        savedText.current = today;
        setDraft(today);
        setEntries(data);
        setLoaded(true);
        setSaveState('saved');
      })
      .catch(() => {
        if (!active) return;
        setLoaded(true);
        setSaveState('error');
      });
    return () => {
      active = false;
    };
  }, [todayKey, userId]);

  useEffect(() => {
    if (!loaded || draft === savedText.current) return;
    setSaveState('saving');
    const timer = setTimeout(() => {
      saveDailyReflection(userId, todayKey, draft.trimEnd())
        .then(() => {
          savedText.current = draft.trimEnd();
          setEntries((current) => [
            { logDate: todayKey, text: draft.trimEnd(), updatedAt: new Date().toISOString() },
            ...current.filter((entry) => entry.logDate !== todayKey),
          ]);
          setSaveState('saved');
        })
        .catch(() => setSaveState('error'));
    }, 700);
    return () => clearTimeout(timer);
  }, [draft, loaded, todayKey, userId]);

  const summary = useMemo(() => {
    const sleep = state.records.sleep;
    const sleepCopy = sleep
      ? `${sleep.bedTime}~${sleep.wakeTime} · ${Math.round((sleepMinutes(sleep) / 60) * 10) / 10}시간`
      : '아직 수면 기록이 없어요';
    const meals = state.records.meals.length
      ? state.records.meals.map((meal) => MEAL_SLOTS[meal.slot]).join(' · ')
      : '아직 식사 기록이 없어요';
    const lastMind = state.records.minds[state.records.minds.length - 1];
    const mind = lastMind
      ? mindEmotions.find((emotion) => emotion.id === lastMind.emotion)?.label ?? '마음을 기록했어요'
      : '아직 마음 기록이 없어요';
    return { sleepCopy, meals, mind };
  }, [state.records]);

  const addPrompt = (prompt: string) => {
    const spacer = draft.trim() ? '\n\n' : '';
    setDraft(`${draft.trimEnd()}${spacer}• ${prompt}\n`);
  };

  const handleClose = async () => {
    const text = draft.trimEnd();
    if (loaded && text !== savedText.current) {
      try {
        await saveDailyReflection(userId, todayKey, text);
        savedText.current = text;
      } catch {
        setSaveState('error');
        return;
      }
    }
    onClose();
  };

  const recent = entries.filter((entry) => entry.logDate !== todayKey && entry.text.trim()).slice(0, 5);
  const statusCopy = saveState === 'saving' ? '저장 중…' : saveState === 'error' ? '저장하지 못했어요' : '자동 저장됨';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerIcon}><Ionicons name="book" size={22} color="#277B62" /></View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>오늘의 일기장</Text>
              <Text style={styles.subtitle}>{dateLabel(todayKey)} · 내 하루를 평가 없이 정리해요</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} accessibilityLabel="일기장 닫기" hitSlop={8}>
              <Ionicons name="close" size={22} color="#61756B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.summaryCard}>
              <SummaryRow icon="moon-outline" label="수면" value={summary.sleepCopy} />
              <SummaryRow icon="restaurant-outline" label="식사" value={summary.meals} />
              <SummaryRow icon="heart-outline" label="마음" value={summary.mind} />
            </View>

            <Text style={styles.sectionTitle}>푸디몬이 건네는 기록 질문</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prompts}>
              {PROMPTS.map((prompt) => (
                <TouchableOpacity key={prompt} style={styles.prompt} onPress={() => addPrompt(prompt)}>
                  <Text style={styles.promptText}>+ {prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.editorCard}>
              <HintInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="오늘 먹고, 자고, 느끼면서 어떤 생각이 들었어? 잘한 점보다 기억하고 싶은 마음을 편하게 적어 줘."
                placeholderTextColor="#98A69F"
                multiline
                maxLength={2000}
                textAlignVertical="top"
              />
              <View style={styles.saveRow}>
                <Ionicons name={saveState === 'error' ? 'cloud-offline-outline' : 'cloud-done-outline'} size={14} color={saveState === 'error' ? '#B45309' : '#6F8278'} />
                <Text style={[styles.saveText, saveState === 'error' && styles.saveTextError]}>{statusCopy}</Text>
                <Text style={styles.countText}>{draft.length}/2000</Text>
              </View>
            </View>

            {recent.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.sectionTitle}>지난 일기</Text>
                {recent.map((entry) => (
                  <View key={entry.logDate} style={styles.recentCard}>
                    <Text style={styles.recentDate}>{dateLabel(entry.logDate)}</Text>
                    <Text style={styles.recentText} numberOfLines={3}>{entry.text}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.privacy}>일기는 내 계정에만 저장되며 외부 AI로 전송되지 않아요.</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SummaryRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={17} color="#4F806B" />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(24,40,33,0.5)', justifyContent: 'flex-end' },
  sheet: { height: '92%', backgroundColor: '#F5FAF7', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, paddingHorizontal: 16 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#D2E0D9', alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  headerIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#DFF2E9', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { color: '#263A31', fontSize: 19, fontWeight: '900' },
  subtitle: { color: '#74877E', fontSize: 11, fontWeight: '700', marginTop: 2 },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE8E2', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { paddingBottom: 32, gap: 12 },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#DCE8E2', padding: 14, gap: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  summaryLabel: { width: 32, color: '#4F806B', fontSize: 12, fontWeight: '900' },
  summaryValue: { flex: 1, color: '#43584E', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  sectionTitle: { color: '#354A40', fontSize: 14, fontWeight: '900' },
  prompts: { gap: 7, paddingBottom: 2 },
  prompt: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#E5F3EC', borderWidth: 1, borderColor: '#CEE5DA' },
  promptText: { color: '#36735D', fontSize: 12, fontWeight: '800' },
  editorCard: { backgroundColor: '#FFFFFF', borderRadius: 19, borderWidth: 1, borderColor: '#DCE8E2', overflow: 'hidden' },
  input: { minHeight: 210, color: '#2C4036', fontSize: 15, fontWeight: '600', lineHeight: 23, padding: 16 },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, borderTopWidth: 1, borderTopColor: '#EDF3F0', paddingHorizontal: 14, paddingVertical: 9 },
  saveText: { color: '#6F8278', fontSize: 11, fontWeight: '700' },
  saveTextError: { color: '#B45309' },
  countText: { marginLeft: 'auto', color: '#93A29A', fontSize: 10, fontWeight: '700' },
  recentSection: { gap: 8 },
  recentCard: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 13, borderWidth: 1, borderColor: '#E0EAE5' },
  recentDate: { color: '#4F806B', fontSize: 11, fontWeight: '900', marginBottom: 5 },
  recentText: { color: '#53675D', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  privacy: { color: '#8A9A92', fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2 },
});
