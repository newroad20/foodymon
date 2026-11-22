import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { levelsData } from '@/constants/foodymonData';
import { buildPetChatOpening, replyToPetChat } from '@/lib/petChat';
import {
  deleteAllPetChatMessages,
  fetchPetChatMessages,
  fetchPetChatPreference,
  savePetChatMessages,
  setPetChatHistoryPreference,
} from '@/lib/gameApi';

interface PetChatModalProps {
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'pet' | 'user';
  text: string;
}

type StorageMode = 'loading' | 'undecided' | 'enabled' | 'disabled';
type Panel = 'chat' | 'settings';

export function PersistentPetChatModal({ onClose }: PetChatModalProps) {
  const { userId, state } = useFoodyMon();
  const opening = useMemo(
    () => buildPetChatOpening(state.masterName, state.records, new Date().getHours()),
    [state.masterName, state.records]
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [storageMode, setStorageMode] = useState<StorageMode>('loading');
  const [panel, setPanel] = useState<Panel>('chat');
  const [draft, setDraft] = useState('');
  const [suggestions, setSuggestions] = useState(opening.suggestions);
  const [notice, setNotice] = useState<string | null>(null);
  const nextId = useRef(1);
  const scrollRef = useRef<ScrollView>(null);
  const level = levelsData.find((item) => item.level === state.level) ?? levelsData[2];

  const localMessage = (role: Message['role'], text: string): Message => ({
    id: `local-${Date.now()}-${nextId.current++}`,
    role,
    text,
  });

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const preference = await fetchPetChatPreference(userId);
        if (cancelled) return;
        if (!preference) {
          setStorageMode('undecided');
          return;
        }

        if (!preference.historyEnabled) {
          setStorageMode('disabled');
          setMessages([localMessage('pet', opening.message)]);
          return;
        }

        const stored = await fetchPetChatMessages(userId);
        if (cancelled) return;
        const openingMessage = localMessage('pet', opening.message);
        setMessages([
          ...stored.map((message) => ({ id: message.id, role: message.role, text: message.content })),
          openingMessage,
        ]);
        setStorageMode('enabled');
        savePetChatMessages(userId, [{ role: 'pet', content: opening.message }]).catch(() =>
          setNotice('첫 인사를 저장하지 못했어요. 대화는 계속할 수 있어요.')
        );
      } catch {
        if (cancelled) return;
        setStorageMode('disabled');
        setMessages([localMessage('pet', opening.message)]);
        setNotice('대화 저장 기능에 연결하지 못해 이번 대화는 저장하지 않아요.');
      }
    };
    start();
    return () => {
      cancelled = true;
    };
  }, [userId, opening.message]);

  const chooseStorage = async (enabled: boolean) => {
    try {
      await setPetChatHistoryPreference(userId, enabled);
      setStorageMode(enabled ? 'enabled' : 'disabled');
      const first = localMessage('pet', opening.message);
      setMessages([first]);
      if (enabled) {
        await savePetChatMessages(userId, [{ role: 'pet', content: opening.message }]);
      }
    } catch {
      setStorageMode('disabled');
      setMessages([localMessage('pet', opening.message)]);
      setNotice('설정을 저장하지 못했어요. 이번 대화는 저장 없이 시작할게요.');
    }
  };

  const send = (value: string) => {
    const text = value.trim();
    if (!text) return;
    const answer = replyToPetChat(text, opening.focus);
    const userMessage = localMessage('user', text);
    const petMessage = localMessage('pet', answer);
    setMessages((current) => [...current, userMessage, petMessage]);
    setDraft('');
    setSuggestions(['조금 더 이야기할래', '오늘은 여기까지']);
    if (storageMode === 'enabled') {
      savePetChatMessages(userId, [
        { role: 'user', content: text },
        { role: 'pet', content: answer },
      ]).catch(() => setNotice('방금 대화를 저장하지 못했어요.'));
    }
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const toggleStorage = async () => {
    const next = storageMode !== 'enabled';
    try {
      await setPetChatHistoryPreference(userId, next);
      setStorageMode(next ? 'enabled' : 'disabled');
      setNotice(next ? '이제부터 대화를 30일 동안 자동 저장해요.' : '이제부터 새 대화를 저장하지 않아요.');
    } catch {
      setNotice('자동 저장 설정을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      '저장된 대화를 모두 삭제할까요?',
      '삭제한 대화는 복구할 수 없어요. 자동 저장 설정은 그대로 유지됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전체 삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllPetChatMessages(userId);
              setMessages([localMessage('pet', opening.message)]);
              setNotice('저장된 대화를 모두 삭제했어요.');
              setPanel('chat');
            } catch {
              setNotice('대화를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            {panel === 'settings' ? (
              <TouchableOpacity style={styles.headerBtn} onPress={() => setPanel('chat')} accessibilityLabel="대화로 돌아가기">
                <Ionicons name="arrow-back" size={21} color="#64748B" />
              </TouchableOpacity>
            ) : (
              <View style={styles.petBadge}>
                <Image source={level.image} style={styles.petImage} resizeMode="contain" />
                <View style={styles.onlineDot} />
              </View>
            )}
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{panel === 'settings' ? '대화 저장 설정' : '푸디몬과 이야기'}</Text>
              <Text style={styles.status}>
                {panel === 'settings'
                  ? '내 대화를 직접 관리할 수 있어요'
                  : storageMode === 'enabled'
                    ? '최근 30일 대화를 이어서 보고 있어요'
                    : '오늘의 기록을 보고 말을 걸었어요'}
              </Text>
            </View>
            {panel === 'chat' && storageMode !== 'loading' && storageMode !== 'undecided' && (
              <TouchableOpacity style={styles.headerBtn} onPress={() => setPanel('settings')} accessibilityLabel="대화 저장 설정">
                <Ionicons name="shield-checkmark-outline" size={20} color="#64748B" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerBtn} onPress={onClose} accessibilityLabel="대화 닫기">
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {notice && (
            <TouchableOpacity style={styles.notice} onPress={() => setNotice(null)}>
              <Text style={styles.noticeText}>{notice}</Text>
              <Ionicons name="close" size={14} color="#64748B" />
            </TouchableOpacity>
          )}

          {storageMode === 'loading' ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color="#1B7F66" />
              <Text style={styles.centerText}>지난 대화를 불러오고 있어요…</Text>
            </View>
          ) : storageMode === 'undecided' ? (
            <View style={styles.consentPanel}>
              <View style={styles.consentIcon}>
                <Ionicons name="chatbubbles" size={32} color="#1B7F66" />
              </View>
              <Text style={styles.consentTitle}>다음에도 이야기를 이어갈까요?</Text>
              <Text style={styles.consentText}>
                동의하면 푸디몬과 나눈 대화를 계정에 30일 동안 자동 저장해요. 대화에는 건강이나 감정에 관한 내용이 포함될 수 있어요.
              </Text>
              <View style={styles.consentPoints}>
                <ConsentPoint icon="calendar-clear-outline" text="30일이 지나면 자동 삭제" />
                <ConsentPoint icon="trash-outline" text="언제든 전체 삭제 가능" />
                <ConsentPoint icon="cloud-offline-outline" text="외부 AI로 전송하지 않음" />
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => chooseStorage(true)}>
                <Text style={styles.primaryBtnText}>자동 저장하고 시작하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => chooseStorage(false)}>
                <Text style={styles.secondaryBtnText}>저장 없이 시작하기</Text>
              </TouchableOpacity>
            </View>
          ) : panel === 'settings' ? (
            <View style={styles.settingsPanel}>
              <View style={styles.settingCard}>
                <View style={styles.settingCopy}>
                  <Text style={styles.settingTitle}>대화 자동 저장</Text>
                  <Text style={styles.settingDescription}>
                    {storageMode === 'enabled' ? '최근 30일 대화를 계정에 저장하고 있어요.' : '새로운 대화를 저장하지 않아요.'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, storageMode === 'enabled' && styles.toggleOn]}
                  onPress={toggleStorage}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: storageMode === 'enabled' }}>
                  <View style={[styles.toggleKnob, storageMode === 'enabled' && styles.toggleKnobOn]} />
                </TouchableOpacity>
              </View>
              <View style={styles.infoCard}>
                <Ionicons name="lock-closed-outline" size={19} color="#64748B" />
                <Text style={styles.infoText}>저장된 대화는 본인 계정에서만 볼 수 있고 외부 AI에는 전송하지 않아요.</Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
                <Ionicons name="trash-outline" size={19} color="#DC2626" />
                <Text style={styles.deleteBtnText}>저장된 대화 전체 삭제</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.contextCard}>
                <Ionicons name="sparkles" size={15} color="#1B7F66" />
                <Text style={styles.contextText}>
                  오늘 나눈 것 · 수면 {state.records.sleep ? 1 : 0} · 식사 {state.records.meals.length} · 마음 {state.records.minds.length}
                </Text>
              </View>
              <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.dayDivider}>{storageMode === 'enabled' ? '최근 30일' : '오늘'}</Text>
                {messages.map((message) => (
                  <View key={message.id} style={[styles.messageRow, message.role === 'user' && styles.messageRowUser]}>
                    {message.role === 'pet' && <Image source={level.image} style={styles.messageAvatar} resizeMode="contain" />}
                    <View style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.petBubble]}>
                      <Text style={[styles.bubbleText, message.role === 'user' && styles.userBubbleText]}>{message.text}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions}>
                {suggestions.map((suggestion) => (
                  <TouchableOpacity key={suggestion} style={styles.suggestion} onPress={() => send(suggestion)}>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.inputRow}>
                <HintInput
                  style={styles.input}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="푸디몬에게 이야기하기"
                  placeholderTextColor="#64748B"
                  multiline
                  maxLength={300}
                  onSubmitEditing={() => send(draft)}
                />
                <TouchableOpacity style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]} onPress={() => send(draft)} disabled={!draft.trim()} accessibilityLabel="메시지 보내기">
                  <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.privacyNote}>
                {storageMode === 'enabled' ? '대화는 30일 보관 후 자동 삭제돼요.' : '이번 대화는 저장되지 않아요.'}
              </Text>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ConsentPoint({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.consentPoint}>
      <Ionicons name={icon} size={18} color="#64748B" />
      <Text style={styles.consentPointText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(24,40,33,0.5)', justifyContent: 'flex-end' },
  sheet: { height: '88%', backgroundColor: '#F2F8F4', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderCurve: 'continuous', paddingTop: 10, paddingHorizontal: 16, paddingBottom: 12 },
  handle: { width: 42, height: 5, borderRadius: 999, borderCurve: 'continuous', backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 11 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 },
  petBadge: { width: 50, height: 50, borderRadius: 20, borderCurve: 'continuous', backgroundColor: '#E3F6EF', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  petImage: { width: 54, height: 54 },
  onlineDot: { position: 'absolute', right: 4, bottom: 4, width: 9, height: 9, borderRadius: 999, borderCurve: 'continuous', backgroundColor: '#1B7F66', borderWidth: 2, borderColor: '#FFFFFF' },
  headerCopy: { flex: 1 },
  title: { color: '#1E293B', fontSize: 17, fontWeight: '900' },
  status: { color: '#64748B', fontSize: 12, fontWeight: '700', marginTop: 2 },
  headerBtn: { width: 38, height: 38, borderRadius: 999, borderCurve: 'continuous', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF0D7', borderRadius: 12, borderCurve: 'continuous', paddingHorizontal: 11, paddingVertical: 8, marginBottom: 8 },
  noticeText: { flex: 1, color: '#B45309', fontSize: 12, fontWeight: '700' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centerText: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  consentPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  consentIcon: { width: 76, height: 76, borderRadius: 28, borderCurve: 'continuous', backgroundColor: '#E3F6EF', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  consentTitle: { color: '#1E293B', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  consentText: { color: '#64748B', fontSize: 15, fontWeight: '600', lineHeight: 21, textAlign: 'center', marginBottom: 18 },
  consentPoints: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, borderCurve: 'continuous', padding: 14, gap: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 18 },
  consentPoint: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  consentPointText: { color: '#475569', fontSize: 13, fontWeight: '800' },
  primaryBtn: { width: '100%', borderRadius: 16, borderCurve: 'continuous', backgroundColor: '#1B7F66', paddingVertical: 15, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#125A48' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  secondaryBtn: { width: '100%', paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { color: '#64748B', fontSize: 13, fontWeight: '800' },
  settingsPanel: { flex: 1, paddingTop: 8, gap: 12 },
  settingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 20, borderCurve: 'continuous', padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  settingCopy: { flex: 1 },
  settingTitle: { color: '#1E293B', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  settingDescription: { color: '#64748B', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  toggle: { width: 48, height: 28, borderRadius: 999, borderCurve: 'continuous', backgroundColor: '#CBD5E1', padding: 3 },
  toggleOn: { backgroundColor: '#1B7F66' },
  toggleKnob: { width: 22, height: 22, borderRadius: 999, borderCurve: 'continuous', backgroundColor: '#FFFFFF' },
  toggleKnobOn: { alignSelf: 'flex-end' },
  infoCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#E3F6EF', borderRadius: 16, borderCurve: 'continuous', padding: 14 },
  infoText: { flex: 1, color: '#64748B', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, borderCurve: 'continuous', paddingVertical: 14, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  deleteBtnText: { color: '#DC2626', fontSize: 15, fontWeight: '900' },
  contextCard: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 16, borderCurve: 'continuous', paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#E3F6EF', borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 8 },
  contextText: { flex: 1, color: '#64748B', fontSize: 12, fontWeight: '800' },
  messages: { flex: 1 },
  messagesContent: { paddingTop: 4, paddingBottom: 18 },
  dayDivider: { alignSelf: 'center', color: '#64748B', fontSize: 12, fontWeight: '800', paddingVertical: 8 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 11, paddingRight: 44 },
  messageRowUser: { justifyContent: 'flex-end', paddingRight: 0, paddingLeft: 44 },
  messageAvatar: { width: 30, height: 30, borderRadius: 12, borderCurve: 'continuous', marginRight: 7 },
  bubble: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 20, borderCurve: 'continuous', maxWidth: '90%' },
  petBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 8, borderCurve: 'continuous', borderWidth: 1, borderColor: '#E2E8F0' },
  userBubble: { backgroundColor: '#1B7F66', borderBottomRightRadius: 8, borderCurve: 'continuous' },
  bubbleText: { color: '#334155', fontSize: 15, fontWeight: '700', lineHeight: 20 },
  userBubbleText: { color: '#FFFFFF' },
  suggestions: { gap: 7, paddingVertical: 8 },
  suggestion: { borderRadius: 16, borderCurve: 'continuous', paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' },
  suggestionText: { color: '#1B7F66', fontSize: 12, fontWeight: '800' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 20, borderCurve: 'continuous', borderWidth: 1, borderColor: '#E2E8F0', paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
  input: { flex: 1, minHeight: 36, maxHeight: 88, color: '#1E293B', fontSize: 15, fontWeight: '600', paddingVertical: 8 },
  sendBtn: { width: 38, height: 38, borderRadius: 999, borderCurve: 'continuous', backgroundColor: '#1B7F66', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
  privacyNote: { color: '#64748B', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 7 },
});
