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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
                <Ionicons name="arrow-back" size={21} color="#61756B" />
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
                <Ionicons name="shield-checkmark-outline" size={20} color="#4F806B" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerBtn} onPress={onClose} accessibilityLabel="대화 닫기">
              <Ionicons name="close" size={22} color="#61756B" />
            </TouchableOpacity>
          </View>

          {notice && (
            <TouchableOpacity style={styles.notice} onPress={() => setNotice(null)}>
              <Text style={styles.noticeText}>{notice}</Text>
              <Ionicons name="close" size={14} color="#657B70" />
            </TouchableOpacity>
          )}

          {storageMode === 'loading' ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color="#277B62" />
              <Text style={styles.centerText}>지난 대화를 불러오고 있어요…</Text>
            </View>
          ) : storageMode === 'undecided' ? (
            <View style={styles.consentPanel}>
              <View style={styles.consentIcon}>
                <Ionicons name="chatbubbles" size={32} color="#277B62" />
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
                <Ionicons name="lock-closed-outline" size={19} color="#4F806B" />
                <Text style={styles.infoText}>저장된 대화는 본인 계정에서만 볼 수 있고 외부 AI에는 전송하지 않아요.</Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
                <Ionicons name="trash-outline" size={19} color="#B64646" />
                <Text style={styles.deleteBtnText}>저장된 대화 전체 삭제</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.contextCard}>
                <Ionicons name="sparkles" size={15} color="#4F8D75" />
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
                <TextInput
                  style={styles.input}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="푸디몬에게 이야기하기"
                  placeholderTextColor="#96A49D"
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
      <Ionicons name={icon} size={18} color="#4F806B" />
      <Text style={styles.consentPointText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(24,40,33,0.5)', justifyContent: 'flex-end' },
  sheet: { height: '88%', backgroundColor: '#F5FAF7', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, paddingHorizontal: 16, paddingBottom: 12 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#D2E0D9', alignSelf: 'center', marginBottom: 11 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 },
  petBadge: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#DFF2E9', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  petImage: { width: 54, height: 54 },
  onlineDot: { position: 'absolute', right: 4, bottom: 4, width: 9, height: 9, borderRadius: 5, backgroundColor: '#3E9D78', borderWidth: 2, borderColor: '#FFFFFF' },
  headerCopy: { flex: 1 },
  title: { color: '#263A31', fontSize: 18, fontWeight: '900' },
  status: { color: '#74877E', fontSize: 11, fontWeight: '700', marginTop: 2 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE8E2', alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF4D9', borderRadius: 13, paddingHorizontal: 11, paddingVertical: 8, marginBottom: 8 },
  noticeText: { flex: 1, color: '#79612E', fontSize: 11, fontWeight: '700' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centerText: { color: '#74877E', fontSize: 13, fontWeight: '700' },
  consentPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  consentIcon: { width: 76, height: 76, borderRadius: 26, backgroundColor: '#DFF2E9', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  consentTitle: { color: '#263A31', fontSize: 21, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  consentText: { color: '#60746A', fontSize: 14, fontWeight: '600', lineHeight: 21, textAlign: 'center', marginBottom: 18 },
  consentPoints: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, gap: 12, borderWidth: 1, borderColor: '#DCE8E2', marginBottom: 18 },
  consentPoint: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  consentPointText: { color: '#475E53', fontSize: 13, fontWeight: '800' },
  primaryBtn: { width: '100%', borderRadius: 17, backgroundColor: '#277B62', paddingVertical: 15, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#185842' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  secondaryBtn: { width: '100%', paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { color: '#64776D', fontSize: 13, fontWeight: '800' },
  settingsPanel: { flex: 1, paddingTop: 8, gap: 12 },
  settingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 19, padding: 16, borderWidth: 1, borderColor: '#DCE8E2' },
  settingCopy: { flex: 1 },
  settingTitle: { color: '#2C4036', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  settingDescription: { color: '#71847A', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#CAD7D1', padding: 3 },
  toggleOn: { backgroundColor: '#277B62' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  toggleKnobOn: { alignSelf: 'flex-end' },
  infoCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#E6F4ED', borderRadius: 17, padding: 14 },
  infoText: { flex: 1, color: '#587366', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 17, paddingVertical: 14, backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#F1CCCC' },
  deleteBtnText: { color: '#B64646', fontSize: 14, fontWeight: '900' },
  contextCard: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#E5F3EC', borderWidth: 1, borderColor: '#CEE5DA', marginBottom: 8 },
  contextText: { flex: 1, color: '#537164', fontSize: 11, fontWeight: '800' },
  messages: { flex: 1 },
  messagesContent: { paddingTop: 4, paddingBottom: 18 },
  dayDivider: { alignSelf: 'center', color: '#93A29A', fontSize: 10, fontWeight: '800', paddingVertical: 8 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 11, paddingRight: 44 },
  messageRowUser: { justifyContent: 'flex-end', paddingRight: 0, paddingLeft: 44 },
  messageAvatar: { width: 30, height: 30, borderRadius: 10, marginRight: 7 },
  bubble: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, maxWidth: '90%' },
  petBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 6, borderWidth: 1, borderColor: '#DFE9E4' },
  userBubble: { backgroundColor: '#277B62', borderBottomRightRadius: 6 },
  bubbleText: { color: '#344A40', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  userBubbleText: { color: '#FFFFFF' },
  suggestions: { gap: 7, paddingVertical: 8 },
  suggestion: { borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BFDCCF' },
  suggestionText: { color: '#36735D', fontSize: 12, fontWeight: '800' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#D9E7E0', paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
  input: { flex: 1, minHeight: 36, maxHeight: 88, color: '#2C4036', fontSize: 14, fontWeight: '600', paddingVertical: 8 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#277B62', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#B7C9C0' },
  privacyNote: { color: '#8A9A92', fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 7 },
});
